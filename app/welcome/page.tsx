import Link from "next/link"
import Image from "next/image"

type Props = {
  searchParams: Promise<{ next?: string }>
}

export default async function WelcomePage({ searchParams }: Props) {
  const params = await searchParams
  const nextTarget = params?.next || "/dashboard"

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* Full background image */}
        <Image
          src="SMART FARM/PAGE3/4x/Asset 18@4x.png"
          alt="Smart Farm Welcome"
          style={{
            width: '100vw',
            height: '100vh',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'cover',
            // move image down to roughly 25% vertical to protect the logo at the top
            objectPosition: '50% 25%'
          }}
          width={1920}
          height={1080}
          priority
        />

      {/* START button positioned on the right side */}
      <div className="absolute right-[12%] bottom-[2%] z-10">
        <Link href={nextTarget} className="block hover:scale-110 transition-transform duration-300">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2017%404x-TsEi7muSlnPjXa3arL62b2COR6h7t0.png"
            alt="Start Button"
            width={400}
            height={400}
            className="object-contain"
          />
        </Link>
      </div>
    </div>
  )
}
