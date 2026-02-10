import { ModeToggle } from "@/components/mode-toggle";
import { Link, Outlet } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginForm } from "@/components/ui/login-form";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useGetAuthUserQuery } from "@/services/users";
import { useLogoutMutation } from "@/services/auth";

export const MainLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data } = useGetAuthUserQuery();
  const auth = useAuth();
  const [logout] = useLogoutMutation();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b-4 border-primary p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.1)]">
        <div className="container mx-auto flex justify-between items-center">
          {/* Логотип */}
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 bg-primary animate-pixel-blink shadow-[2px_2px_0_0_rgba(0,0,0,1)]" />
            {/* Типа пиксельный маскот */}
            <h1 className="text-xl font-bold tracking-tighter uppercase">
              STREAM<span className="text-primary">App</span>
            </h1>
          </div>

          {/* Навигация и Смена темы */}
          <nav className="flex items-center gap-6">
            <ul className="hidden md:flex gap-4 text-xs items-center">
              <li>
                <Link
                  to="/streams"
                  className="uppercase font-bold hover:text-primary transition-colors"
                >
                  Streams
                </Link>
              </li>
              {auth.isAuth ? (
                <li className="flex items-center gap-3">
                  <span className="uppercase">{data && data.email}</span>
                  <button
                    onClick={() => logout()}
                    className="bg-destructive text-destructive-foreground px-4 py-1 text-[10px] uppercase font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                  >
                    Logout
                  </button>
                </li>
              ) : (
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                  <DialogTrigger asChild>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="bg-primary text-primary-foreground px-4 py-1 text-[10px] uppercase font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      Sign In
                    </button>
                  </DialogTrigger>

                  {/* Контент модалки */}
                  <DialogContent className="sm:max-w-[425px] border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-card p-0 overflow-hidden">
                    <DialogHeader className="bg-primary p-4 border-b-4 border-black">
                      <DialogTitle className="text-primary-foreground text-xs uppercase tracking-tighter">
                        Authorization
                      </DialogTitle>
                    </DialogHeader>

                    <div className="p-6">
                      <LoginForm onSuccess={() => setIsModalOpen(false)} />
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </ul>
            <ModeToggle />
          </nav>
        </div>
      </header>

      {/* Контент страницы */}
      <main className="flex-1 container mx-auto p-6">
        <Outlet />
      </main>

      {/* Футер */}
      <footer className="p-4 border-t-4 border-muted text-[10px] text-center opacity-50">
        (c) 2026 XOMRKOB_DEV. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
};
