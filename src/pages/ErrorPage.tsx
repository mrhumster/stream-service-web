import { Link, useRouteError } from "react-router-dom";
import { TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ErrorPage() {
  const error = useRouteError() as { message?: string } | undefined;
  const message = error?.message || "Something went wrong";

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.25)]">
        <CardContent className="flex flex-col items-start gap-4 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-5" />
            <span className="text-sm font-bold uppercase tracking-wider">
              Unexpected error
            </span>
          </div>
          <p className="text-sm text-foreground break-words">{message}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            The page could not be displayed.
          </p>
          <Link
            to="/streams"
            className="inline-flex items-center gap-2 border-4 border-black bg-primary px-4 py-2 text-xs uppercase font-bold text-primary-foreground shadow-[4px_4px_0_0_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
          >
            Back to Streams
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default ErrorPage;