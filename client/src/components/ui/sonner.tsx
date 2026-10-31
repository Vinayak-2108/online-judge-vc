import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/lib/theme"

/** App-wide toast host; flat surfaces from the tokens, no shadow. */
function Toaster(props: ToasterProps) {
  const [theme] = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-center"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--sheet)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--positive-bg)",
          "--success-text": "var(--positive)",
          "--success-border": "var(--positive)",
          "--error-bg": "var(--negative-bg)",
          "--error-text": "var(--negative)",
          "--error-border": "var(--negative)",
          "--border-radius": "8px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
