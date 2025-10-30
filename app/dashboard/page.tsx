import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // you can adjust weights
});

export default function DashboardPage() {
  return (
    <DashboardLayout>
      
      <div className="space-y-6">
        <h2 className={`${poppins.className} text-2xl font-bold text-white`}>
  Device Status
</h2>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Plant Health Card */}
<Card className="bg-[#A8F0C6]/90 backdrop-blur-sm rounded-3xl p-5 border-4 border-green-400 shadow-lg scale-95">
  <h3 className={`${poppins.className} text-xl font-bold text-green-900 mb-3`}>
    Plant Health
  </h3>

  <div className="bg-white/90 rounded-2xl p-6 shadow-inner">
    <div className="grid grid-cols-3 gap-6 items-center">
      
      {/* 🌿 Plant Health label image */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative w-28 h-28 mb-2">
          <Image
            src="/SMART FARM/PAGE 4/4x/Asset 168@4x.png"
            alt="Plant Health Pot"
            fill
            className="object-contain"
          />
        </div>
        <p className={`${poppins.className} text-sm font-semibold text-gray-700`}>
          Plant Health
        </p>
      </div>

      {/* 🌱 Plant Progress Image as Container */}
      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="relative w-32 h-32">
          <Image
            src="/SMART FARM/PAGE 4/4x/Asset 48@4x.png"
            alt="Plant Pot Container"
            fill
            className="object-contain"
          />

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-green-200 rounded-full overflow-hidden border border-green-400 shadow-sm">
            <div
              className="h-full bg-green-400 rounded-full transition-all duration-500"
              style={{ width: "70%" }}
            />
          </div>

          <p className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-base font-extrabold text-green-900 drop-shadow-sm">
            70%
          </p>
        </div>
      </div>

      {/* 💧 Water Tank Image as Container */}
      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="relative w-32 h-32">
          <Image
            src="/SMART FARM/PAGE 4/4x/Asset 47@4x.png"
            alt="Water Tank Container"
            fill
            className="object-contain"
          />

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-blue-200 rounded-full overflow-hidden border border-blue-400 shadow-sm">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: "61%" }}
            />
          </div>

          <p className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-base font-extrabold text-blue-900 drop-shadow-sm">
            61%
          </p>
        </div>
      </div>

    </div>
  </div>
</Card>


{/* Badges Card */}
<Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-5 border-4 border-yellow-400 scale-95">
  <h3 className="text-xl font-bold text-orange-900 mb-2">Your Badges</h3>
  <p className="text-sm font-semibold text-orange-800 mb-4">Complete missions to earn badges!</p>
  <div className="flex gap- justify-start">
    {/* Trophy/Coins */}
    <div className="relative w-48 h-48">
      <Image src="SMART FARM/PAGE 4/4x/Asset 44@4x.png" alt="Trophy with Coins" fill className="object-contain" />
    </div>
    {/* Trophy */}
    <div className="relative w-48 h-48">
      <Image src="SMART FARM/PAGE 4/4x/Asset 43@4x.png" alt="Trophy" fill className="object-contain" />
    </div>
  </div>
</Card>
        </div>

      {/* Sensor Data */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl mr-auto ml-8">
  
  {/* Soil Moisture Card */}
  
    <div className="relative w-full h-36">
      <Image
        src="SMART FARM/PAGE 4/4x/Asset 56@4x.png"
        alt="Soil Moisture"
        fill
        className="object-cover"
      />
      
      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        {/* The icon is already in the background image, so we only need the value */}
        <p className="text-2xl font-bold mt-20">3748</p>
      </div>
    </div>
  

  {/* Light Level Card */}
  
    <div className="relative w-full h-36">
      <Image
        src="SMART FARM/PAGE 4/4x/Asset 55@4x.png"
        alt="Light Level"
        fill
        className="object-cover"
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <p className="text-2xl font-bold mt-20">850</p>
      </div>
    </div>
  

  {/* Temperature Card */}
  
    <div className="relative w-full h-36">
      <Image
        src="SMART FARM/PAGE 4/4x/Asset 54@4x.png"
        alt="Temperature"
        fill
        className="object-cover"
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <p className="text-2xl font-bold mt-20">21.6°c</p>
      </div>
    </div>
  

  {/* Humidity Card */}
  
    <div className="relative w-full h-36">
      <Image
        src="SMART FARM/PAGE 4/4x/Asset 53@4x.png"
        alt="Humidity"
        fill
        className="object-cover"
      />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <p className="text-2xl font-bold mt-20">65%</p>
      </div>
    </div>
  

</div>
        <div className="flex gap-4 justify-center">
          {/* Water Plant button: public/images/buttons/water-plant-button.png */}
          <div className="relative w-56 h-20 hover:scale-105 transition-transform cursor-pointer">
            <Image src="SMART FARM/PAGE 4/4x/Asset 59@4x.png" alt="Water Plant" fill className="object-contain" />
          </div>
          {/* Run Fan button: public/images/buttons/run-fan-button.png */}
          <div className="relative w-56 h-20 hover:scale-105 transition-transform cursor-pointer">
            <Image src="SMART FARM/PAGE 4/4x/Asset 58@4x.png" alt="Run Fan" fill className="object-contain" />
          </div>
          {/* Toggle Light button: public/images/buttons/toggle-light-button.png */}
          <div className="relative w-56 h-20 hover:scale-105 transition-transform cursor-pointer">
            <Image src="SMART FARM/PAGE 4/4x/Asset 57@4x.png" alt="Toggle Light" fill className="object-contain" />
          </div>
        </div>
          {/* Farmer Robot Asset - positioned in bottom-right corner */}
          <div className="absolute -bottom-12 right-0 w-146 h-176 pointer-events-none">
            <Image 
              src="SMART FARM/PAGE 4/4x/Asset 60@4x.png" 
              alt="Farmer Robot" 
              fill 
              className="object-contain"
            />
          </div>
      </div>
    </DashboardLayout>
  )
}
