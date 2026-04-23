import { useSelector } from "react-redux";
import type { RootState } from "../store";

export const useAuth = () => {
  const { token, isInitializing } = useSelector(
    (state: RootState) => state.auth,
  );
  return {
    isAuth: !!token,
    token,
    isInitializing,
  };
};
