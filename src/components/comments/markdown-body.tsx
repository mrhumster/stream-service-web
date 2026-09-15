import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownBodyProps {
  text: string;
  className?: string;
}

const components = {
  a: (props: React.ComponentPropsWithoutRef<"a">) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer noopener"
      className="underline underline-offset-2 decoration-[0.5px]"
    />
  ),
  p: (props: React.ComponentPropsWithoutRef<"p">) => (
    <p {...props} className="[&:not(:first-child)]:mt-1 first:mt-0" />
  ),
  ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
    <ul {...props} className="list-disc pl-4 [&:not(:first-child)]:mt-1" />
  ),
  ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
    <ol {...props} className="list-decimal pl-4 [&:not(:first-child)]:mt-1" />
  ),
  pre: (props: React.ComponentPropsWithoutRef<"pre">) => (
    <pre
      {...props}
      className="overflow-x-auto bg-muted px-2 py-1 [&:not(:first-child)]:mt-1"
    />
  ),
  code: (props: React.ComponentPropsWithoutRef<"code">) => (
    <code {...props} className="bg-muted px-1" />
  ),
  blockquote: (props: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote {...props} className="border-l-2 border-primary pl-2 italic" />
  ),
  table: (props: React.ComponentPropsWithoutRef<"table">) => (
    <table {...props} className="w-auto border-collapse [&:not(:first-child)]:mt-1" />
  ),
  th: (props: React.ComponentPropsWithoutRef<"th">) => (
    <th {...props} className="border border-primary/40 px-2 py-0.5" />
  ),
  td: (props: React.ComponentPropsWithoutRef<"td">) => (
    <td {...props} className="border border-primary/40 px-2 py-0.5" />
  ),
};

// Renders sanitized-on-the-backend markdown (bluemonday sanitizes raw HTML,
// so no raw HTML reaches this renderer). GFM for tables/strikethrough/lists.
const MarkdownBody = memo(function MarkdownBody({
  text,
  className,
}: MarkdownBodyProps) {
  return (
    <div
      className={cn(
        "text-[11px] leading-relaxed break-words [&_a]:text-primary",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownBody;