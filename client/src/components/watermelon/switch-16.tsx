import { MoonIcon, SunIcon } from "lucide-react";

import { Switch } from "@/components/ui/switch";

interface Switch16Props {
  /** true = the right-hand icon (moon) is active. */
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labels?: { left: string; right: string; switch: string };
  className?: string;
}

/**
 * Watermelon switch-16 (sun / switch / moon), made controlled and restyled:
 * neutral track, the active icon in full ink, the other muted.
 */
const Switch16 = ({
  checked,
  onCheckedChange,
  labels = { left: "Light theme", right: "Dark theme", switch: "Dark theme" },
  className,
}: Switch16Props) => {
  return (
    <div
      className={`group inline-flex items-center gap-2 ${className ?? ""}`}
      data-state={checked ? "checked" : "unchecked"}
    >
      <button
        type="button"
        id="theme-light"
        className="text-current group-data-[state=checked]:opacity-50 cursor-pointer rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={labels.left}
        onClick={() => onCheckedChange(false)}
      >
        <SunIcon className="size-4" aria-hidden />
      </button>

      <Switch
        id="theme-toggle"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={labels.switch}
      />

      <button
        type="button"
        id="theme-dark"
        className="text-current group-data-[state=unchecked]:opacity-50 cursor-pointer rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={labels.right}
        onClick={() => onCheckedChange(true)}
      >
        <MoonIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
};

export default Switch16;
