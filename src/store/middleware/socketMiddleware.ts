import type { Middleware } from "@reduxjs/toolkit";
import type { UnknownAction } from "redux";
import { toast } from "sonner";
import { streamApi } from "../../services/streams";
import { eraseAuth, tokenReceived } from "../../feature/auth/authSlice";
import type { LoginResponse } from "../../types/auth.types";

interface PartialRootState {
  auth: {
    token: string | null;
  };
}

const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 20000;

const REFRESH_URL = `${(import.meta.env.VITE_API_URL as string).replace(/\/$/, "")}/auth/refresh`;

export const socketMiddleware: Middleware<object, PartialRootState> = (store) => {
  let socket: WebSocket | null = null;
  // The bearer the current socket was opened with. The server reads it from
  // Sec-WebSocket-Protocol once, during the handshake, so a token change only
  // takes effect after we open a new socket.
  let socketToken: string | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  // Set once the current attempt completed the handshake. A close without it
  // means the upgrade was refused — in practice an expired bearer.
  let openedThisAttempt = false;
  let refreshPromise: Promise<boolean> | null = null;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (!store.getState().auth.token) {
      reconnectAttempt = 0;
      clearReconnectTimer();
      return;
    }
    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
      RECONNECT_MAX_DELAY_MS,
    );
    reconnectAttempt += 1;
    clearReconnectTimer();
    reconnectTimer = setTimeout(() => connect(), delay);
  };

  // A failed WS handshake has no response body to read: on 401 the browser
  // just fires onclose. Refresh the bearer through the httpOnly cookie so the
  // retry uses a fresh token instead of looping forever on the stale one.
  const refreshToken = (): Promise<boolean> => {
    if (!refreshPromise) {
      refreshPromise = fetch(REFRESH_URL, {
        method: "POST",
        credentials: "include",
      })
        .then(async (res) => {
          if (!res.ok) return false;
          const data = (await res.json()) as LoginResponse;
          store.dispatch(tokenReceived(data));
          return true;
        })
        .catch(() => false)
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  };

  const connect = () => {
    const token = store.getState().auth.token;
    if (!token || socket) return;

    socket = new WebSocket(import.meta.env.VITE_WS_URL, [token]);
    socketToken = token;
    openedThisAttempt = false;

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "STREAM_UPDATED") {
          store.dispatch(
            streamApi.util.invalidateTags([
              { type: "Stream", id: data.payload?.stream_id },
            ]),
          );
        }
        if (data.type === "STREAM_READY") {
          store.dispatch(
            streamApi.util.invalidateTags([{ type: "Stream", id: "LIST" }]),
          );
        }
        // The export worker finished out of band, so the cached status is the
        // only way the page learns about it. Both outcomes arrive: a silent
        // failure would strand the button on "Preparing".
        if (data.type === "STREAM_EXPORT_READY") {
          store.dispatch(
            streamApi.util.invalidateTags([
              { type: "StreamExport", id: data.payload?.stream_id },
            ]),
          );
          toast.success("Your MP4 is ready to download");
        }
        if (data.type === "STREAM_EXPORT_FAILED") {
          store.dispatch(
            streamApi.util.invalidateTags([
              { type: "StreamExport", id: data.payload?.stream_id },
            ]),
          );
          toast.error(data.payload?.error || "The export failed.");
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    socket.onopen = () => {
      openedThisAttempt = true;
      reconnectAttempt = 0;
    };

    socket.onclose = () => {
      socket = null;
      socketToken = null;
      // Авто-переподключение с экспоненциальной паузой, пока юзер в сессии.
      if (!store.getState().auth.token) {
        reconnectAttempt = 0;
        clearReconnectTimer();
        return;
      }
      if (openedThisAttempt) {
        scheduleReconnect();
        return;
      }
      // Never opened → the upgrade was refused. Try one cookie-based refresh
      // before reconnecting; if that fails too, the session is gone.
      void refreshToken().then((ok) => {
        if (ok) {
          reconnectAttempt = 0;
          scheduleReconnect();
        } else {
          store.dispatch(eraseAuth());
        }
      });
    };
  };

  return (next) => (action: unknown) => {
    const result = next(action);
    const type = (action as UnknownAction).type;

    if (type === "auth/eraseAuth") {
      reconnectAttempt = 0;
      clearReconnectTimer();
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
        socketToken = null;
      }
    } else if (type === "auth/tokenReceived") {
      // A fresh bearer arrived (login, or a REST reauth after a 401): reopen so
      // the handshake picks it up instead of reusing the stale subprotocol.
      if (socket && store.getState().auth.token !== socketToken) {
        socket.onclose = null;
        socket.close();
        socket = null;
        socketToken = null;
      }
      connect();
    } else {
      connect();
    }

    return result;
  };
};
