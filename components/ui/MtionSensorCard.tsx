"use client"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import Image from "next/image"

export default function MotionSensorCard() {
  // ✅ Motion state: true = motion detected, false = no motion
  const [motionDetected, setMotionDetected] = useState(false)

  // (Optional) Simulate motion changes for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setMotionDetected(prev => !prev)
    }, 5000) // toggles every 5 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400 w-1/2 transition-all duration-500">
      {/* Header */}
      <h3 className="text-2xl font-bold text-orange-900 mb-4">Motion Sensor</h3>

      {/* Content layout */}
      <div className="flex gap-6">
        {/* Left side: robot area */}
        <div className="flex-1 bg-white/80 rounded-2xl p-6 flex items-center justify-center">
          <div className="relative w-48 h-48 transition-transform duration-500 ease-in-out">
            <Image
              src={
                motionDetected
                  ? "SMART FARM/PAGE 8/4x/Asset 111@4x.png" // 🔹 Replace this placeholder when ready
                  : "SMART FARM/PAGE 8/4x/Asset 175@4x.png"
              }
              alt={motionDetected ? "Motion Detected Robot" : "Idle Robot"}
              fill
              className={`object-contain ${
                motionDetected ? "scale-105" : "opacity-90"
              }`}
            />
          </div>
        </div>

        {/* Right side: AI status */}
        <div
          className={`flex-1 rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-500 ${
            motionDetected
              ? "bg-green-300/80 border-4 border-green-500"
              : "bg-blue-300/80 border-4 border-blue-500"
          }`}
        >
          <p
            className={`text-4xl font-black mb-2 ${
              motionDetected ? "text-green-900" : "text-blue-900"
            }`}
          >
            {motionDetected ? "DETECTED" : "ACTIVE"}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-white/60 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                motionDetected
                  ? "bg-gradient-to-r from-green-400 to-green-600 w-[100%]"
                  : "bg-gradient-to-r from-blue-400 to-blue-600 w-[75%]"
              }`}
            />
          </div>

          <p
            className={`text-lg font-semibold ${
              motionDetected ? "text-green-800" : "text-blue-800"
            }`}
          >
            {motionDetected ? "Motion Detected!" : "AI is Operating"}
          </p>
        </div>
      </div>
    </Card>
  )
}
