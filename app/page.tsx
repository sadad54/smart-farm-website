import Link from "next/link"
import Image from "next/image"

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/SMART%20FARM-01-ohpPCvzAucOXfVLex7Z8jItUj5BLQj.jpg"
        alt="KidzTechCentre Building Background"
        fill
        className="object-cover"
        priority
      />

      

      {/* Content - Centered to match the design */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <Link href="/select" className="group hover:scale-105 transition-transform duration-300">
          <div className="text-center cursor-pointer">
            <p className="text-2xl md:text-3xl text-white/90 mb-2 font-medium">Click anywhere to continue</p>
            <p className="text-lg text-white/70">Welcome to KidzTechCentre</p>
          </div>
        </Link>
      </div>
      
    </div>
  )
}
