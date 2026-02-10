import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export function ProtectedRoute() {
  const { isAuth } = useAuth()

  if (!isAuth) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
