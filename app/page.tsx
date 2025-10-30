"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"

export default function WelcomePage() {
  const router = useRouter()
  const navigatedRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const navigateNext = () => {
    if (navigatedRef.current) return
    navigatedRef.current = true
    // navigate to the next page
    router.push("/select")
  }

  useEffect(() => {
    // auto navigate after 5 seconds
    timerRef.current = window.setTimeout(() => {
      navigateNext()
    }, 5000)

    // navigate on any click
    const onAnyClick = () => navigateNext()
    document.addEventListener("click", onAnyClick, { capture: true })

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      document.removeEventListener("click", onAnyClick, { capture: true })
    }
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SMART%20FARM-01-ohpPCvzAucOXfVLex7Z8jItUj5BLQj.jpg"
          alt="KidzTechCentre Building Background"
          style={{
            width: '100%',
            height: '100vh',
            objectFit: 'cover',
            // move the image down to 25% vertical (halfway from top to center)
            objectPosition: '50% 25%',
            transform: 'scale(1.01)', // slight scale to avoid tiny gaps
            transformOrigin: '50% 25%'
          }}
          width={1920}
          height={1080}
          priority
        />

      {/* Content - Centered to match the design */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="group hover:scale-105 transition-transform duration-300">
          <div className="text-center cursor-pointer">
           
          </div>
        </div>
      </div>
    </div>
  )
}
