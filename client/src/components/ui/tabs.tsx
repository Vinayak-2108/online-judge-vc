import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

/* Underline tabs: muted labels, the active one in ink with a 2px brand underline. */

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  // Kept so call sites written for the shadcn API still compile; there is one look.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant: _variant,
  ...props
}: TabsPrimitive.List.Props & { variant?: "default" | "line" }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full items-end gap-[22px] border-b border-border", className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-9 items-center gap-1.5 rounded-control px-0 text-[14px] whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-active:font-medium data-active:text-foreground",
        "after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-brand after:opacity-0 data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
