import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, type SyntheticEvent } from "react";
import { type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { useGetTokenMutation } from "../../services/auth";

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

type AuthArgs = { email: string; password: string };

const inputClassName =
  "border-4 border-black rounded-none focus-visible:ring-0 focus-visible:border-primary placeholder:opacity-30";

export function LoginForm({ onSuccess, onRegisterClick }: LoginFormProps) {
  const [getToken] = useGetTokenMutation();
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState(false);

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldError(false);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData) as AuthArgs;

    try {
      await getToken(payload).unwrap();
      onSuccess?.();
    } catch (err) {
      const fetchErr = err as FetchBaseQueryError;
      if (fetchErr.status === 401) {
        setError("Invalid email or password");
        setFieldError(true);
      } else {
        setError("Login failed");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-[10px] uppercase">
          Email
        </Label>
        <Input
          name="email"
          id="email"
          type="email"
          placeholder="HERO@EXAMPLE.COM"
          className={fieldError ? inputClassName + " border-destructive" : inputClassName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-[10px] uppercase">
          Password
        </Label>
        <Input
          name="password"
          id="password"
          type="password"
          className={fieldError ? inputClassName + " border-destructive" : inputClassName}
        />
      </div>
      {error && (
        <p className="text-[10px] uppercase font-bold text-destructive">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-12"
      >
        Login
      </Button>
      <div className="text-center text-[8px] uppercase opacity-50">
        New user?{" "}
        <span
          onClick={onRegisterClick}
          className="text-primary cursor-pointer hover:underline"
        >
          Create account
        </span>
      </div>
    </form>
  );
}
