import type { Middleware } from "@reduxjs/toolkit";
import type { UnknownAction } from "redux";
import { streamApi } from "../../services/streams";

interface PartialRootState {
  auth: {
    token: string | null;
  };
}

export const socketMiddleware: Middleware<object, PartialRootState> = (store) => {
  let socket: WebSocket | null = null;
  return (next) => (action: unknown) => {
    const result = next(action);
    const state = store.getState();
    const token = state.auth.token;
    if (token && !socket) {
      socket = new WebSocket(
        `${import.meta.env.VITE_WS_URL}?token=${token}`,
      );
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

      socket.onclose = () => {
        socket = null;
      };
    }

    if ((action as UnknownAction).type === "auth/eraseAuth" && socket) {
      socket.close();
      socket = null;
    }

    return result;
  };
};
