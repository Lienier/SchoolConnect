import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-lg bg-slate-100 p-2 text-navy-700 transition-colors hover:bg-slate-200 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700"
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      {isDark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
