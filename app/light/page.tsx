'use client'

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import Image from "next/image"

import { Poppins } from "next/font/google";
import { useState } from "react"

 function WoodenSlider() {
  const [brightness, setBrightness] = useState(75) // Default 75%

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Wooden Slider Frame */}
      <div className="relative w-full h-6 rounded-full border-4 border-[#6B3A1E] bg-gradient-to-b from-[#D28B4B] to-[#8B4513] shadow-md overflow-hidden">
        {/* Dynamic Fill (Green light bar) */}
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-lime-400 to-green-600 transition-all duration-500 ease-in-out"
          style={{ width: `${brightness}%` }}
        ></div>

        {/* Inner wood reflection */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00000022] rounded-full pointer-events-none"></div>
      </div>

      {/* Range Control */}
      <input
        type="range"
        min="0"
        max="100"
        value={brightness}
        onChange={(e) => setBrightness(Number(e.target.value))}
        className="w-full mt-4 accent-green-600 cursor-pointer"
      />

      {/* Label */}
      <p className="text-center text-[#6B3A1E] font-semibold mt-2">
        Brightness: {brightness}%
      </p>
    </div>
  )
}



const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // you can adjust weights
});

export default function LightPage() {
  return (
    <DashboardLayout>
      <div className="relative min-h-screen flex flex-col items-center">
        {/* Page Heading */}
        <h2 className="text-4xl font-bold text-white mb-4 drop-shadow-lg self-start pl-8">
          Light
        </h2>

        {/* Top Row: Grow Light Control + Light Level */}
        <div className="flex flex-col lg:flex-row items-start justify-center gap-10 mt-2 w-full px-8 max-w-[1300px]">
          {/* Grow Light Control Card */}
          <Card className="flex-1 bg-[#F5E6C8] backdrop-blur-sm rounded-3xl p-8 border-4 border-[#D4A574] shadow-2xl">
            <h3 className="text-2xl font-bold text-[#6B4423] mb-6">
              Grow Light Control
            </h3>

            <div >
              <div className="flex justify-between items-center mb-6">
                {/* Sun Icon */}
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20166%404x-TykyXEoWSabySV4jFe6OkNpHYKRfUO.png"
                  alt="Sun"
                  width={80}
                  height={80}
                  className="object-contain"
                />
                {/* Moon Icon */}
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20173%404x-tYkXh1oxqT10WdMYhEtE3zCvqCnDvD.png"
                  alt="Moon"
                  width={60}
                  height={60}
                  className="object-contain"
                />
              </div>

              {/* Brightness Slider */}
              <WoodenSlider/>

              <p className="text-[#6B4423] text-lg font-semibold text-center">
                Adjust the brightness to help your plant grow!
              </p>
            </div>
          </Card>

          {/* Light Level Card */}
          <Card className="flex-1 bg-[#C8F5D8] backdrop-blur-sm rounded-3xl p-8 border-4 border-[#8FD9A8] shadow-2xl">
            <h3 className="text-2xl font-bold text-[#2D5F3F] mb-6">
              Light Level
            </h3>

            <div className="bg-white/60 rounded-2xl p-8">
              <div className="flex justify-center items-center gap-8 mb-4">
                {/* Plant Pot */}
                <Image
                 src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20172%404x-cIQj3NRqXCchsEO3K3haJwRk4ZOG9u.png"
        alt="Plant"
                  width={100}
                  height={100}
                  className="object-contain"
                />
                {/* Sun Icon */}
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20166%404x-TykyXEoWSabySV4jFe6OkNpHYKRfUO.png"
                  alt="Sun"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>

              <p className="text-[#2D5F3F] text-lg font-bold text-center">
                Natural Light: 850
              </p>
            </div>
          </Card>
        </div>

        {/* Bottom Row: Fun Fact + Robot */}
        <div className="relative flex items-center justify-start gap-6 w-full max-w-[1200px] mt-10 pl-10">
          {/* Fun Fact Card */}
          <Card className="bg-[#B8E6F5] backdrop-blur-sm rounded-3xl p-8 border-4 border-[#7AC5E0] shadow-2xl w-[50%] ml-[-40px]">
  <h3 className="text-2xl font-bold text-[#2D4F5F] mb-4">Fun Fact</h3>

  {/* Icons Row */}
  {/* Icons composition container */}
<div className="relative w-[300px] h-[180px] mx-auto mb-6">
  {/* Sun - top left, slightly higher */}
  <div className="absolute top-[-25px] left-[-25px] w-[120px] h-[120px]">
    <Image
      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20166%404x-TykyXEoWSabySV4jFe6OkNpHYKRfUO.png"
      alt="Sun"
      fill
      className="object-contain"
    />
  </div>

  {/* Plant pot - center but a bit to the right */}
  <div className="absolute top-[60px] left-[110px] w-[150px] h-[150px]">
    <Image
      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20174%404x-nRNIQHzQLndHuXkJ54WW3Tk3hQLE6N.png"
      alt="Plant"
      fill
      className="object-contain"
    />
  </div>

  {/* Watering can - above and to the right of the plant */}
  <div className="absolute top-[10px] right-[-15px] w-[100px] h-[100px] rotate-[10deg]">
    <Image
      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20170%404x-ZWZXsXFunsFYkXVVD0MxcBezweaVsW.png"
      alt="Watering Can"
      fill
      className="object-contain"
    />
  </div>
</div>


  {/* Description */}
  <p className="text-[#2D4F5F] text-lg font-semibold leading-relaxed text-center">
    Plants use a process called photosynthesis to turn sunlight into food.
    It’s like they’re eating sunshine!
  </p>
</Card>


          {/* Robot */}
          <div className="absolute right-[-10px] bottom-[-200px]">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2086%404x-ZyHwyxh42P6TUIMBtx3iSz36mRljoD.png"
              alt="Robot with plants"
              width={420*2}
              height={520*2}
              className="object-contain"
            />
          </div>
        </div>

        {/* Toggle Light Button */}
        <div className="fixed bottom-8 right-10 z-10">
          <button className="relative hover:scale-105 transition-transform">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2089%404x-6UUCeRJnGyFjM2K4XMGVLTeQ7UuU51.png"
              alt="Toggle Light"
              width={280}
              height={90}
              className="object-contain"
            />
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
