import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"

export default function TemperaturePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Temperature</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Temperature Card */}
          <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400">
            <h3 className="text-2xl font-bold text-orange-900 mb-4">Current Temperature</h3>
            <div className="bg-white/80 rounded-2xl p-8 flex items-center justify-center gap-8">
              {/* Thermometer icon: public/images/icons/thermometer.png */}
              <div className="relative w-16 h-16">
                <Image src="SMART FARM/PAGE 9/4x/Asset 119@4x.png" alt="Thermometer" fill className="object-contain" />
              </div>
              <div>
                <p className="text-5xl font-black text-orange-600">25°c</p>
                <p className="text-2xl font-bold text-orange-500">Warm!</p>
              </div>
              {/* Sun icon: public/images/icons/sun.png */}
              <div className="relative w-16 h-16">
                <Image src="SMART FARM/PAGE 9/4x/Asset 166@4x.png" alt="Sun" fill className="object-contain" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-gray-700">Humidity : 65% (Perfect)</p>
            </div>
          </Card>

          {/* Temperature Control Card */}
          <Card className="bg-blue-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Temperature Control</h3>
            <div className="bg-white/80 rounded-2xl p-8">
              <div className="flex justify-between items-center mb-4">
                {/* Fire icon: public/images/icons/fire.png */}
                <div className="relative w-16 h-16">
                  <Image src="SMART FARM/PAGE 9/4x/Asset 126@4x.png" alt="Fire" fill className="object-contain" />
                </div>
                {/* Water drop icon: public/images/icons/water-drop.png */}
                <div className="relative w-16 h-16">
                  <Image src="SMART FARM/PAGE 9/4x/Asset 125@4x.png" alt="Water Drop" fill className="object-contain" />
                </div>
              </div>
              <div className="relative">
                <div className="h-8 bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-gray-800" />
              </div>
              <p className="text-center mt-4 text-lg font-semibold text-blue-900">Ideal Range : 18°c-28°c</p>
            </div>
          </Card>
        </div>

        {/* Run Fan button: public/images/buttons/run-fan-button.png */}
        <div className="absolute bottom-[-200px] right-10 ">
          <div className="relative w-84 h-30 hover:scale-105 transition-transform cursor-pointer">
            <Image src="SMART FARM/PAGE 9/4x/Asset 124@4x.png" alt="Run Fan Button" fill className="object-contain" />
          </div>
        </div>
      </div>
      <div className="absolute bottom-[-250px] right-[600px] w-116 h-136 pointer-events-none">
                  <Image 
                    src="SMART FARM/PAGE 9/4x/Asset 117@4x.png" 
                    alt="Farmer Robot" 
                    fill 
                    className="object-contain"
                  />
                </div>
    </DashboardLayout>
  )
}
