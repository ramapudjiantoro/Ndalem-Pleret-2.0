import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** "icon" = ikon saja, "pill" = dengan label teks */
  variant?: "icon" | "pill";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        aria-label="Toggle dark mode"
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
          "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          className
        )}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        {isDark ? "Terang" : "Gelap"}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={cn(
        "p-2 rounded-lg transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        className
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
