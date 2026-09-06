import { Link, Outlet } from "react-router-dom";
import { Menu, Sun, Star, Moon, Monitor, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/8bit/dropdown-menu";
import { Button } from "@/components/ui/8bit/button";
import { LoginForm } from "@/components/ui/login-form";
import { RegisterForm } from "@/components/ui/register-form";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useGetAuthUserQuery } from "@/services/users";
import { useLogoutMutation } from "@/services/auth";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { setAutoplay, setTheme } from "@/feature/settings/settingsSlice";
import { useTheme, type Theme } from "@/components/theme-context";

export const MainLayout = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { data } = useGetAuthUserQuery();
  const auth = useAuth();
  const [logout] = useLogoutMutation();
  const dispatch = useAppDispatch();
  const { autoplay, theme: themeSetting } = useAppSelector((s) => s.settings);
  const { setTheme: applyTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="size-4" /> },
    { value: "soft", label: "Soft", icon: <Star className="size-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
    { value: "system", label: "System", icon: <Monitor className="size-4" /> },
  ];
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b-4 border-primary p-4 shadow-[0_4px_0_0_rgba(0,0,0,0.1)]">
        <div className="container mx-auto flex justify-between items-center">
          {/* Логотип */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary animate-pixel-blink shadow-[2px_2px_0_0_rgba(0,0,0,1)]" />
            <h1 className="text-xl font-bold tracking-tighter uppercase">
              GO<span className="text-primary">Cast</span>
            </h1>
          </Link>

          {/* Навигация и Смена темы */}
          <nav className="flex items-center gap-6">
            <ul className="hidden md:flex gap-4 text-xs items-center">
              <li>
                <Link
                  to="/streams"
                  className="uppercase font-bold hover:text-primary hover:underline underline-offset-4 decoration-4 transition-colors"
                >
                  Streams
                </Link>
              </li>
              {auth.isAuth ? (
                <>
                  <li className="flex items-center gap-3">
                    <Link
                      to="/streams/own"
                      className="uppercase font-bold hover:text-primary hover:underline underline-offset-4 decoration-4 transition-colors"
                    >
                      My Videos
                    </Link>
                  </li>
                  <li className="flex items-center gap-3">
                    <Dialog
                      open={isProfileOpen}
                      onOpenChange={setIsProfileOpen}
                    >
                      <DialogTrigger asChild>
                        <button className="uppercase font-bold hover:text-primary hover:underline underline-offset-4 decoration-4 transition-colors">
                          {data?.email}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] border-4 border-primary shadow-[8px_8px_0_0_rgba(0,0,0,1)] bg-card p-0 overflow-hidden [&_[data-slot=dialog-close]]:text-primary-foreground [&_[data-slot=dialog-close]]:opacity-100">
                        <DialogHeader className="bg-primary p-4 border-b-4 border-black">
                          <DialogTitle className="text-primary-foreground text-xs uppercase tracking-tighter">
                            Profile
                          </DialogTitle>
                        </DialogHeader>
                        <div className="p-6 flex flex-col gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              Email
                            </span>
                            <p className="text-sm mt-1">{data?.email}</p>
                          </div>
                          <div className="flex gap-6 text-[10px] uppercase text-muted-foreground border-t-2 border-foreground/10 pt-3">
                            <div>
                              <span className="font-bold">Created:</span>{" "}
                              {data?.created_at &&
                                new Date(data.created_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                            </div>
                            <div>
                              <span className="font-bold">Updated:</span>{" "}
                              {data?.updated_at &&
                                new Date(data.updated_at).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                            </div>
                          </div>

                          <div className="border-t-2 border-foreground/10 pt-4 flex flex-col gap-3">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              Settings
                            </span>

                            {/* Autoplay toggle */}
                            <label className="flex items-center justify-between cursor-pointer">
                              <span className="text-sm font-bold uppercase">Autoplay</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={autoplay}
                                onClick={() => dispatch(setAutoplay(!autoplay))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-none border-2 border-black transition-colors ${
                                  autoplay ? "bg-green-600" : "bg-muted"
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 bg-white shadow transition-transform ${
                                    autoplay ? "translate-x-5" : "translate-x-1"
                                  }`}
                                />
                              </button>
                            </label>

                            {/* Theme dropdown */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold uppercase">Theme</span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="flex items-center gap-2 border-2 border-black px-3 py-1 text-xs uppercase font-bold bg-background hover:bg-accent transition-colors">
                                    {themeOptions.find((o) => o.value === themeSetting)?.label}
                                    <ChevronDown className="size-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {themeOptions.map((opt) => (
                                    <DropdownMenuItem
                                      key={opt.value}
                                      onSelect={() => {
                                        dispatch(setTheme(opt.value));
                                        applyTheme(opt.value);
                                      }}
                                    >
                                      <span className="flex items-center gap-2">
                                        {opt.icon}
                                        {opt.label}
                                        {themeSetting === opt.value && <span className="ml-auto">✓</span>}
                                      </span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <button
                      onClick={() => logout()}
                      className="bg-destructive text-destructive-foreground px-4 py-1 text-[10px] uppercase font-bold shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <Dialog
                  open={isModalOpen}
                  onOpenChange={(open) => {
                    setIsModalOpen(open);
                    if (!open) setIsRegister(false);
                  }}
                >
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
                        {isRegister ? "Registration" : "Authorization"}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="p-6">
                      {isRegister ? (
                        <RegisterForm
                          onSuccess={() => {
                            setIsRegister(false);
                          }}
                          onLoginClick={() => setIsRegister(false)}
                        />
                      ) : (
                        <LoginForm
                          onSuccess={() => setIsModalOpen(false)}
                          onRegisterClick={() => setIsRegister(true)}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </ul>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="pixel-border"
                    aria-label="Menu"
                  >
                    <Menu className="h-[1.2rem] w-[1.2rem]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/streams">Streams</Link>
                  </DropdownMenuItem>
                  {auth.isAuth && (
                    <DropdownMenuItem asChild>
                      <Link to="/streams/own">My Videos</Link>
                    </DropdownMenuItem>
                  )}
                  {auth.isAuth ? (
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => logout()}
                    >
                      Logout
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onSelect={() => setIsModalOpen(true)}
                    >
                      Sign In
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
