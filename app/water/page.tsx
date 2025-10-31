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
  current_level_percent: number
  current_liters: number
  capacity_liters: number
  status: string
  last_refill: string
  estimated_days_remaining: number
}

interface WateringSchedule {
  id: number
  name: string
  plant_type: string
  water_amount_ml: number
  duration_ms: number
  schedule_type: 'once' | 'daily' | 'weekly' | 'custom'
  scheduled_time: string
  scheduled_days: number[] | null
  start_date: string
  end_date: string | null
  is_active: boolean
  next_execution: string | null
  execution_count: number
  created_at: string
}

export default function WaterPage() {
  const { sendCommand } = useEspContext()
  const [wateringHistory, setWateringHistory] = useState<WateringRecord[]>([])
  const [waterTankData, setWaterTankData] = useState<WaterTankData | null>(null)
  const [schedules, setSchedules] = useState<WateringSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<WateringSchedule | null>(null)
  
  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    plant_type: '',
    water_amount_ml: 250,
    duration_ms: 5000,
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

  // Fetch watering schedules
  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/watering-schedules')
      const result = await response.json()
      if (result.success) {
        setSchedules(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch schedules:', error)
    }
  }

  // Save schedule
  const saveSchedule = async () => {
    try {
      const method = editingSchedule ? 'PUT' : 'POST'
      const url = editingSchedule 
        ? `/api/watering-schedules?id=${editingSchedule.id}`
        : '/api/watering-schedules'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      })
      
      if (response.ok) {
        setShowScheduleModal(false)
        setEditingSchedule(null)
        resetForm()
        fetchSchedules()
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
    }
  }

  // Delete schedule
  const deleteSchedule = async (id: number) => {
    try {
      const response = await fetch(`/api/watering-schedules?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchSchedules()
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error)
    }
  }

  // Execute schedule manually
  const executeSchedule = async (id: number) => {
    try {
      await fetch('/api/watering-schedules/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_id: id })
      })
      
      // Refresh data
      fetchWateringHistory()
      fetchWaterTankData()
    } catch (error) {
      console.error('Failed to execute schedule:', error)
    }
  }

  // Reset form
  const resetForm = () => {
    setScheduleForm({
      name: '',
      plant_type: '',
      water_amount_ml: 250,
      duration_ms: 5000,
      schedule_type: 'daily',
      scheduled_time: '08:00',
      scheduled_days: [],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      is_active: true
    })
  }

  // Edit schedule
  const editSchedule = (schedule: WateringSchedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      name: schedule.name,
      plant_type: schedule.plant_type,
      water_amount_ml: schedule.water_amount_ml,
      duration_ms: schedule.duration_ms,
      schedule_type: schedule.schedule_type,
      scheduled_time: schedule.scheduled_time,
      scheduled_days: schedule.scheduled_days || [],
      start_date: schedule.start_date,
      end_date: schedule.end_date || '',
      is_active: schedule.is_active
    })
    setShowScheduleModal(true)
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
    fetchSchedules()
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Robot image and buttons */}
          <div className="w-full flex flex-col items-center">
            <div className="absolute bottom-[40px] w-176 h-200 pointer-events-none">
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
              <div className="absolute bottom-[5px] left-[440px] w-90 h-40 hover:scale-105 transition-transform cursor-pointer" onClick={() => setShowScheduleModal(true)}>
                <Image
                  src="/SMART FARM/PAGE 10/4x/Asset 179@4x.png"
                  alt="Schedule Watering Button"
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

            {/* Watering Schedules Card */}
            <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-green-400">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`${poppins.className} text-2xl font-bold text-green-900`}>Scheduled Watering</h3>
                <Button 
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  New Schedule
                </Button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {schedules.length === 0 ? (
                  <p className="text-green-700 text-center py-4">No schedules created yet</p>
                ) : (
                  schedules.map((schedule) => (
                    <div key={schedule.id} className="bg-white/70 rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-green-900">{schedule.name}</h4>
                            <Badge variant={schedule.is_active ? "default" : "secondary"}>
                              {schedule.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-green-700">
                            {schedule.plant_type} • {schedule.water_amount_ml}ml • {schedule.schedule_type}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-green-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {schedule.scheduled_time}
                            </span>
                            {schedule.next_execution && (
                              <span>Next: {new Date(schedule.next_execution).toLocaleDateString()}</span>
                            )}
                            <span>Runs: {schedule.execution_count}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => executeSchedule(schedule.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editSchedule(schedule)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteSchedule(schedule.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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

        {/* Schedule Modal */}
        <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? 'Edit' : 'Create'} Watering Schedule</DialogTitle>
              <DialogDescription>
                Set up automated watering schedules for your plants
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Schedule Name</Label>
                  <Input
                    id="name"
                    value={scheduleForm.name}
                    onChange={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
                    placeholder="e.g., Morning Tomatoes"
                  />
                </div>
                <div>
                  <Label htmlFor="plant_type">Plant Type</Label>
                  <Input
                    id="plant_type"
                    value={scheduleForm.plant_type}
                    onChange={(e) => setScheduleForm({...scheduleForm, plant_type: e.target.value})}
                    placeholder="e.g., Tomatoes, Lettuce"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="water_amount">Water Amount (ml)</Label>
                  <Input
                    id="water_amount"
                    type="number"
                    value={scheduleForm.water_amount_ml}
                    onChange={(e) => setScheduleForm({...scheduleForm, water_amount_ml: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (ms)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={scheduleForm.duration_ms}
                    onChange={(e) => setScheduleForm({...scheduleForm, duration_ms: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule_type">Schedule Type</Label>
                  <Select 
                    value={scheduleForm.schedule_type} 
                    onValueChange={(value: 'once' | 'daily' | 'weekly' | 'custom') => 
                      setScheduleForm({...scheduleForm, schedule_type: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One Time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="custom">Custom Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="time">Scheduled Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduleForm.scheduled_time}
                    onChange={(e) => setScheduleForm({...scheduleForm, scheduled_time: e.target.value})}
                  />
                </div>
              </div>

              {(scheduleForm.schedule_type === 'weekly' || scheduleForm.schedule_type === 'custom') && (
                <div>
                  <Label>Days of Week</Label>
                  <div className="flex gap-2 mt-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}`}
                          checked={scheduleForm.scheduled_days.includes(index)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setScheduleForm({
                                ...scheduleForm,
                                scheduled_days: [...scheduleForm.scheduled_days, index].sort()
                              })
                            } else {
                              setScheduleForm({
                                ...scheduleForm,
                                scheduled_days: scheduleForm.scheduled_days.filter(d => d !== index)
                              })
                            }
                          }}
                        />
                        <Label htmlFor={`day-${index}`} className="text-sm">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={scheduleForm.start_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm({...scheduleForm, end_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={scheduleForm.is_active}
                  onCheckedChange={(checked) => setScheduleForm({...scheduleForm, is_active: !!checked})}
                />
                <Label htmlFor="is_active">Active Schedule</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowScheduleModal(false)
                  setEditingSchedule(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button onClick={saveSchedule}>
                {editingSchedule ? 'Update' : 'Create'} Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
