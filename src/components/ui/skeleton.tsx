import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-none border-[3px] border-dashed border-line/30 bg-[var(--muted)]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
