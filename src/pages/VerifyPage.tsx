import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVerifyMutation } from "@/services/auth";
import { userApi } from "@/services/users";
import { useAppDispatch } from "@/hooks";
import { tokenReceived, eraseAuth } from "@/feature/auth/authSlice";
import type { LoginResponse } from "@/types/auth.types";

type VerifyStatus = "idle" | "verifying" | "verified" | "error";

export const VerifyPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [verify, { isLoading }] = useVerifyMutation();
  const dispatch = useAppDispatch();
  const [status, setStatus] = useState<VerifyStatus>(
    token ? "verifying" : "idle",
  );
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!token || attemptedRef.current) return;
    attemptedRef.current = true;
    verify({ token })
      .unwrap()
      .then((res) => {
        // Backend теперь выдаёт свежую токен-пару: email_verified в JWT
        // обновлён, поэтому перелогин не нужен. Старые ответы (только
        // {verified}) фолбэком разлогинивают юзера, чтобы claim обновился.
        if (res.access_token) {
          const session: LoginResponse = {
            access_token: res.access_token,
            expires_in: res.expires_in ?? 0,
            token_type: res.token_type ?? "Bearer",
          };
          dispatch(tokenReceived(session));
          dispatch(
            userApi.endpoints.getAuthUser.initiate(undefined, {
              forceRefetch: true,
            }),
          );
        } else {
          dispatch(eraseAuth());
        }
        setStatus("verified");
      })
      .catch(() => setStatus("error"));
  }, [token, verify, dispatch]);

  return (
    <div className="max-w-md mx-auto">
      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
          <CardTitle className="text-sm uppercase tracking-tight">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          {!token || status === "idle" ? (
            <>
              <p className="text-[10px] uppercase font-bold text-muted-foreground text-center">
                No verification token provided.
                <br />
                Use the link from your verification email.
              </p>
              <Link
                to="/"
                className="text-[10px] uppercase font-bold text-primary hover:underline"
              >
                Back to home
              </Link>
            </>
          ) : status === "verifying" || isLoading ? (
            <>
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Verifying your email...
              </p>
            </>
          ) : status === "verified" ? (
            <>
              <CheckCircle2 className="size-10 text-green-600" />
              <p className="text-xs uppercase font-bold">Email verified!</p>
              <p className="text-[10px] uppercase text-muted-foreground text-center">
                Your session is ready.
              </p>
              <Button asChild className="mt-2 uppercase text-xs h-10 border-4 border-black rounded-none">
                <Link to="/streams">Start Browsing</Link>
              </Button>
            </>
          ) : (
            <>
              <XCircle className="size-10 text-destructive" />
              <p className="text-xs uppercase font-bold text-destructive">
                Verification failed
              </p>
              <p className="text-[10px] uppercase text-muted-foreground text-center">
                The token is invalid or expired.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-2 uppercase text-xs h-10 border-4 border-foreground/20 rounded-none"
              >
                <Link to="/">Back to home</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};