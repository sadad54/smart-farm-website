"use client"

import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import MotionLogCard from "@/components/ui/MotionLogCard"
import MotionSensorCard from "@/components/ui/MtionSensorCard"

export default function MotionPage() {
  const { sendCommand, connected } = useEspContext()
  
  // Test function for buzzer
  const testBuzzer = async () => {
    console.log('🔧 Testing buzzer connection...')
    if (!connected) {
      console.error('❌ ESP32 not connected!')
      alert('ESP32 not connected! Please check your device.')
      return
    }
    
    try {
      const result = await sendCommand('E', 'motion_page_test', { test: true })
      console.log('✅ Buzzer test command sent:', result)
      alert('Buzzer test command sent! Check ESP32 serial monitor and listen for alarm.')
    } catch (error) {
      console.error('❌ Buzzer test failed:', error)
      alert('Buzzer test failed! Check console for details.')
    }
  }
  
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

        {/* ESP32 Connection Status & Test */}
        <div className="mb-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-semibold">ESP32 {connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button
            onClick={testBuzzer}
            className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors"
          >
            🔧 Test Buzzer
          </button>
        </div>

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
        {/* Scarecrow button: Triggers enhanced PIR-style buzzer alarm */}
        <div className="absolute bottom-40 right-120">
          <div 
            className="absolute w-114 h-34 hover:scale-105 transition-transform cursor-pointer" 
            onClick={async () => {
              console.log('🚨 Scarecrow button clicked - sending enhanced alarm command E')
              try {
                const result = await sendCommand('E', 'motion_page', { button_type: 'scarecrow_buzzer' })
                console.log('✅ Scarecrow command sent successfully:', result)
              } catch (error) {
                console.error('❌ Scarecrow command failed:', error)
              }
            }}
          >
            <Image src="SMART FARM/PAGE 8/4x/Asset 112@4x.png" alt="Scarecrow Button" fill className="object-contain" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
