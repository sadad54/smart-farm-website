"use client"

import type React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2067%404x-c45EGsIjEepSAT61yZ1OqSCX3uLQkG.png",
    activeImage:"SMART FARM/navbar_selcted/Asset34@4x.png"
  },
  {
    label: "AI Insights",
    href: "/ai-insights",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2066%404x-hT4Ya4e2rOiRZgfGrKlj1ee3xF0Yxd.png",
        activeImage:"SMART FARM/navbar_selcted/Asset33@4x.png"
  },
  {
    label: "Fun Facts",
    href: "/fun-facts",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2065%404x-pqfFuhx8CQ9KNScQYZ1i6aTs5njVJf.png",
        activeImage:"SMART FARM/navbar_selcted/Asset32@4x.png"
  },
  {
    label: "Light",
    href: "/light",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2064%404x-o99Hvswfo8Gpa9Jsp084jWmJYnIJGZ.png",
        activeImage:"SMART FARM/navbar_selcted/Asset31@4x.png"
  },
  {
    label: "Motion",
    href: "/motion",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2063%404x-ICzZX8vtOZJlYa76QzUug9b3pwuvHZ.png",
        activeImage:"SMART FARM/navbar_selcted/Asset30@4x.png"
  },
  {
    label: "Temperature",
    href: "/temperature",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2062%404x-yyxZVP34jRDvAJw2wNTxT9xd84kuFR.png",
        activeImage:"SMART FARM/navbar_selcted/Asset29@4x.png"
  },
  {
    label: "Water",
    href: "/water",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2061%404x-YJIApEsKegLsTFbervfrNhHD0FiHV5.png",
        activeImage:"SMART FARM/navbar_selcted/Asset28@4x.png"
  },
  {
    label: "Scenario 1",
    href: "/scenario-1",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20158%404x-gz6GEwkSfwHKns4nMIBQhoih1di13q.png",
          activeImage:"SMART FARM/navbar_selcted/Asset36@4x.png"
  },
  {
    label: "Scenario 2",
    href: "/scenario-2",
    image:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20157%404x-qAHRHqBsYJ1UvtMoNdjbnFPhfih4Ef.png",
          activeImage:"SMART FARM/navbar_selcted/Asset35@4x.png"
  },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-blue-400 to-green-500" /> */}

      <aside className="fixed left-0 top-0 h-full w-64 z-20 flex flex-col">
        {/* Wooden sidebar background */}
        <div className="absolute inset-0">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20177%404x-cIjopoexpTIv3GIDVxpZpwooXbbQye.png"
            alt="Sidebar background"
            fill
            className="object-cover"
            priority
          />
        </div>

        <div className="relative z-10 p-6 flex flex-col h-full">
          {/* Logo */}
          <Image src="SMART FARM/PAGE 4/4x/smartfarm.png" alt="Smart Farm Logo" width={200} height={80} className="mb-8" />

      <nav className="flex-1 flex flex-col items-center gap-4 mt-4 px-3">
  {navItems.map((item) => {
    const isActive = pathname === item.href

    // Use the active asset if this item is selected, else default
    const buttonImage = isActive
      ? item.activeImage || item.image // fallback if no active image provided
      : item.image

    return (
      <Link key={item.href} href={item.href} className="w-full">
        <div
          // className={`relative w-full rounded-xl transition-all duration-300 hover:scale-105 ${
          //   isActive
          //     ? "ring-4 ring-yellow-300 shadow-[0_0_20px_rgba(255,215,0,0.5)]"
          //     : ""
          // }`}
        >
          <Image
            src={buttonImage || "/placeholder.svg"}
            alt={item.label}
            width={350}
            height={80}
            className="w-full h-auto rounded-x3 shadow-md hover:brightness-110 transition-all duration-300"
            priority={isActive}
          />

          {/* Optional overlay on active (soft light glow) */}
          
        </div>
      </Link>
    )
  })}
</nav>


          {/* User Info (with background image + overlayed text) */}
<div className="relative w-full flex items-center justify-center mb-6">
  {/* Wooden plaque background */}
  <div className="relative w-[220px] h-[100px]">
    <Image
      src="/SMART FARM/PAGE 4/4x/NAVIGATION MENU (yellow)/Asset 51@4x.png"
      alt="User Info Background"
      fill
      className="object-contain"
      priority
    />

    {/* Overlay content */}
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
      {/* Avatar and Name */}
      <div className="flex items-center justify-center gap-3 mb-1">
        <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
          <span className="text-white font-bold text-sm">LI</span>
        </div>
        <div className="text-left">
          <p className="text-white font-semibold leading-none text-sm">Lorem Ipsum</p>
          <p className="text-yellow-200 text-xs leading-none">926</p>
        </div>
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 text-orange-100 text-xs mt-1">
        <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        <span>6:78 AM</span>
      </div>
    </div>
  </div>
</div>


          <Link href="/select" className="mt-auto self-center">
          
            <Image src="SMART FARM/PAGE 4/4x/NAVIGATION MENU (yellow)/Asset 52@4x.png" alt="Log Out" width={200} height={80} className="mb-8" />
          </Link>
        </div>
      </aside>

      {/* Main Content */}
 <main className="relative ml-64 min-h-screen overflow-hidden">
  {/* Scenic Farm Background */}
  <div className="absolute inset-0 -z-10">
    <Image
      src="SMART FARM/PAGE 4/4x/background-dashboard.jpeg" // ⬅️ replace with your actual background asset
      alt="Smart Farm Background"
      fill
      className="object-cover object-center"
      priority
    />
  </div>

  {/* Top Header Row */}
  <header className="absolute top-8 left-0 w-full flex items-center justify-between px-8 z-20">
    {/* Left Logo */}
    <div className="flex-shrink-0">
      <Image
        src="/SMART FARM/PAGE 4/4x/Asset 37@4x.png"
        alt="KidzTech Icon"
        width={80}
        height={80}
        className="object-contain"
        priority
      />
    </div>

    {/* Center Wooden Banner */}
    <div className="relative flex justify-center items-center">
      <div className="relative w-[650px] h-[100px]">
        <Image
          src="/SMART FARM/PAGE 4/4x/Asset 38@4x.png"
          alt="Header Banner Background"
          fill
          className="object-contain"
          priority
        />
        
      </div>
    </div>

    {/* Right Home Button */}
    <Link href="/" className="flex-shrink-0 hover:scale-105 transition-transform duration-300">
      <Image
        src="/SMART FARM/PAGE 4/4x/Asset 39@4x.png"
        alt="Home Button"
        width={75}
        height={75}
        className="object-contain"
        priority
      />
    </Link>
  </header>

  {/* Page Content */}
  <div className="relative z-10 px-8 pb-8 pt-[180px]">
    {children}
  </div>
</main>


    </div>
  )
}
