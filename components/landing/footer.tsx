"use client"

import { toast } from "sonner"

const LINKS = ["Privacy", "Terms", "Security", "Contact"]

export function Footer() {
  const showComingSoon = (feature: string) => {
    toast.info("Coming Soon", {
      description: `${feature} will be available in a future update.`,
    })
  }

  return (
    <footer className="mx-auto max-w-[1200px] px-7 pt-20 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-10">
        <div className="flex items-center gap-2.5 text-sm text-faint">
          <div className="h-[26px] w-[26px] rounded-[8px] bg-gradient-to-br from-accent to-accent-strong" />
          Intervexa © {new Date().getFullYear()}
        </div>
        <div className="flex gap-6 text-sm text-faint">
          {LINKS.map((link) => (
            <button
              key={link}
              onClick={() => showComingSoon(link)}
              className="transition-colors hover:text-foreground"
            >
              {link}
            </button>
          ))}
        </div>
      </div>
    </footer>
  )
}
