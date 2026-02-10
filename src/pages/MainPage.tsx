import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { Film, Upload, Globe, Lock } from "lucide-react"

const features = [
  {
    icon: Upload,
    title: "Upload",
    description: "Drag & drop your video files to upload them in seconds",
  },
  {
    icon: Film,
    title: "Stream",
    description: "Watch and share your content with a built-in video player",
  },
  {
    icon: Globe,
    title: "Public or Private",
    description: "Control who sees your streams — public, private, or unlisted",
  },
  {
    icon: Lock,
    title: "Secure",
    description: "All content is protected with token-based authorization",
  },
]

export const MainPage = () => {
  const { isAuth } = useAuth()

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center gap-10 py-10">
      {/* Hero */}
      <div className="text-center flex flex-col gap-4">
        <h2 className="text-4xl font-bold uppercase tracking-tighter">
          Your videos,{" "}
          <span className="text-primary">your rules</span>
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          StreamApp is a simple video hosting service. Upload, manage, and share
          your streams with full control over visibility and access.
        </p>
      </div>

      {/* CTA */}
      <div className="flex gap-4">
        <Link
          to="/streams"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-10 px-6 font-bold"
        >
          Browse Streams
        </Link>
        {isAuth && (
          <Link
            to="/streams/create"
            className="inline-flex items-center gap-2 bg-muted text-foreground hover:bg-muted/80 border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-x-1 active:translate-y-1 rounded-none uppercase text-xs h-10 px-6 font-bold"
          >
            Create Stream
          </Link>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {features.map((f) => (
          <Card
            key={f.title}
            className="rounded-none border-4 border-foreground/20 shadow-[4px_4px_0_0_rgba(0,0,0,0.3)]"
          >
            <CardHeader className="border-b-2 border-foreground/10 bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-tight">
                <f.icon className="size-4 text-primary" />
                {f.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
