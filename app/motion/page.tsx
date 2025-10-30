"use client"

import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import MotionLogCard from "@/components/ui/MotionLogCard"
import MotionSensorCard from "@/components/ui/MtionSensorCard"

export default function MotionPage() {
  const { sendCommand } = useEspContext()
  const motionLog = [
    {
      type: "chicken",
      time: "9:15AM",
      label: "Chicken Detected!",
      // Replace with: public/images/animals/chicken.png
      image: "/images/animals/chicken.png",
    },
    {
      type: "butterfly",
      time: "9:12AM",
      label: "Butterfly Fluttered by!",
      // Replace with: public/images/animals/butterfly.png
      image: "/images/animals/butterfly.png",
    },
    {
      type: "chicken",
      time: "9:05AM",
      label: "Chicken Detected!",
      // Replace with: public/images/animals/chicken.png
      image: "/images/animals/chicken.png",
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Motion</h2>

        <div className="grid grid-cols-1 gap-6">
          {/* Motion Sensor Card */}
          <MotionSensorCard/>

          {/* Motion Log Card */}
          <MotionLogCard />
        </div>
<div className="absolute -bottom-[120px] right-[50px] w-176 h-236 pointer-events-none">
            <Image 
              src="SMART FARM/PAGE 8/4x/Asset 102@4x.png" 
              alt="Farmer Robot"
              fill 
              className="object-contain"
            />
          </div>
        {/* Scarecrow button: public/images/buttons/scarecrow-button.png */}
        <div className="absolute bottom-40 right-120">
          <div className="absolute w-114 h-34 hover:scale-105 transition-transform cursor-pointer" onClick={() => sendCommand('B')}>
            <Image src="SMART FARM/PAGE 8/4x/Asset 112@4x.png" alt="Scarecrow Button" fill className="object-contain" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
