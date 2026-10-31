import Switch16 from "@/components/watermelon/switch-16";
import { useTheme } from "@/lib/theme";

/** Sun, switch, moon. Writes data-theme on <html> and remembers the choice. */
const ThemeToggle = ({ className }: { className?: string }) => {
  const [theme, setTheme] = useTheme();
  return (
    <Switch16
      className={className}
      checked={theme === "dark"}
      onCheckedChange={(dark) => setTheme(dark ? "dark" : "light")}
    />
  );
};

export default ThemeToggle;
