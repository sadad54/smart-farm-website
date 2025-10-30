"use client"

import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"

export default function WaterPage() {
  const { sendCommand } = useEspContext()
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white ml-200">Water</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Robot image and buttons */}
          <div className="w-full flex flex-col items-center">
            <div className="absolute w-176 h-200 pointer-events-none">
              <Image
                src="/SMART FARM/PAGE 10/4x/Asset 136@4x.png"
                alt="Robot Asset"
                fill
                className="object-contain"
              />
            </div>

            {/* Buttons row under the robot image */}
            <div className="mt-6 flex gap-4">
              <div className="absolute bottom-[5px] left-[60px] w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => sendCommand('D')}>
                <Image
                  src="/SMART FARM/PAGE 10/4x/Asset 138@4x.png"
                  alt="Button Asset 138"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-[5px] left-[440px] w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => sendCommand('C')}>
                <Image
                  src="/SMART FARM/PAGE 10/4x/Asset 179@4x.png"
                  alt="Button Asset 137"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Right: stacked cards */}
          <div className="w-full flex flex-col gap-6">
            {/* Water Tank Card */}
            <Card className="bg-blue-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
              <h3 className="text-2xl font-bold text-blue-900 mb-4">Water Tank</h3>
              <div className="bg-gradient-to-b from-blue-100 to-blue-300 rounded-2xl p-8 relative overflow-hidden h-64">
                <div className="absolute bottom-0 left-0 right-0 bg-blue-500 h-[61%] rounded-t-[50px]">
                  <svg className="absolute top-0 left-0 right-0" viewBox="0 0 1200 100" preserveAspectRatio="none">
                    <path
                      d="M0,50 Q150,20 300,50 T600,50 T900,50 T1200,50 L1200,100 L0,100 Z"
                      fill="white"
                      opacity="0.3"
                    />
                  </svg>
                </div>
                <div className="absolute bottom-8 right-8 text-blue-900 font-bold text-2xl">61% Full</div>
              </div>
            </Card>

            {/* Watering History Card */}
            <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
              <h3 className="text-2xl font-bold text-green-900 mb-4">Watering History</h3>
              <div className="space-y-3">
                <div className="bg-white/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">Watered the plant</p>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "80%" }} />
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-600">9:00 AM</p>
                    <div className="relative w-16 h-16 mt-2">
                      <Image src="SMART FARM/PAGE 10/4x/Asset 134@4x.png" alt="Robot Avatar" fill className="object-contain" />
                    </div>
                  </div>
                </div>
                <div className="bg-white/80 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">Watered the plant</p>
                    <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "70%" }} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 ml-4">Yesterday</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
