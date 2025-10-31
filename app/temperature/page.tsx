"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export default function TemperaturePage() {
  const { state, sendCommand } = useEspContext()
  const [autoFanEnabled, setAutoFanEnabled] = useState(true)
  const [temperatureThreshold, setTemperatureThreshold] = useState(28)
  const [fanRunning, setFanRunning] = useState(false)
  const [lastAutoActivation, setLastAutoActivation] = useState<Date | null>(null)

  // Get current temperature from ESP state
  const currentTemp = state.temperature || 25

  // Automatic fan control logic
  useEffect(() => {
    if (autoFanEnabled && currentTemp > temperatureThreshold) {
      if (!fanRunning) {
        handleAutoFanActivation()
      }
    } else if (autoFanEnabled && currentTemp <= temperatureThreshold - 2) {
      // Turn off fan when temperature drops 2 degrees below threshold (hysteresis)
      if (fanRunning) {
        setFanRunning(false)
      }
    }
  }, [currentTemp, temperatureThreshold, autoFanEnabled, fanRunning])

  const handleAutoFanActivation = async () => {
    try {
      await sendCommand('B', 'temperature_page', { button_type: 'auto_fan_activation', threshold: temperatureThreshold, current_temp: currentTemp }) // Send fan command to ESP
      setFanRunning(true)
      setLastAutoActivation(new Date())
    } catch (error) {
      console.error('Failed to activate auto fan:', error)
    }
  }

  const handleManualFanToggle = async () => {
    try {
      await sendCommand('B', 'temperature_page', { button_type: 'manual_fan_toggle', auto_mode: autoFanEnabled }) // Send fan command to ESP
      setFanRunning(!fanRunning)
    } catch (error) {
      console.error('Failed to toggle fan manually:', error)
    }
  }
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Temperature</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Temperature Card */}
          <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-orange-900 mb-4`}>Current Temperature</h3>
            <div className="bg-white/80 rounded-2xl p-8 flex items-center justify-center gap-8">
              {/* Thermometer icon: public/images/icons/thermometer.png */}
              <div className="relative w-16 h-16">
                <Image src="SMART FARM/PAGE 9/4x/Asset 119@4x.png" alt="Thermometer" fill className="object-contain" />
              </div>
              <div>
                <p className={`text-5xl font-black text-orange-600 ${currentTemp > temperatureThreshold ? 'animate-pulse text-red-600' : ''}`}>
                  {currentTemp}°c
                </p>
                <p className={`text-2xl font-bold ${
                  currentTemp > temperatureThreshold ? 'text-red-600' : 
                  currentTemp < 18 ? 'text-blue-600' : 'text-orange-500'
                }`}>
                  {currentTemp > temperatureThreshold ? 'Too Hot!' : 
                   currentTemp < 18 ? 'Too Cold!' : 'Perfect!'}
                </p>
              </div>
              {/* Sun icon: public/images/icons/sun.png */}
              <div className="relative w-16 h-16">
                <Image src="SMART FARM/PAGE 9/4x/Asset 166@4x.png" alt="Sun" fill className="object-contain" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-gray-700">Humidity : {state.humidity || 65}% (Perfect)</p>
            </div>
          </Card>

          {/* Temperature Control Card */}
          <Card className="bg-blue-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>Temperature Control</h3>
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
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-gray-800 transition-all duration-500" 
                  style={{ left: `${Math.min(Math.max(((currentTemp - 10) / 30) * 100, 5), 95)}%` }}
                />
              </div>
              <p className="text-center mt-4 text-lg font-semibold text-blue-900">Ideal Range : 18°c-28°c</p>
            </div>
          </Card>

          {/* Auto Fan Control Card */}
          <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-green-900 mb-4`}>Auto Fan Control</h3>
            <div className="bg-white/80 rounded-2xl p-6 space-y-4">
              {/* Auto Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Auto Mode:</span>
                <button
                  onClick={() => setAutoFanEnabled(!autoFanEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoFanEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoFanEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Temperature Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">Threshold:</span>
                  <span className="font-bold text-lg text-orange-600">{temperatureThreshold}°C</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="35"
                  value={temperatureThreshold}
                  onChange={(e) => setTemperatureThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer slider"
                  disabled={!autoFanEnabled}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>20°C</span>
                  <span>35°C</span>
                </div>
              </div>

              {/* Fan Status */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">Fan Status:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    fanRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className={`font-semibold ${
                    fanRunning ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {fanRunning ? 'RUNNING' : 'OFF'}
                  </span>
                </div>
              </div>

              {/* Last Auto Activation */}
              {lastAutoActivation && autoFanEnabled && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-800">Last Auto Run:</span>
                  <span className="text-sm text-gray-600">
                    {lastAutoActivation.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Auto Status Indicator */}
              <div className={`p-3 rounded-lg text-center font-semibold ${
                !autoFanEnabled ? 'bg-gray-100 text-gray-600' :
                currentTemp > temperatureThreshold ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {!autoFanEnabled ? 'AUTO MODE DISABLED' :
                 currentTemp > temperatureThreshold ? `COOLING ACTIVE (${currentTemp}°C > ${temperatureThreshold}°C)` :
                 `MONITORING (${currentTemp}°C ≤ ${temperatureThreshold}°C)`}
              </div>
            </div>
          </Card>
        </div>

        {/* Run Fan button: public/images/buttons/run-fan-button.png */}
        <div className="absolute bottom-[-200px] right-10 ">
          <div className="relative w-84 h-30 hover:scale-105 transition-transform cursor-pointer" onClick={handleManualFanToggle}>
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
