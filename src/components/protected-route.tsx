import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Loader2 } from "lucide-react"

export function ProtectedRoute() {
  const { isAuth, isInitializing } = useAuth()

  if (isInitializing) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuth) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
