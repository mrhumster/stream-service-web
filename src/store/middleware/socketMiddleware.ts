import type { Middleware } from "@reduxjs/toolkit";
import type { UnknownAction } from "redux";
import { streamApi } from "../../services/streams";

interface PartialRootState {
  auth: {
    token: string | null;
  };
}

const RECONNECT_BASE_DELAY_MS = 1500;
const RECONNECT_MAX_DELAY_MS = 20000;

export const socketMiddleware: Middleware<object, PartialRootState> = (store) => {
  let socket: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connect = () => {
    const token = store.getState().auth.token;
    if (!token || socket) return;

    socket = new WebSocket(import.meta.env.VITE_WS_URL, [token]);

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
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    socket.onopen = () => {
      reconnectAttempt = 0;
    };

    socket.onclose = () => {
      socket = null;
      // Авто-переподключение с экспоненциальной паузой, пока юзер в сессии.
      if (store.getState().auth.token) {
        const delay = Math.min(
          RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt,
          RECONNECT_MAX_DELAY_MS,
        );
        reconnectAttempt += 1;
        clearReconnectTimer();
        reconnectTimer = setTimeout(() => connect(), delay);
      } else {
        reconnectAttempt = 0;
        clearReconnectTimer();
      }
    };
  };

  return (next) => (action: unknown) => {
    const result = next(action);

    if ((action as UnknownAction).type === "auth/eraseAuth") {
      reconnectAttempt = 0;
      clearReconnectTimer();
      if (socket) {
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    } else {
      connect();
    }

    return result;
  };
};