import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { GoogleOAuthWrapper } from "@/components/auth/google-oauth-wrapper"
import { ThemedToaster } from "@/components/themed-toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "Intervexa",
  description:
    "Practice interviews with AI-powered mock sessions, get real-time feedback on voice and body language, and land your dream job.",
  generator: "Intervexa",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark1-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <GoogleOAuthWrapper>
            <AuthProvider>
              {children}
            </AuthProvider>
          </GoogleOAuthWrapper>
          <ThemedToaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
