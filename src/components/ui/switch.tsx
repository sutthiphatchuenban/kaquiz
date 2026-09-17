"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer data-[state=checked]:bg-[var(--mint)] data-[state=unchecked]:bg-[var(--muted)] group/switch inline-flex shrink-0 items-center rounded-none border-[3px] border-line shadow-hard-sm transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-7 data-[size=default]:w-13 data-[size=sm]:h-6 data-[size=sm]:w-11",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-none border-[3px] border-line bg-[var(--paper)] transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 data-[state=checked]:translate-x-[calc(100%+6px)] data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
