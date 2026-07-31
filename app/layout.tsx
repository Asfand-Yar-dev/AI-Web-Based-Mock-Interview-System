import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { GoogleOAuthWrapper } from "@/components/auth/google-oauth-wrapper"
import { ThemedToaster } from "@/components/themed-toaster"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" })

export const metadata: Metadata = {
  title: "Intervexa",
  description:
    "Practice interviews with AI-powered mock sessions, get real-time feedback on voice and body language, and land your dream job.",
  generator: "Intervexa",
  icons: {
    icon: [
      { url: "/Logo_with_no_background.png", type: "image/png" },
    ],
    apple: { url: "/Logo_with_no_background.png", type: "image/png" },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
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
