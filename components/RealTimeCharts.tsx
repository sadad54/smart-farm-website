"use client"

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'

type SensorData = {
  id: number
  device_id: string
  temperature: number
  humidity: number
  soil_moisture: number
  light_level: number
  water_level: number
  created_at: string
}

type ChartDataPoint = {
  time: string
  temperature: number
  humidity: number
  soilMoisture: number
}

export function RealTimeCharts() {
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial data fetch
    fetchSensorData()

    // Set up real-time subscription
    const subscription = supabase
      .channel('sensor_data')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'sensor_data' 
      }, (payload) => {
        const newData = payload.new as SensorData
        const newPoint: ChartDataPoint = {
          time: new Date(newData.created_at).toLocaleTimeString(),
          temperature: newData.temperature || 0,
          humidity: newData.humidity || 0,
          soilMoisture: newData.soil_moisture || 0
        }
        
        setData(prev => [...prev.slice(-19), newPoint]) // Keep last 20 points
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchSensorData = async () => {
    try {
      const { data: sensorData, error } = await supabase
        .from('sensor_data')
        .select('*')
        .eq('device_id', 'farm_001')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const chartData: ChartDataPoint[] = (sensorData || []).reverse().map(item => ({
        time: new Date(item.created_at).toLocaleTimeString(),
        temperature: item.temperature || 0,
        humidity: item.humidity || 0,
        soilMoisture: item.soil_moisture || 0
      }))

      setData(chartData)
    } catch (error) {
      console.error('Error fetching sensor data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Temperature Chart */}
      <div className="bg-red-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-red-800 mb-2">Temperature (°C)</h4>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="temperature" 
              stroke="#dc2626" 
              strokeWidth={2}
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Humidity Chart */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">Humidity (%)</h4>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="humidity" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Soil Moisture Chart */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="text-sm font-semibold text-green-800 mb-2">Soil Moisture (%)</h4>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#bbf7d0" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="soilMoisture" 
              stroke="#16a34a" 
              strokeWidth={2}
              dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}