import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // you can adjust weights
});

export default function FunFactsPage() {
  const sensors = [
    {
      // Replace with: public/images/icons/soil-moisture-sensor.png
      icon: "SMART FARM/PAGE 6/4x/Asset 81@4x.png",
      label: "Soil Moisture\nSensor",
    },
    {
      // Replace with: public/images/icons/temperature-sensor.png
      icon: "SMART FARM/PAGE 6/4x/Asset 171@4x.png",
      label: "Temperature\nSensor",
    },
    {
      // Replace with: public/images/icons/light-sensor.png
      icon: "SMART FARM/PAGE 6/4x/Asset 163@4x.png",
      label: "Light\nSensor",
    },
    {
      // Replace with: public/images/icons/motion-sensor.png
      icon: "SMART FARM/PAGE 6/4x/Asset 160@4x.png",
      label: "Motion\nSensor",
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">How Your Smart Farm Works</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plant Growth Cycle Card */}
          <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
            <h3 className="text-2xl font-bold text-green-900 mb-4">The Plant Growth Cycle</h3>
            <div >
              {/* Plant cycle diagram: public/images/diagrams/plant-growth-cycle.png */}
              <div className="relative w-full h-48">
                <Image
                  src="SMART FARM/PAGE 6/4x/growthcycle.jpeg"
                  alt="Plant Growth Cycle"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </Card>

          {/* Science Fun Facts Card */}
 <Card className="relative w-[650px] bg-[#EFC5FF]/90 backdrop-blur-sm rounded-[30px] p-8 border-[3px] border-[#D79EFF] shadow-md">
  <h3 className="text-[22px] font-bold text-[#5C2E91] mb-4">Science Fun Facts</h3>

  <div >
    <p className="text-[#4B2E83] text-[16px] font-semibold leading-relaxed mb-2">
      • Plants “breathe” in carbon dioxide & “breath” out oxygen.
    </p>
    <p className="text-[#4B2E83] text-[16px] font-semibold leading-relaxed mb-2">
      • A single corn plant can use 200 liters of water in one season.
    </p>
   <p className="text-[#4B2E83] text-[16px] font-semibold leading-relaxed mb-2">
      • Healthy soil contains billions of living organisms.
    </p>
  </div>
</Card>

        </div>

        {/* Sensors Card */}
        <Card className="w-1/2 bg-blue-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
          <h3 className="text-2xl font-bold text-blue-900 mb-4">How the Sensors Work</h3>
          <div className="bg-white/80 rounded-2xl p-8">
            <div className="grid grid-cols-4 gap-6">
              {sensors.map((sensor, index) => (
                <div key={index} className="text-center">
                  <div className="relative w-48 h-48 mx-auto mb-3">
                    <Image src={sensor.icon || "/placeholder.svg"} alt={sensor.label} fill className="object-contain" />
                  </div>
                  
                </div>
              ))}
            </div>
          </div>
        </Card>
        <div className="absolute -bottom-12 right-0 w-146 h-176 pointer-events-none">
                    <Image 
                      src="SMART FARM/PAGE 6/4x/Asset 76@4x.png" 
                      alt="Farmer Robot" 
                      fill 
                      className="object-contain"
                    />
                  </div>
      </div>
    </DashboardLayout>
  )
}
