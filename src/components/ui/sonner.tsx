"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-none !border-[3px] !border-line !font-thai !font-bold !shadow-hard",
          title: "!text-sm",
          description: "!text-xs",
        },
      }}
      style={
        {
          "--normal-bg": "var(--arcade-deep)",
          "--normal-text": "var(--sunny)",
          "--normal-border": "var(--sunny)",
          "--success-bg": "var(--mint)",
          "--success-text": "#211543",
          "--success-border": "#211543",
          "--error-bg": "var(--destructive)",
          "--error-text": "#fff9e7",
          "--error-border": "#211543",
          "--warning-bg": "var(--sunny)",
          "--warning-text": "#211543",
          "--warning-border": "#211543",
          "--info-bg": "var(--electric)",
          "--info-text": "#211543",
          "--info-border": "#211543",
          "--border-radius": "0px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
