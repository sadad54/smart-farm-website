'use client'

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import Image from "next/image"
import { useEspContext } from "@/components/EspProvider"
import { Poppins } from "next/font/google";
import { useState, useEffect } from "react"

interface WoodenSliderProps {
  brightness: number
  onChange: (value: number) => void
  lightOn: boolean
}

function WoodenSlider({ brightness, onChange, lightOn }: WoodenSliderProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Wooden Slider Frame */}
      <div className="relative w-full h-6 rounded-full border-4 border-[#6B3A1E] bg-gradient-to-b from-[#D28B4B] to-[#8B4513] shadow-md overflow-hidden">
        {/* Dynamic Fill (Green light bar) */}
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-in-out ${
            lightOn 
              ? 'bg-gradient-to-r from-lime-400 to-green-600' 
              : 'bg-gradient-to-r from-gray-400 to-gray-600'
          }`}
          style={{ width: `${brightness}%` }}
        ></div>

        {/* Inner wood reflection */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00000022] rounded-full pointer-events-none"></div>
        
        {/* Light glow effect when on */}
        {lightOn && (
          <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] pointer-events-none"></div>
        )}
      </div>

      {/* Range Control */}
      <input
        type="range"
        min="0"
        max="100"
        value={brightness}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-4 accent-green-600 cursor-pointer"
        disabled={!lightOn}
      />

      {/* Label */}
      <p className="text-center text-[#6B3A1E] font-semibold mt-2">
        Brightness: {brightness}% {lightOn ? '(ON)' : '(OFF)'}
      </p>
    </div>
  )
}



const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // you can adjust weights
});

export default function LightPage() {
  const { state, sendCommand } = useEspContext()
  const [lightOn, setLightOn] = useState(false)
  const [brightness, setBrightness] = useState(75) // Default 75%

  // Get real-time light level from ESP32
  const currentLightLevel = state.light || 850

  // Toggle light function
  const toggleLight = async () => {
    try {
      await sendCommand('A', 'light_page', { 
        button_type: 'toggle_light', 
        brightness: brightness,
        current_state: lightOn ? 'off' : 'on'
      })
      setLightOn(!lightOn)
    } catch (error) {
      console.error('Failed to toggle light:', error)
    }
  }

  // Update brightness when slider changes
  const handleBrightnessChange = async (newBrightness: number) => {
    setBrightness(newBrightness)
    
    // If light is currently on, send brightness update to ESP32
    if (lightOn) {
      try {
        await sendCommand('A', 'light_page', { 
          button_type: 'brightness_adjustment', 
          brightness: newBrightness,
          current_state: 'on'
        })
      } catch (error) {
        console.error('Failed to update brightness:', error)
      }
    }
  }

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

            <div>
              <div className="flex justify-between items-center mb-6">
                {/* Sun Icon - active when light is on */}
                <div className="relative">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20166%404x-TykyXEoWSabySV4jFe6OkNpHYKRfUO.png"
                    alt="Sun"
                    width={80}
                    height={80}
                    className={`object-contain transition-all duration-300 ${
                      lightOn ? 'filter brightness-125 drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]' : 'filter brightness-75 grayscale'
                    }`}
                  />
                  {lightOn && (
                    <div className="absolute inset-0 rounded-full bg-yellow-300/20 blur-lg animate-pulse"></div>
                  )}
                </div>
                
                {/* Moon Icon - active when light is off */}
                <div className="relative">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20173%404x-tYkXh1oxqT10WdMYhEtE3zCvqCnDvD.png"
                    alt="Moon"
                    width={60}
                    height={60}
                    className={`object-contain transition-all duration-300 ${
                      !lightOn ? 'filter brightness-125 drop-shadow-[0_0_10px_rgba(147,197,253,0.8)]' : 'filter brightness-75 grayscale'
                    }`}
                  />
                  {!lightOn && (
                    <div className="absolute inset-0 rounded-full bg-blue-300/20 blur-lg animate-pulse"></div>
                  )}
                </div>
              </div>

              {/* Brightness Slider */}
              <WoodenSlider
                brightness={brightness}
                onChange={handleBrightnessChange}
                lightOn={lightOn}
              />

              <p className="text-[#6B4423] text-lg font-semibold text-center">
                {lightOn ? 'Light is ON - Adjust brightness!' : 'Turn on the light to help your plants grow!'}
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
                {/* Plant Pot with glow effect when light is on */}
                <div className={`relative ${lightOn ? 'filter brightness-110' : ''}`}>
                  <Image
                   src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20172%404x-cIQj3NRqXCchsEO3K3haJwRk4ZOG9u.png"
          alt="Plant"
                    width={100}
                    height={100}
                    className="object-contain"
                  />
                  {lightOn && (
                    <div className="absolute inset-0 rounded-full bg-green-200/30 blur-xl animate-pulse"></div>
                  )}
                </div>
                
                {/* Sun/Light Icon with dynamic state */}
                <div className="relative">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%20166%404x-TykyXEoWSabySV4jFe6OkNpHYKRfUO.png"
                    alt="Sun"
                    width={80}
                    height={80}
                    className={`object-contain transition-all duration-300 ${
                      lightOn ? 'filter brightness-125 drop-shadow-[0_0_15px_rgba(255,255,0,0.8)]' : 'filter brightness-75'
                    }`}
                  />
                  {lightOn && (
                    <div className="absolute inset-0 rounded-full bg-yellow-300/20 blur-lg animate-pulse"></div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[#2D5F3F] text-lg font-bold text-center">
                  Natural Light: {currentLightLevel.toFixed(1)}
                </p>
                <p className="text-[#2D5F3F] text-sm text-center">
                  Grow Light: {lightOn ? `${brightness}% ON` : 'OFF'}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      currentLightLevel > 600 ? 'bg-yellow-400' :
                      currentLightLevel > 300 ? 'bg-orange-400' : 'bg-blue-400'
                    }`}
                    style={{ width: `${Math.min((currentLightLevel / 1000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
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
          <button 
            onClick={toggleLight}
            className={`relative hover:scale-105 transition-all duration-300 ${
              lightOn ? 'filter brightness-125 drop-shadow-[0_0_20px_rgba(255,255,0,0.6)]' : 'filter brightness-90'
            }`}
          >
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Asset%2089%404x-6UUCeRJnGyFjM2K4XMGVLTeQ7UuU51.png"
              alt={lightOn ? "Turn Light OFF" : "Turn Light ON"}
              width={280}
              height={90}
              className="object-contain"
            />
            
            {/* Status indicator overlay */}
            <div className={`absolute top-2 right-2 w-4 h-4 rounded-full transition-all duration-300 ${
              lightOn ? 'bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-400'
            }`}>
              <div className={`w-full h-full rounded-full ${
                lightOn ? 'animate-pulse bg-green-300' : 'bg-red-500'
              }`}></div>
            </div>
            
            {/* Button label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`font-bold text-lg drop-shadow-md ${
                lightOn ? 'text-yellow-900' : 'text-gray-700'
              }`}>
                {lightOn ? 'LIGHT ON' : 'LIGHT OFF'}
              </span>
            </div>
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
