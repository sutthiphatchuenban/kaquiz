import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-none border-2 border-[#211543] px-2 py-1 font-thai text-xs font-bold text-[#211543] shadow-[2px_2px_0_#211543] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[var(--sunny)]",
        yellow: "bg-[var(--sunny)]",
        secondary: "bg-[var(--electric)]",
        cyan: "bg-[var(--electric)]",
        mint: "bg-[var(--mint)]",
        pink: "bg-[var(--candy)]",
        peach: "bg-[var(--peach)]",
        grape: "bg-[var(--grape)] text-[#fff9e7]",
        destructive: "bg-[var(--destructive)] text-[#fff9e7]",
        outline: "bg-[var(--paper)]",
        ghost: "border-transparent bg-transparent text-ink shadow-none",
        link: "border-transparent bg-transparent text-primary shadow-none underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
