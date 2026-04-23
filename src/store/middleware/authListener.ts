import { authApi } from "@/services/auth";
import { userApi } from "@/services/users";
import { createListenerMiddleware } from "@reduxjs/toolkit";

export const authListener = createListenerMiddleware();

authListener.startListening({
  matcher: authApi.endpoints.getToken.matchFulfilled,
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(
      userApi.endpoints.getAuthUser.initiate(undefined, { forceRefetch: true }),
    );
  },
});
