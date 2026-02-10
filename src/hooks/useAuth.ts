import { useSelector } from "react-redux"
import type { RootState } from "../store"

export const useAuth = () => {
  const token = useSelector((state: RootState) => state.auth.token)
  return {
    isAuth: !!token,
    token
  }
}
