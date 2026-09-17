import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground flex field-sizing-content min-h-28 w-full rounded-none border-[3px] border-line bg-[var(--paper)] px-3.5 py-3 text-base font-semibold text-ink leading-relaxed shadow-hard-sm transition-[transform,box-shadow,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:-translate-x-[1px] focus-visible:-translate-y-[1px] focus-visible:border-ring focus-visible:shadow-hard focus-visible:outline-none",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
