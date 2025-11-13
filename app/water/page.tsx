"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useEspContext } from "@/components/EspProvider"
import { supabase } from "@/lib/supabase"
import { PredictiveWateringAssistant } from "@/components/PredictiveWateringAssistant"
import { useMQTTScheduling } from "@/hooks/useMQTTScheduling"
import { Poppins } from "next/font/google"
import { Calendar, Trash2, Edit, Play, Clock } from 'lucide-react'

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
  capacity_liters: number
  last_refill: string
  mqtt_connected: boolean
  data_source: string
  note?: string
}


export default function WaterPage() {
  const { sendCommand, state, connected } = useEspContext()
  const [wateringHistory, setWateringHistory] = useState<WateringRecord[]>([])
  const [waterTankData, setWaterTankData] = useState<WaterTankData | null>(null)

  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)


  // MQTT-based scheduling system
  const { schedules: mqttSchedules, addSchedule, removeSchedule } = useMQTTScheduling()
  
  // Timezone conversion helper functions
  const convertUtcToLocalTime = (utcTimeString: string) => {
    // Simple timezone fix: Subtract 8 hours from UTC to show local time
    const [hours, minutes] = utcTimeString.split(':').map(Number)
    const localHours = (hours - 8 + 24) % 24 // Add 24 to handle negative hours
    
    return `${localHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const convertUtcToLocalForForm = (utcTimeString: string) => {
    // Simple timezone fix: Subtract 8 hours from UTC for form editing
    const [hours, minutes] = utcTimeString.split(':').map(Number)
    const localHours = (hours - 8 + 24) % 24 // Add 24 to handle negative hours
    
    return `${localHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Schedule form state with smart defaults
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    plant_type: 'General', // Auto-default
    water_amount_ml: 250, // Auto-default
    duration_ms: 5000, // Auto-default  
    schedule_type: 'daily' as 'once' | 'daily' | 'weekly' | 'custom',
    scheduled_time: '08:00',
    scheduled_days: [] as number[],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true
  })



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

  // No need to fetch schedules from database - using MQTT schedules
  const loadMQTTSchedules = () => {
    // Schedules are automatically loaded by the useMQTTScheduling hook
    console.log('📋 MQTT schedules loaded:', mqttSchedules)
  }



  // Save MQTT schedule (simplified - no database)
  const saveSchedule = () => {
    // Basic validation
    if (!scheduleForm.name.trim()) {
      alert('Please enter a schedule name')
      return
    }

    try {
      setLoading(true)
      
      console.log(`📅 Creating MQTT schedule: ${scheduleForm.name} at ${scheduleForm.scheduled_time}`)
      
      // Add the schedule using MQTT scheduling
      addSchedule(
        scheduleForm.name.trim(),
        scheduleForm.scheduled_time, // Use local time directly
        scheduleForm.duration_ms || 5000
      )
      
      console.log(`✅ MQTT schedule created successfully!`)
      setShowScheduleModal(false)
      resetForm()
      
    } catch (error) {
      console.error('Error creating MQTT schedule:', error)
      alert('Failed to create schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }



  // Reset form with smart defaults
  const resetForm = () => {
    setScheduleForm({
      name: '',
      plant_type: 'General', // Auto-default to General
      water_amount_ml: 250, // Auto-default to 250ml
      duration_ms: 5000, // Auto-default to 5 seconds
      schedule_type: 'daily', // Default to daily
      scheduled_time: '08:00', // Default morning time
      scheduled_days: [],
      start_date: new Date().toISOString().split('T')[0], // Today's date
      end_date: '',
      is_active: true
    })
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
    loadMQTTSchedules()
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
        <h2 className="text-3xl font-bold text-white ml-265">Water</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: AI Watering Assistant and Robot */}
          <div className="w-full flex flex-col gap-6">
            {/* AI Watering Assistant Card */}
            <div className="mb-8">
              <PredictiveWateringAssistant />
            </div>
            
            {/* Robot image and buttons */}
            <div className="flex flex-col items-center relative">
              <div className="relative w-176 h-200 mb-6">
                <Image
                  src="/SMART FARM/PAGE 10/4x/Asset 136@4x.png"
                  alt="Robot Asset"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Buttons row under the robot image */}
              <div className="flex gap-8 justify-center">
                <div className="relative w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => handleWatering('D', 'main_crops')}>
                  <Image
                    src="/SMART FARM/PAGE 10/4x/Asset 138@4x.png"
                    alt="Water Crops Button"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="relative w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => setShowScheduleModal(true)}>
                  <Image
                    src="/SMART FARM/PAGE 10/4x/Asset 179@4x.png"
                    alt="Schedule Watering Button"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: stacked cards */}
          <div className="w-full flex flex-col gap-6">
            {/* Water Tank Card */}
            <Card className="bg-blue-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-blue-400">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${poppins.className} text-2xl font-bold text-blue-900`}>Water Tank</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
                    {connected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="bg-gradient-to-b from-blue-100 to-blue-300 rounded-2xl p-8 relative overflow-hidden h-64">
                <div 
                  className={`absolute bottom-0 left-0 right-0 rounded-t-[50px] transition-all duration-500 ${
                    (state.waterLevel ?? 0) < 20 ? 'bg-red-500' : 
                    (state.waterLevel ?? 0) < 50 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ height: `${Math.max(5, state.waterLevel ?? 0)}%` }}
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
                  <p className="text-xs opacity-75">Est. {Math.max(1, Math.floor((((state.waterLevel ?? 0) / 100) * (waterTankData?.capacity_liters || 100)) / 10))} days remaining</p>
                </div>
                
                {/* Level Display */}
                <div className="absolute bottom-8 right-8 text-blue-900 font-bold text-2xl">
                  {(state.waterLevel ?? 0).toFixed(1)}% Full
                </div>
                
                {/* Current Liters */}
                <div className="absolute bottom-8 left-8 text-blue-900">
                  <p className="text-lg font-bold">{(((state.waterLevel ?? 0) / 100) * (waterTankData?.capacity_liters || 100)).toFixed(1)}L</p>
                  <p className="text-xs opacity-75">Current Volume</p>
                </div>
                
                {/* Status Indicator */}
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                  (state.waterLevel ?? 0) < 20 ? 'bg-red-100 text-red-800' :
                  (state.waterLevel ?? 0) < 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {(state.waterLevel ?? 0) < 20 ? 'LOW' : (state.waterLevel ?? 0) < 50 ? 'MEDIUM' : 'FULL'}
                </div>

                {/* Low Level Warning */}
                {(state.waterLevel ?? 0) < 20 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-500/90 text-white px-4 py-2 rounded-xl animate-pulse font-bold">
                      ⚠️ LOW WATER LEVEL!
                    </div>
                  </div>
                )}
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

            {/* Watering Schedules Card */}
            <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className={`${poppins.className} text-2xl font-bold text-green-900`}>Scheduled Watering</h3>
                  <div className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                    <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                    Auto-Scheduler Active
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleWatering('D', 'quick_water')}
                    className="bg-blue-600 hover:bg-blue-700"
                    size="sm"
                    disabled={loading}
                  >
                    💧 Water Now
                  </Button>
                  <Button 
                    onClick={() => setShowScheduleModal(true)}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {mqttSchedules.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-green-700 mb-3">No schedules created yet</p>
                    <p className="text-sm text-green-600">Click "Schedule" to create your first automated watering schedule</p>
                  </div>
                ) : (
                  mqttSchedules.map((schedule) => (
                    <div key={schedule.id} className="bg-white/70 rounded-xl p-4 hover:bg-white/80 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-green-900">{schedule.name}</h4>
                            <Badge 
                              variant={schedule.active ? "default" : "secondary"}
                              className={schedule.active ? "bg-green-500" : "bg-gray-400"}
                            >
                              {schedule.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-green-700 mb-1">
                            <span className="font-medium">MQTT Schedule</span> • 
                            <span className="mx-1">{(schedule.waterDuration / 1000).toFixed(1)}s duration</span>
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-green-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {schedule.time}
                              <span className="text-xs text-green-500 ml-1">(Local)</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleWatering('D', 'scheduled')}
                            className="h-8 w-8 p-0 hover:bg-green-100"
                            title="Run now"
                            disabled={loading}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeSchedule(schedule.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                            title="Delete"
                            disabled={loading}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Super Simple Schedule Modal */}
        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Watering</DialogTitle>
              <DialogDescription>
                Just pick a name, date and time - we'll handle the rest!
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Schedule Name */}
              <div>
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
                  placeholder="e.g., Morning Garden Water"
                  className="mt-1"
                />
              </div>

              {/* Date (for one-time) or Frequency */}
              <div>
                <Label>When to water?</Label>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="once"
                      name="frequency"
                      checked={scheduleForm.schedule_type === 'once'}
                      onChange={() => setScheduleForm({...scheduleForm, schedule_type: 'once', scheduled_days: []})}
                      className="text-green-600"
                    />
                    <Label htmlFor="once" className="font-normal cursor-pointer">One time only</Label>
                  </div>
                  
                  {scheduleForm.schedule_type === 'once' && (
                    <div className="ml-6">
                      <Label htmlFor="date" className="text-sm text-gray-600">Pick date:</Label>
                      <Input
                        id="date"
                        type="date"
                        value={scheduleForm.start_date}
                        onChange={(e) => setScheduleForm({...scheduleForm, start_date: e.target.value})}
                        className="mt-1"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="daily"
                      name="frequency"
                      checked={scheduleForm.schedule_type === 'daily'}
                      onChange={() => setScheduleForm({...scheduleForm, schedule_type: 'daily', scheduled_days: []})}
                      className="text-green-600"
                    />
                    <Label htmlFor="daily" className="font-normal cursor-pointer">Every day</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="weekly"
                      name="frequency"
                      checked={scheduleForm.schedule_type === 'weekly'}
                      onChange={() => setScheduleForm({...scheduleForm, schedule_type: 'weekly', scheduled_days: [1, 3, 5]})} // Default: Mon, Wed, Fri
                      className="text-green-600"
                    />
                    <Label htmlFor="weekly" className="font-normal cursor-pointer">Specific days of the week</Label>
                  </div>

                  {scheduleForm.schedule_type === 'weekly' && (
                    <div className="ml-6">
                      <Label className="text-sm text-gray-600">Select days:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <Button
                            key={day}
                            type="button"
                            variant={scheduleForm.scheduled_days.includes(index) ? "default" : "outline"}
                            size="sm"
                            className="h-8 w-12 text-xs"
                            onClick={() => {
                              const days = scheduleForm.scheduled_days.includes(index)
                                ? scheduleForm.scheduled_days.filter(d => d !== index)
                                : [...scheduleForm.scheduled_days, index].sort()
                              setScheduleForm({...scheduleForm, scheduled_days: days})
                            }}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Time */}
              <div>
                <Label htmlFor="time">What time? <span className="text-sm text-gray-500">(Your local time)</span></Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduleForm.scheduled_time}
                  onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
              </div>

              {/* Auto-configured notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-800">
                  <div className="font-medium mb-2">✅ We'll automatically configure:</div>
                  <ul className="text-xs space-y-1 ml-4">
                    <li>• Water amount: 250ml (perfect for most plants)</li>
                    <li>• Plant type: General (suitable for all plants)</li>
                    <li>• Duration: 5 seconds (optimal watering time)</li>
                    <li>• Start immediately when you save</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowScheduleModal(false)
                  resetForm()
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveSchedule}
                disabled={loading || !scheduleForm.name.trim() || 
                  (scheduleForm.schedule_type === 'weekly' && scheduleForm.scheduled_days.length === 0)}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading 
                  ? 'Creating...' 
                  : '💧 Create Schedule'
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
