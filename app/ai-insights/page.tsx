"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { useEspContext } from "@/components/EspProvider"
import { ChevronLeft, ChevronRight, Brain, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type SensorReading = {
  id: number
  device_id: string
  metric: string
  value: number
  timestamp: string
}

type ChartDataPoint = {
  time: string
  temperature?: number
  humidity?: number
  soil_moisture?: number
  light_level?: number
  water_level?: number
  [key: string]: string | number | undefined
}

export default function AIInsightsPage() {
  const { state, connected } = useEspContext()
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [currentChartIndex, setCurrentChartIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [aiInsights, setAiInsights] = useState({
    status: 'good' as 'excellent' | 'good' | 'fair' | 'poor' | 'critical',
    score: 75,
    recommendations: [] as string[],
    trends: [] as string[]
  })

  const badges = [
    {
      label: "Data Expert",
      image: "SMART FARM/PAGE 5/4x/Asset 154@4x.png",
    },
    {
      label: "Plant Whisperer",
      image: "SMART FARM/PAGE 5/4x/Asset 156@4x.png",
    },
    {
      label: "Growth Master",
      image: "SMART FARM/PAGE 5/4x/Asset 153@4x.png",
    },
    {
      label: "Green Thumb",
      image: "SMART FARM/PAGE 5/4x/Asset 155@4x.png",
    },
  ]

  const chartConfigs = [
    {
      title: "Temperature",
      dataKey: "temperature",
      unit: "°C",
      color: "#ef4444",
      bgColor: "bg-red-50",
      textColor: "text-red-800",
      domain: ['dataMin - 2', 'dataMax + 2'] as [string, string],
    },
    {
      title: "Humidity", 
      dataKey: "humidity",
      unit: "%",
      color: "#3b82f6",
      bgColor: "bg-blue-50",
      textColor: "text-blue-800",
      domain: [0, 100] as [number, number],
    },
    {
      title: "Soil Moisture",
      dataKey: "soil_moisture", 
      unit: "%",
      color: "#22c55e",
      bgColor: "bg-green-50",
      textColor: "text-green-800",
      domain: [0, 100] as [number, number],
    },
    {
      title: "Light Level",
      dataKey: "light_level",
      unit: "%", 
      color: "#f59e0b",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-800",
      domain: [0, 100] as [number, number],
    },
    {
      title: "Water Level",
      dataKey: "water_level",
      unit: "%",
      color: "#06b6d4", 
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-800",
      domain: [0, 100] as [number, number],
    }
  ]

  // Fetch historical sensor data
  useEffect(() => {
    fetchSensorData()
    const interval = setInterval(fetchSensorData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Update AI insights when data changes
  useEffect(() => {
    if (chartData.length > 0) {
      updateAiInsights()
    }
  }, [chartData, state])

  const fetchSensorData = async () => {
    try {
      const { data: sensorData, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('device_id', 'farm_001')
        .order('timestamp', { ascending: false })
        .limit(50)

      if (error) throw error

      // Group data by timestamp and combine metrics
      const groupedData: { [key: string]: ChartDataPoint } = {}
      
      sensorData?.forEach(reading => {
        const time = new Date(reading.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        
        if (!groupedData[time]) {
          groupedData[time] = { time }
        }
        
        groupedData[time][reading.metric] = reading.value
      })

      const chartPoints = Object.values(groupedData).reverse().slice(-20)
      setChartData(chartPoints)
    } catch (error) {
      console.error('Error fetching sensor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAiInsights = () => {
    const temp = state.temperature || 0
    const humidity = state.humidity || 0
    const soil = state.soilHumidity || 0
    
    // Calculate plant health score
    const tempScore = temp >= 20 && temp <= 30 ? 100 : Math.max(0, 100 - Math.abs(temp - 25) * 4)
    const humidityScore = humidity >= 50 && humidity <= 80 ? 100 : Math.max(0, 100 - Math.abs(humidity - 65) * 2)
    const soilScore = soil >= 40 && soil <= 80 ? 100 : Math.max(0, 100 - Math.abs(soil - 60) * 2)
    
    const overallScore = Math.round((tempScore * 0.3) + (humidityScore * 0.2) + (soilScore * 0.5))
    
    // Determine status
    let status: typeof aiInsights.status = 'critical'
    if (overallScore >= 90) status = 'excellent'
    else if (overallScore >= 75) status = 'good' 
    else if (overallScore >= 60) status = 'fair'
    else if (overallScore >= 40) status = 'poor'
    
    // Generate recommendations
    const recommendations = []
    const trends = []
    
    if (temp < 20) {
      recommendations.push("🌡️ Temperature is low - consider adding heating")
      trends.push("Temperature trending below optimal range")
    } else if (temp > 30) {
      recommendations.push("🌡️ Temperature is high - increase ventilation")
      trends.push("Temperature trending above optimal range")
    } else {
      trends.push("Temperature is optimal ✅")
    }
    
    if (humidity < 50) {
      recommendations.push("💨 Humidity is low - consider misting")
      trends.push("Air humidity needs improvement")
    } else if (humidity > 80) {
      recommendations.push("💨 Humidity is high - improve air circulation")
      trends.push("High humidity detected")
    } else {
      trends.push("Humidity levels are good ✅")
    }
    
    if (soil < 40) {
      recommendations.push("🚰 Soil is dry - increase watering")
      trends.push("Soil moisture below optimal range")
    } else if (soil > 80) {
      recommendations.push("💧 Soil is too wet - reduce watering")
      trends.push("Soil moisture above optimal range")  
    } else if (soil > 0) {
      trends.push("Soil moisture is optimal ✅")
    } else {
      recommendations.push("🔧 Check soil sensor connection")
      trends.push("Soil sensor needs attention")
    }
    
    if (recommendations.length === 0) {
      recommendations.push("🎉 All conditions are optimal! Your plants are thriving!")
    }
    
    setAiInsights({ status, score: overallScore, recommendations, trends })
  }

  const nextChart = () => {
    setCurrentChartIndex((prev) => (prev + 1) % chartConfigs.length)
  }

  const prevChart = () => {
    setCurrentChartIndex((prev) => (prev - 1 + chartConfigs.length) % chartConfigs.length)
  }

  const currentChart = chartConfigs[currentChartIndex]

  return (
    <DashboardLayout>
      <div className="relative min-h-screen">
        <div className="space-y-6 pb-96">
          <h2 className={`${poppins.className} text-3xl font-bold text-white`}>
            AI Insights
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Swipeable Charts Card */}
            <Card className="bg-pink-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-pink-400 h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`${poppins.className} text-2xl font-bold text-purple-900`}>
                  Plant Health Analytics
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevChart}
                    className="p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
                    disabled={loading}
                  >
                    <ChevronLeft className="w-5 h-5 text-purple-800" />
                  </button>
                  <span className="text-sm text-purple-700 font-medium px-2">
                    {currentChartIndex + 1} / {chartConfigs.length}
                  </span>
                  <button
                    onClick={nextChart}
                    className="p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
                    disabled={loading}
                  >
                    <ChevronRight className="w-5 h-5 text-purple-800" />
                  </button>
                </div>
              </div>

              <div className="bg-white/90 rounded-2xl p-6 h-[420px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <div className={`h-full ${currentChart.bgColor} rounded-xl p-4`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: currentChart.color }}
                      />
                      <h4 className={`text-xl font-bold ${currentChart.textColor}`}>
                        {currentChart.title} ({currentChart.unit})
                      </h4>
                      <div className="ml-auto flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs text-gray-600">
                          {connected ? 'Live' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            interval={'preserveStartEnd'}
                          />
                          <YAxis 
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            domain={currentChart.domain}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey={currentChart.dataKey}
                            stroke={currentChart.color}
                            strokeWidth={3}
                            dot={{ fill: currentChart.color, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: currentChart.color, strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* AI Analytics Card */}
            <Card className="bg-gradient-to-br from-blue-100 to-indigo-200 backdrop-blur-sm rounded-3xl p-6 border-4 border-indigo-400 h-[500px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-600 rounded-full">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className={`${poppins.className} text-2xl font-bold text-indigo-900`}>
                  AI Analytics
                </h3>
              </div>

              <div className="bg-white/90 rounded-2xl p-6 h-[420px] overflow-y-auto">
                {/* Plant Health Score */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold text-gray-800">Plant Health Score</span>
                    <div className="flex items-center gap-2">
                      {aiInsights.status === 'excellent' && <CheckCircle className="w-5 h-5 text-green-600" />}
                      {aiInsights.status === 'good' && <TrendingUp className="w-5 h-5 text-blue-600" />}
                      {(aiInsights.status === 'fair' || aiInsights.status === 'poor' || aiInsights.status === 'critical') && 
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                      <span className={`text-2xl font-bold ${
                        aiInsights.status === 'excellent' ? 'text-green-600' :
                        aiInsights.status === 'good' ? 'text-blue-600' :
                        aiInsights.status === 'fair' ? 'text-yellow-600' :
                        aiInsights.status === 'poor' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {aiInsights.score}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        aiInsights.status === 'excellent' ? 'bg-green-500' :
                        aiInsights.status === 'good' ? 'bg-blue-500' :
                        aiInsights.status === 'fair' ? 'bg-yellow-500' :
                        aiInsights.status === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${aiInsights.score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium capitalize ${
                    aiInsights.status === 'excellent' ? 'text-green-700' :
                    aiInsights.status === 'good' ? 'text-blue-700' :
                    aiInsights.status === 'fair' ? 'text-yellow-700' :
                    aiInsights.status === 'poor' ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {aiInsights.status} Condition
                  </span>
                </div>

                {/* AI Recommendations */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    AI Recommendations
                  </h4>
                  <div className="space-y-2">
                    {aiInsights.recommendations.map((rec, index) => (
                      <div key={index} className="bg-indigo-50 border-l-4 border-indigo-400 p-3 rounded-r-lg">
                        <p className="text-sm text-gray-700 font-medium">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trend Analysis */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Trend Analysis
                  </h4>
                  <div className="space-y-2">
                    {aiInsights.trends.map((trend, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
                        <p className="text-sm text-gray-700">{trend}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Badges Card */}
          <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400">
            <h3 className={`${poppins.className} text-2xl font-bold text-orange-900 mb-2`}>
              Your Badges
            </h3>
            <p className={`${poppins.className} text-1xl font-semibold text-orange-900 mb-4`}>
              Complete missions to earn badges!
            </p>
            <div className="grid grid-cols-4 gap-4">
              {badges.map((badge, index) => (
                <div key={index} className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-2 bg-orange-400 rounded-full flex items-center justify-center">
                    <Image src={badge.image} alt={badge.label} fill className="object-contain" />
                  </div>
                  <p className={`${poppins.className} text-xs font-semibold text-orange-900 mb-4`}>
                    {badge.label}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Farmer Robot - Positioned in bottom-right corner */}
        <div className="absolute bottom-[-90px] right-[300px] w-[700px] h-[700px] pointer-events-none z-10">
          {
    
            <Image 
              src="SMART FARM/PAGE 5/4x/Asset 58@4x.png" 
              alt="Farmer Robot" 
              fill 
              className="object-contain object-bottom"
            />
          }
          
        </div>
      </div>
    </DashboardLayout>
  )
}