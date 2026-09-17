import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-12 w-full min-w-0 rounded-none border-[3px] border-line bg-[var(--paper)] px-3.5 py-2 text-base font-semibold text-ink shadow-hard-sm transition-[transform,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:-translate-x-[1px] focus-visible:-translate-y-[1px] focus-visible:border-ring focus-visible:shadow-hard focus-visible:outline-none",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
