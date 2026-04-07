import type { Middleware } from "@reduxjs/toolkit";
import { streamApi } from "../../services/streams";

interface PartialRootState {
  auth: {
    token: string | null;
  };
}

export const socketMiddleware: Middleware<{}, PartialRootState> = (store) => {
  let socket: WebSocket | null = null;
  return (next) => (action: any) => {
    const result = next(action);
    const state = store.getState();
    const token = state.auth.token;
    if (token && !socket) {
      socket = new WebSocket(
        `wss://api.example.com/stream/ws/updates?token=${token}`,
      );
      socket.onmessage = (event) => {
        console.log("message from back");
        try {
          const data = JSON.parse(event.data);
          console.log("received message", data);
          if (data.type === "STREAM_UPDATED") {
            store.dispatch(
              streamApi.util.invalidateTags([
                { type: "Stream", id: data.payload?.stream_id },
              ]),
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

    if (action.type === "auth/eraseAuth" && socket) {
      socket.close();
      socket = null;
    }

    return result;
  };
};
