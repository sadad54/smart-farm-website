"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { useEspContext } from "@/components/EspProvider"
import { supabase } from "@/lib/supabase"
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

interface WateringRecord {
  id: number
  device_id: string
  duration_ms: number
  water_amount_ml: number
  plant_type: string
  efficiency_score: number
  created_at: string
}

interface WaterTankData {
  current_level_percent: number
  current_liters: number
  capacity_liters: number
  status: string
  last_refill: string
  estimated_days_remaining: number
}

export default function WaterPage() {
  const { sendCommand } = useEspContext()
  const [wateringHistory, setWateringHistory] = useState<WateringRecord[]>([])
  const [waterTankData, setWaterTankData] = useState<WaterTankData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch watering history
  const fetchWateringHistory = async () => {
    try {
      const response = await fetch('/api/watering?limit=5')
      const result = await response.json()
      if (result.data) {
        setWateringHistory(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch watering history:', error)
    }
  }

  // Fetch water tank data
  const fetchWaterTankData = async () => {
    try {
      const response = await fetch('/api/water-tank')
      const result = await response.json()
      setWaterTankData(result)
    } catch (error) {
      console.error('Failed to fetch water tank data:', error)
    }
  }

  // Handle watering command
  const handleWatering = async (command: string, plantType: string = 'crops') => {
    try {
      await sendCommand(command, 'water_page', { plant_type: plantType, water_amount_ml: 250 })
      
      // Log the watering event
      await fetch('/api/watering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: 'farm_001',
          duration_ms: 3000,
          water_amount_ml: 250,
          plant_type: plantType
        })
      })
      
      // Refresh data
      setTimeout(() => {
        fetchWateringHistory()
        fetchWaterTankData()
      }, 1000)
    } catch (error) {
      console.error('Failed to execute watering:', error)
    }
  }

  // Setup real-time subscriptions
  useEffect(() => {
    fetchWateringHistory()
    fetchWaterTankData()
    setLoading(false)

    // Real-time subscription for watering history
    const wateringSubscription = supabase
      .channel('watering_history_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'watering_history' },
        () => {
          fetchWateringHistory()
        }
      )
      .subscribe()

    // Real-time subscription for water level sensor data
    const sensorSubscription = supabase
      .channel('water_sensor_changes')
      .on('postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'sensor_readings',
          filter: 'metric=eq.water_level'
        },
        () => {
          fetchWaterTankData()
        }
      )
      .subscribe()

    return () => {
      wateringSubscription.unsubscribe()
      sensorSubscription.unsubscribe()
    }
  }, [])
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
              <div className="absolute bottom-[5px] left-[60px] w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => handleWatering('D', 'main_crops')}>
                <Image
                  src="/SMART FARM/PAGE 10/4x/Asset 138@4x.png"
                  alt="Water Crops Button"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="absolute bottom-[5px] left-[440px] w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => handleWatering('C', 'garden_plants')}>
                <Image
                  src="/SMART FARM/PAGE 10/4x/Asset 179@4x.png"
                  alt="Feed Plants Button"
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
              <h3 className={`${poppins.className} text-2xl font-bold text-blue-900 mb-4`}>Water Tank</h3>
              <div className="bg-gradient-to-b from-blue-100 to-blue-300 rounded-2xl p-8 relative overflow-hidden h-64">
                <div 
                  className={`absolute bottom-0 left-0 right-0 rounded-t-[50px] transition-all duration-1000 ${
                    waterTankData?.status === 'low' ? 'bg-red-500' : 
                    waterTankData?.status === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ height: `${waterTankData?.current_level_percent || 61}%` }}
                >
                  <svg className="absolute top-0 left-0 right-0" viewBox="0 0 1200 100" preserveAspectRatio="none">
                    <path
                      d="M0,50 Q150,20 300,50 T600,50 T900,50 T1200,50 L1200,100 L0,100 Z"
                      fill="white"
                      opacity="0.3"
                    />
                  </svg>
                </div>
                
                {/* Tank Info */}
                <div className="absolute top-4 left-4 text-blue-900">
                  <p className="text-sm font-semibold">Capacity: {waterTankData?.capacity_liters || 100}L</p>
                  <p className="text-xs opacity-75">Est. {waterTankData?.estimated_days_remaining || 6} days remaining</p>
                </div>
                
                {/* Level Display */}
                <div className="absolute bottom-8 right-8 text-blue-900 font-bold text-2xl">
                  {waterTankData?.current_level_percent || 61}% Full
                </div>
                
                {/* Current Liters */}
                <div className="absolute bottom-8 left-8 text-blue-900">
                  <p className="text-lg font-bold">{waterTankData?.current_liters || 61}L</p>
                  <p className="text-xs opacity-75">Current Volume</p>
                </div>
                
                {/* Status Indicator */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                  waterTankData?.status === 'low' ? 'bg-red-100 text-red-800' :
                  waterTankData?.status === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {waterTankData?.status?.toUpperCase() || 'GOOD'}
                </div>
              </div>
            </Card>

            {/* Watering History Card */}
            <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
              <h3 className={`${poppins.className} text-2xl font-bold text-green-900 mb-4`}>Watering History</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="bg-white/80 rounded-xl p-4 text-center">
                    <p className="text-gray-600">Loading history...</p>
                  </div>
                ) : wateringHistory.length === 0 ? (
                  <div className="bg-white/80 rounded-xl p-4 text-center">
                    <p className="text-gray-600">No watering history yet</p>
                  </div>
                ) : (
                  wateringHistory.map((record, index) => (
                    <div key={record.id} className="bg-white/80 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          Watered {record.plant_type.replace('_', ' ')}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            {record.water_amount_ml}ml
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">
                            {(record.duration_ms / 1000).toFixed(1)}s
                          </span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${record.efficiency_score}%` }} 
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {record.efficiency_score}% efficiency
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm text-gray-600">
                          {new Date(record.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <div className="relative w-16 h-16 mt-2">
                          <Image 
                            src="SMART FARM/PAGE 10/4x/Asset 134@4x.png" 
                            alt="Robot Avatar" 
                            fill 
                            className="object-contain" 
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
