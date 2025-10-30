import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Poppins } from "next/font/google"
import "./globals.css"
import EspProvider from "@/components/EspProvider"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans", // 👈 This ties directly to your CSS variable in globals.css
})

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Farm - KidzTechCentre",
  description: "Educational Smart Farming Dashboard for Kids",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <EspProvider>
          {children}
        </EspProvider>
        <Analytics />
      </body>
    </html>
  )
}
