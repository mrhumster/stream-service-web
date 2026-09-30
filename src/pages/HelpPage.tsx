import { Link } from "react-router-dom";
import {
  HelpCircle,
  Upload,
  Globe,
  Play,
  MessageSquare,
  ThumbsUp,
  Activity as ActivityIcon,
  Settings,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Bullet = { label: string; description: string };

type Section = {
  icon: LucideIcon;
  title: string;
  intro?: string;
  bullets: Bullet[];
};

const sections: Section[] = [
  {
    icon: HelpCircle,
    title: "Getting Started",
    intro:
      "GoCast is a simple video hosting service. Everything starts with a free account.",
    bullets: [
      {
        label: "Sign up",
        description:
          "Click Sign In in the header, switch to the Registration tab and create an account with your email and password.",
      },
      {
        label: "Verify your email",
        description:
          "A verification link is sent to your inbox. Open it to confirm your email — uploading videos is locked until then.",
      },
      {
        label: "Sign in",
        description:
          "After verification you can sign in and start sharing videos right away.",
      },
    ],
  },
  {
    icon: Upload,
    title: "Uploading & Processing",
    intro:
      "Single or batch upload with transparent progress from upload to playback.",
    bullets: [
      {
        label: "Supported formats",
        description:
          "mp4, webm, mov, avi and mkv files are accepted. Larger files are uploaded in chunks and resume from where they left off.",
      },
      {
        label: "Batch upload",
        description:
          "On the create page switch to the Batch tab and drop multiple files at once. Each upload runs in parallel with its own progress bar.",
      },
      {
        label: "Processing",
        description:
          "After upload the video is transcoded to HLS and a thumbnail is generated. Finish is signalled by a ready badge in My Videos.",
      },
      {
        label: "Reprocess",
        description:
          "If processing fails, the stream shows an error state and a Reprocess button lets you retry it without re-uploading.",
      },
    ],
  },
  {
    icon: Globe,
    title: "Visibility & Sharing",
    intro: "Control exactly who can watch and find your videos.",
    bullets: [
      {
        label: "Public",
        description:
          "Shown in the Streams catalog and searchable by anyone visiting the site.",
      },
      {
        label: "Private",
        description:
          "Hidden from the catalog. Only you (and admins) can watch it.",
      },
      {
        label: "Unlisted",
        description: "Anyone with the link can watch, but it never appears in the catalog.",
      },
      {
        label: "Share",
        description:
          "Use the Share button on a stream page to copy its link to the clipboard — perfect for sharing unlisted videos.",
      },
    ],
  },
  {
    icon: Play,
    title: "Watching",
    intro: "A built-in HLS player streams video with adaptive quality.",
    bullets: [
      {
        label: "Playback",
        description:
          "Click a stream to open the player. Private and unlisted videos require the correct link or access rights.",
      },
      {
        label: "Autoplay",
        description:
          "Toggle Autoplay from your profile dialog — when enabled the video starts playing on open.",
      },
      {
        label: "Access denied",
        description:
          "If you don't have permission to watch a stream you will see an Access denied message instead of the player.",
      },
    ],
  },
  {
    icon: MessageSquare,
    title: "Comments",
    intro: "Discuss videos right under the player.",
    bullets: [
      {
        label: "When can I comment?",
        description:
          "Comments are only available on published streams with public or unlisted visibility.",
      },
      {
        label: "Markdown",
        description:
          "Comments support basic markdown like **bold**, code and links. HTML tags are stripped.",
      },
      {
        label: "Replies",
        description:
          "Reply to any comment to start a thread. Authors and admins can edit or delete messages.",
      },
    ],
  },
  {
    icon: ThumbsUp,
    title: "Reactions & Views",
    intro: "Like or dislike videos and track how many times they were watched.",
    bullets: [
      {
        label: "Reactions",
        description:
          "Signed-in users can like or dislike a stream from the reaction bar under the player. You can change your reaction at any time.",
      },
      {
        label: "Views",
        description:
          "A view is counted once per video watched. Guests are limited to prevent view inflation.",
      },
    ],
  },
  {
    icon: ActivityIcon,
    title: "Activity Feed",
    intro: "See what happened across your streams and account.",
    bullets: [
      {
        label: "Feed",
        description:
          "The Activity page lists stream events — created, uploaded, transcoded, published, reacted and more.",
      },
      {
        label: "Unread badges",
        description:
          "New events are highlighted and counted. Click an event to open the stream or mark everything as read.",
      },
    ],
  },
  {
    icon: Settings,
    title: "Account & Settings",
    intro: "Manage your profile, preferences and theme.",
    bullets: [
      {
        label: "Profile",
        description:
          "Click your email in the header to open your profile — email, verification status, role and account dates.",
      },
      {
        label: "Theme",
        description:
          "Pick Light, Soft, Dark or System from the theme dropdown in your profile.",
      },
      {
        label: "Logout",
        description:
          "Sign out from the header or the mobile menu. Your session is closed on the server as well.",
      },
    ],
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "I registered but never got the verification email",
    a: "Check your spam folder first. From the profile dialog click Unverified — verify email to resend the link. The token expires after 2 hours.",
  },
  {
    q: "The player shows Access denied",
    a: "You need permission to watch this video. Private streams are only for their owner, and draft/processing streams are not watchable yet. Make sure you are signed in with the right account.",
  },
  {
    q: "My video is stuck in processing",
    a: "Processing can take a while for large files. If a task fails, the stream switches to an error state and a Reprocess button appears in My Videos — click it to retry without uploading again.",
  },
  {
    q: "I can't comment on a video",
    a: "Comments are only available on published streams with public or unlisted visibility. Drafts, private and not-yet-published videos do not show the comment box.",
  },
  {
    q: "How do I make a video private or hidden?",
    a: "Set the visibility to private (only you) or unlisted (anyone with the link). You can change it on the create/edit page or via the update dialog on the stream page.",
  },
  {
    q: "What does the Share button do?",
    a: "It copies the current stream URL to your clipboard. Unlisted videos rely on this link — share it with whoever should be able to watch.",
  },
  {
    q: "How many views are counted?",
    a: "Views are deduplicated per video to prevent inflation. Returning to the same video does not keep multiplying the counter.",
  },
];

const HelpSection = ({ section }: { section: Section }) => {
  const { icon: Icon, title, intro, bullets } = section;
  return (
    <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
      <CardHeader className="border-b-2 border-foreground/10 bg-muted/30 py-4 gap-0">
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-tight">
          <Icon className="size-4 text-primary shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {intro && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {intro}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bullets.map((b) => (
            <div key={b.label} className="border-l-4 border-primary/30 pl-3">
              <span className="text-[10px] uppercase font-bold text-primary block">
                {b.label}
              </span>
              <p className="text-xs text-foreground/80 mt-1">{b.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const FaqItem = ({ q, a }: { q: string; a: string }) => (
  <details className="group border-2 border-foreground/20 bg-muted/10">
    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none">
      <span className="text-[10px] uppercase font-bold tracking-wider">
        {q}
      </span>
      <ChevronDown className="size-4 ml-auto shrink-0 transition-transform group-open:rotate-180" />
    </summary>
    <div className="px-4 pb-4">
      <p className="text-xs text-muted-foreground">{a}</p>
    </div>
  </details>
);

export const HelpPage = () => {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold uppercase tracking-tighter select-none cursor-default">
          Help
        </h2>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Everything you need to know about GoCast. Pick a topic or check the
          FAQ below.
        </p>
      </div>

      {sections.map((section) => (
        <HelpSection key={section.title} section={section} />
      ))}

      <Card className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b-2 border-foreground/10 bg-muted/30 py-4 gap-0">
          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-tight">
            <HelpCircle className="size-4 text-primary" />
            FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {faqs.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </CardContent>
      </Card>

      <p className="text-[10px] uppercase tracking-wider text-muted-foreground text-center">
        Still stuck?{" "}
        <Link
          to="/verify"
          className="font-bold text-primary hover:underline"
        >
          Verify your email
        </Link>{" "}
        or check your{" "}
        <Link
          to="/streams/own"
          className="font-bold text-primary hover:underline"
        >
          videos
        </Link>
        .
      </p>
    </div>
  );
};