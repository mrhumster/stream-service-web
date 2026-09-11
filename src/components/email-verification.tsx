import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Shield, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/hooks";
import { useResendMutation } from "@/services/auth";

export function EmailVerificationBanner() {
  const authUser = useAppSelector((s) => s.auth.authUser);
  const [resend, { isLoading }] = useResendMutation();

  if (
    !authUser ||
    authUser.role === "admin" ||
    // пока профиль ещё не загружен — не показываем полосу
    !authUser.id ||
    authUser.email_verified !== false
  ) {
    return null;
  }

  return (
    <div className="border-b-4 border-yellow-500 bg-yellow-500/10 px-4 py-2">
      <div className="container mx-auto flex items-center justify-center gap-2 text-[10px] uppercase font-bold">
        <ShieldAlert className="size-3 text-yellow-600" />
        <span>Your email is not verified.</span>
        <Link to="/verify" className="text-primary underline underline-offset-2 hover:opacity-80">
          Verify now
        </Link>
        <button
          type="button"
          disabled={isLoading}
          onClick={() =>
            resend()
              .unwrap()
              .then(() => toast.success("Verification email re-sent"))
              .catch(() => toast.error("Failed to resend verification email"))
          }
          className="underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
        >
          {isLoading ? "Sending..." : "Resend"}
        </button>
      </div>
    </div>
  );
}

export function EmailVerificationGate() {
  const [resend, { isLoading }] = useResendMutation();

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="flex flex-col items-center gap-4 py-12">
        <Shield className="size-12 text-yellow-600" />
        <h2 className="text-lg font-bold uppercase tracking-tighter">
          Verify your email
        </h2>
        <p className="text-[10px] uppercase font-bold text-muted-foreground">
          Streaming uploads are locked until you confirm your email address.
          Check your inbox for a verification link, or request a new one.
        </p>
        <div className="flex gap-2 mt-2">
          <Button asChild className="uppercase text-xs h-10 border-4 border-black rounded-none">
            <Link to="/verify">Go to verification</Link>
          </Button>
          <Button
            variant="outline"
            disabled={isLoading}
            onClick={() =>
              resend()
                .unwrap()
                .then(() => toast.success("Verification email re-sent"))
                .catch(() => toast.error("Failed to resend verification email"))
            }
            className="uppercase text-xs h-10 border-4 border-foreground/20 rounded-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1" /> Sending...
              </>
            ) : (
              "Resend"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}