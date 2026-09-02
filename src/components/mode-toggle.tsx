import { Moon, Sun, Star } from "lucide-react";

import { Button } from "@/components/ui/8bit/button";
import { useTheme } from "@/components/theme-context";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === "light") setTheme("soft");
    else if (theme === "soft") setTheme("dark");
    else setTheme("light");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycle}
      className="pixel-border"
    >
      <Sun
        className={`size-5 transition-all ${
          theme === "light" ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
      />
      <Star
        className={`absolute size-5 transition-all ${
          theme === "soft" ? "rotate-0 scale-100" : "rotate-90 scale-0"
        }`}
      />
      <Moon
        className={`size-5 transition-all ${
          theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
