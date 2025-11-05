"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { useEspContext } from "@/components/EspProvider"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // you can adjust weights
});

export default function DashboardPage() {
  const { state, connected, sendCommand } = useEspContext()
  const lastHealthLogRef = useRef<number>(0)
  
  // Device status states
  const [lightOn, setLightOn] = useState(false)
  const [fanOn, setFanOn] = useState(false) 
  const [waterOn, setWaterOn] = useState(false)

  // Status indicator component
  const StatusIndicator = ({ isOn, label }: { isOn: boolean; label: string }) => (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
        isOn ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-red-400'
      }`}></div>
      <span className={`text-xs font-medium ${
        isOn ? 'text-green-100' : 'text-red-100'
      }`}>
        {label} {isOn ? 'ON' : 'OFF'}
      </span>
    </div>
  )

  // Enhanced command functions with state management
  const handleLightCommand = async () => {
    try {
      await sendCommand('A', 'dashboard', { button_type: 'toggle_light' })
      setLightOn(!lightOn)
      console.log(`💡 Light turned ${!lightOn ? 'ON' : 'OFF'}`)
    } catch (error) {
      console.error('Failed to toggle light:', error)
    }
  }

  const handleFanCommand = async () => {
    try {
      await sendCommand('B', 'dashboard', { button_type: 'run_fan' })
      setFanOn(true)
      console.log('🌪️ Fan turned ON')
      // Auto turn off after 30 seconds
      setTimeout(() => {
        setFanOn(false)
        console.log('🌪️ Fan turned OFF (auto)')
      }, 30000)
    } catch (error) {
      console.error('Failed to run fan:', error)
    }
  }

  const handleWaterCommand = async () => {
    try {
      await sendCommand('D', 'dashboard', { button_type: 'water_plant' })
      setWaterOn(true)
      console.log('💧 Water pump turned ON')
      // Auto turn off after 3 seconds (typical watering duration)
      setTimeout(() => {
        setWaterOn(false)
        console.log('💧 Water pump turned OFF (auto)')
      }, 3000)
    } catch (error) {
      console.error('Failed to water plant:', error)
    }
  }

  // Function to round values to nearest 0.5
  const roundToHalf = (value: number): string => {
    return (Math.round(value * 2) / 2).toFixed(1)
  }

  // Function to display sensor value with error handling
  const displaySensorValue = (value: number | null | undefined, unit: string, fallback: string = "--"): string => {
    if (value === undefined || value === null || value === -999) {
      return fallback
    }
    return `${roundToHalf(value)}${unit}`
  }

  // Calculate plant health percentage based on multiple factors
  const calculatePlantHealth = (): number => {
    const soil = state.soilHumidity || 0
    const temp = state.temperature || 0
    const humidity = state.humidity || 0
    
    // Optimal ranges for plant health
    const optimalSoil = { min: 40, max: 80 }
    const optimalTemp = { min: 20, max: 30 }
    const optimalHumidity = { min: 50, max: 80 }
    
    // Calculate health scores (0-100 each)
    const soilScore = soil >= optimalSoil.min && soil <= optimalSoil.max ? 100 : 
                     Math.max(0, 100 - Math.abs(soil - ((optimalSoil.min + optimalSoil.max) / 2)) * 2)
    
    const tempScore = temp >= optimalTemp.min && temp <= optimalTemp.max ? 100 : 
                     Math.max(0, 100 - Math.abs(temp - ((optimalTemp.min + optimalTemp.max) / 2)) * 4)
    
    const humidityScore = humidity >= optimalHumidity.min && humidity <= optimalHumidity.max ? 100 : 
                         Math.max(0, 100 - Math.abs(humidity - ((optimalHumidity.min + optimalHumidity.max) / 2)) * 2)
    
    // Weighted average (soil moisture is most important)
    const plantHealth = Math.round((soilScore * 0.5) + (tempScore * 0.3) + (humidityScore * 0.2))
    return Math.max(0, Math.min(100, plantHealth))
  }

  // Log plant health data to database (throttled to once per minute)
  const logPlantHealthToDatabase = async (healthPercentage: number) => {
    const now = Date.now()
    if (now - lastHealthLogRef.current < 60000) return // Throttle to 1 minute
    lastHealthLogRef.current = now

    try {
      const soil = state.soilHumidity || 0
      const temp = state.temperature || 0
      const humidity = state.humidity || 0
      
      // Calculate individual scores for logging
      const optimalSoil = { min: 40, max: 80 }
      const optimalTemp = { min: 20, max: 30 }
      const optimalHumidity = { min: 50, max: 80 }
      
      const soilScore = soil >= optimalSoil.min && soil <= optimalSoil.max ? 100 : 
                       Math.max(0, 100 - Math.abs(soil - ((optimalSoil.min + optimalSoil.max) / 2)) * 2)
      const tempScore = temp >= optimalTemp.min && temp <= optimalTemp.max ? 100 : 
                       Math.max(0, 100 - Math.abs(temp - ((optimalTemp.min + optimalTemp.max) / 2)) * 4)
      const humidityScore = humidity >= optimalHumidity.min && humidity <= optimalHumidity.max ? 100 : 
                           Math.max(0, 100 - Math.abs(humidity - ((optimalHumidity.min + optimalHumidity.max) / 2)) * 2)

      await fetch('/api/plant-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'farm_001',
          plant_health_percentage: healthPercentage,
          soil_score: Math.round(soilScore),
          temperature_score: Math.round(tempScore),
          humidity_score: Math.round(humidityScore),
          soil_moisture: soil,
          temperature: temp,
          humidity: humidity
        })
      })
      console.log(`📊 Plant health logged: ${healthPercentage}%`)
    } catch (error) {
      console.error('Failed to log plant health data:', error)
    }
  }

  // Get health status color for visual indicators
  const getHealthStatusColor = (percentage: number): string => {
    if (percentage >= 90) return "text-green-600 bg-green-100"
    if (percentage >= 75) return "text-green-500 bg-green-50" 
    if (percentage >= 60) return "text-yellow-600 bg-yellow-100"
    if (percentage >= 40) return "text-orange-600 bg-orange-100"
    return "text-red-600 bg-red-100"
  }

  // Get health progress bar color
  const getHealthBarColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-green-500"
    if (percentage >= 75) return "bg-green-400"
    if (percentage >= 60) return "bg-yellow-400" 
    if (percentage >= 40) return "bg-orange-400"
    return "bg-red-400"
  }

  // Get actual water level percentage
  const getWaterLevelPercentage = (): number => {
    const waterLevel = state.waterLevel || 0
    return Math.max(0, Math.min(100, Math.round(waterLevel)))
  }

  useEffect(() => {
    // Log plant health data when sensor data changes (throttled internally)
    if (connected && state.soilHumidity !== undefined && state.temperature !== undefined && state.humidity !== undefined) {
      const healthPercentage = calculatePlantHealth()
      if (healthPercentage > 0) { // Only log if we have valid data
        logPlantHealthToDatabase(healthPercentage)
      }
    }
  }, [state.soilHumidity, state.temperature, state.humidity, connected])
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

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300 shadow-sm">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getHealthBarColor(calculatePlantHealth())}`}
              style={{ width: `${calculatePlantHealth()}%` }}
            />
          </div>

          <p className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 text-base font-extrabold drop-shadow-sm px-1 py-0.5 rounded-sm ${getHealthStatusColor(calculatePlantHealth())}`}>
            {calculatePlantHealth()}%
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

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-20 h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-300 shadow-sm">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                getWaterLevelPercentage() > 60 ? 'bg-blue-500' :
                getWaterLevelPercentage() > 30 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${getWaterLevelPercentage()}%` }}
            />
          </div>

          <p className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 text-base font-extrabold drop-shadow-sm px-1 py-0.5 rounded-sm ${
            getWaterLevelPercentage() > 60 ? 'text-blue-600 bg-blue-100' :
            getWaterLevelPercentage() > 30 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'
          }`}>
            {getWaterLevelPercentage()}%
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
  <p className="text-2xl font-bold mt-20">{displaySensorValue(state.soilHumidity, "%")}</p>
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
  <p className="text-2xl font-bold mt-20">{displaySensorValue(state.light, "%")}</p>
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
  <p className="text-2xl font-bold mt-20">{displaySensorValue(state.temperature, "°c")}</p>
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
  <p className="text-2xl font-bold mt-20">{displaySensorValue(state.humidity, "%")}</p>
      </div>
    </div>
  

</div>
        {/* Device Status Indicators */}
        <div className="flex gap-6 justify-center mb-6">
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              lightOn ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-red-400'
            }`}></div>
            <span className={`text-base font-medium ${
              lightOn ? 'text-green-100' : 'text-red-100'
            }`}>
              Light {lightOn ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              fanOn ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-red-400'
            }`}></div>
            <span className={`text-base font-medium ${
              fanOn ? 'text-green-100' : 'text-red-100'
            }`}>
              Fan {fanOn ? 'ON' : 'OFF'}
            </span>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm">
            <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
              waterOn ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse' : 'bg-red-400'
            }`}></div>
            <span className={`text-base font-medium ${
              waterOn ? 'text-green-100' : 'text-red-100'
            }`}>
              Water {waterOn ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          {/* Water Plant button with enhanced styling */}
          <div className={`relative w-56 h-20 hover:scale-105 transition-all duration-300 cursor-pointer ${
            waterOn ? 'filter brightness-125 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]' : ''
          }`}>
            <Image 
              src="SMART FARM/PAGE 4/4x/Asset 59@4x.png" 
              alt="Water Plant" 
              fill 
              className="object-contain" 
              onClick={handleWaterCommand} 
            />
            {waterOn && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
            )}
          </div>
          
          {/* Run Fan button with enhanced styling */}
          <div className={`relative w-56 h-20 hover:scale-105 transition-all duration-300 cursor-pointer ${
            fanOn ? 'filter brightness-125 drop-shadow-[0_0_15px_rgba(34,197,94,0.6)]' : ''
          }`}>
            <Image 
              src="SMART FARM/PAGE 4/4x/Asset 58@4x.png" 
              alt="Run Fan" 
              fill 
              className="object-contain" 
              onClick={handleFanCommand} 
            />
            {fanOn && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
            )}
          </div>
          
          {/* Toggle Light button with enhanced styling */}
          <div className={`relative w-56 h-20 hover:scale-105 transition-all duration-300 cursor-pointer ${
            lightOn ? 'filter brightness-125 drop-shadow-[0_0_15px_rgba(255,255,0,0.6)]' : ''
          }`}>
            <Image 
              src="SMART FARM/PAGE 4/4x/Asset 57@4x.png" 
              alt="Toggle Light" 
              fill 
              className="object-contain" 
              onClick={handleLightCommand} 
            />
            {lightOn && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,0,0.8)]"></div>
            )}
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
