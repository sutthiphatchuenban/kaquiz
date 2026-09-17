import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-[3px] border-line font-thai text-sm font-bold shadow-hard transition-[transform,box-shadow,background-color] duration-100 outline-none shrink-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-hard-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm disabled:pointer-events-none disabled:opacity-45 disabled:shadow-hard-sm disabled:translate-x-0 disabled:translate-y-0 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        yellow: "bg-[var(--sunny)] text-[#211543]",
        cyan: "bg-[var(--electric)] text-[#211543]",
        pink: "bg-[var(--candy)] text-[#211543]",
        mint: "bg-[var(--mint)] text-[#211543]",
        destructive: "bg-destructive text-destructive-foreground",
        success: "bg-[var(--success)] text-[var(--success-foreground)]",
        outline: "bg-[var(--paper)] text-ink",
        secondary: "bg-secondary text-secondary-foreground",
        ghost:
          "border-transparent bg-transparent text-ink shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-ink/5 hover:shadow-none",
        link: "border-transparent bg-transparent text-primary shadow-none underline underline-offset-4 hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
      },
      size: {
        default: "min-h-11 px-4 py-2.5 has-[>svg]:px-3",
        xs: "min-h-7 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-9 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "min-h-14 px-7 text-base has-[>svg]:px-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
