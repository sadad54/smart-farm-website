"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useEspContext } from "@/components/EspProvider"
import { AIPlantHealthAnalysis } from "@/components/AIPlantHealthAnalysis"
import { ChevronLeft, ChevronRight, Brain, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

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
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
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

  // Fetch live MQTT sensor data
  useEffect(() => {
    fetchSensorData()
    const interval = setInterval(fetchSensorData, 5000) // Refresh every 5 seconds for real-time updates
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
      // Get live MQTT sensor data
      const response = await fetch('/api/mqtt-sensor-data', {
        cache: "no-store"
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.data) {
        // Create current data point from live MQTT data with seconds precision
        const currentTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit'
        })
        
        const newDataPoint: ChartDataPoint = {
          time: currentTime,
          temperature: result.data.temperature,
          humidity: result.data.humidity,
          soil_moisture: result.data.soilHumidity,
          light_level: result.data.light,
          water_level: result.data.waterLevel
        }
        
        // Update chart data - avoid too frequent updates and keep last 50 points
        setChartData(prevData => {
          // Check if enough time has passed since last reading (minimum 8 seconds)
          const lastReading = prevData[prevData.length - 1]
          const now = new Date()
          
          if (lastReading) {
            const lastTime = lastReading.time
            const [lastHour, lastMinute, lastSecond] = lastTime.split(':').map(Number)
            const lastTimestamp = lastHour * 3600 + lastMinute * 60 + lastSecond
            const currentTimestamp = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
            
            // Only add if at least 8 seconds have passed
            if (Math.abs(currentTimestamp - lastTimestamp) < 8) {
              return prevData
            }
          }
          
          const newData = [...prevData, newDataPoint]
          // Keep only the last 50 data points for better performance
          return newData.slice(-50)
        })
        
        console.log('📊 AI Insights updated with live MQTT data:', newDataPoint)
      } else {
        console.log('⚠️ No MQTT sensor data available for AI Insights')
      }
    } catch (error) {
      console.error('❌ Error fetching MQTT sensor data for AI Insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateAiInsights = async () => {
    const temp = state.temperature || 0
    const humidity = state.humidity || 0
    const soil = state.soilHumidity || 0
    const light = state.light || 0
    const water = state.waterLevel || 0
    
    setAiAnalyzing(true)
    
    try {
      // Get AI-powered plant health analysis
      const response = await fetch('/api/ai-plant-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: temp,
          humidity: humidity,
          soilHumidity: soil,
          light: light,
          waterLevel: water
        })
      })

      const data = await response.json()
      
      if (data.success && data.analysis) {
        // Use AI analysis for more dynamic insights
        setAiInsights({
          status: data.analysis.status,
          score: data.analysis.healthScore,
          recommendations: data.analysis.recommendations || [],
          trends: data.analysis.immediateActions || []
        })
        return
      }
    } catch (error) {
      console.log('Using fallback health calculation:', error)
    }

    // Enhanced fallback calculation with all factors
    const tempScore = temp >= 20 && temp <= 30 ? 100 : Math.max(0, 100 - Math.abs(temp - 25) * 3)
    const humidityScore = humidity >= 50 && humidity <= 80 ? 100 : Math.max(0, 100 - Math.abs(humidity - 65) * 1.5)
    const soilScore = soil >= 30 && soil <= 70 ? 100 : Math.max(0, 100 - Math.abs(soil - 50) * 2)
    const lightScore = light >= 30 && light <= 80 ? 100 : Math.max(0, 100 - Math.abs(light - 55) * 1.2)
    const waterScore = water >= 20 ? 100 : Math.max(0, water * 5) // Water level critical below 20%
    
    // Weighted calculation including all factors
    const overallScore = Math.round(
      (tempScore * 0.25) + 
      (humidityScore * 0.15) + 
      (soilScore * 0.35) + 
      (lightScore * 0.15) + 
      (waterScore * 0.10)
    )
    
    // Determine status with enhanced thresholds
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
    
    if (soil < 30) {
      recommendations.push("🚰 Soil is dry - increase watering frequency")
      trends.push("Soil moisture below optimal range")
    } else if (soil > 70) {
      recommendations.push("💧 Soil is too wet - reduce watering")
      trends.push("Soil moisture above optimal range")  
    } else if (soil > 0) {
      trends.push("Soil moisture is optimal ✅")
    } else {
      recommendations.push("🔧 Check soil sensor connection")
      trends.push("Soil sensor needs attention")
    }

    // Light level recommendations
    if (light < 30) {
      recommendations.push("💡 Light levels low - consider grow lights")
      trends.push("Plants need more light exposure")
    } else if (light > 80) {
      recommendations.push("☀️ Very bright - ensure adequate shade")
      trends.push("High light intensity detected")
    } else {
      trends.push("Light levels are appropriate ✅")
    }

    // Water tank level recommendations
    if (water < 20) {
      recommendations.push("🚨 Water tank critically low - refill immediately")
      trends.push("Water supply needs urgent attention")
    } else if (water < 40) {
      recommendations.push("⚠️ Water tank getting low - plan to refill soon")
      trends.push("Water supply running low")
    } else {
      trends.push("Water tank level is adequate ✅")
    }
    
    if (recommendations.length === 0) {
      recommendations.push("🎉 All conditions are optimal! Your plants are thriving!")
    }
    
    setAiInsights({ status, score: overallScore, recommendations, trends })
    setAiAnalyzing(false)
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

          {/* Plant Health Card - Contains both charts and dashboard cards */}
          <Card className="bg-pink-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-pink-400">
            <div className="flex items-center justify-between mb-6">
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

            {/* Real-time Dashboard Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Temperature Card */}
              <div className="bg-white/90 rounded-xl p-4 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-red-800">Temperature</span>
                </div>
                <p className="text-2xl font-bold text-red-900">
                  {state.temperature !== undefined && state.temperature !== null && state.temperature !== -999 
                    ? `${state.temperature.toFixed(1)}°C` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-red-600 mt-1">Current reading</p>
              </div>

              {/* Humidity Card */}
              <div className="bg-white/90 rounded-xl p-4 border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-blue-800">Humidity</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {state.humidity !== undefined && state.humidity !== null && state.humidity !== -999 
                    ? `${state.humidity.toFixed(1)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-blue-600 mt-1">Air moisture</p>
              </div>

            

              {/* Soil Moisture Card */}
              <div className="bg-white/90 rounded-xl p-4 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-semibold text-green-800">Soil Moisture</span>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {state.soilHumidity !== undefined && state.soilHumidity !== null && state.soilHumidity !== -999 
                    ? `${state.soilHumidity.toFixed(1)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-green-600 mt-1">Soil wetness</p>
              </div>

              {/* Light Level Card */}
              <div className="bg-white/90 rounded-xl p-4 border-2 border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-800">Light Level</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900">
                  {state.light !== undefined && state.light !== null && state.light !== -999 
                    ? `${state.light.toFixed(1)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-yellow-600 mt-1">Brightness</p>
              </div>

              {/* Water Level Card */}
              <div className="bg-white/90 rounded-xl p-4 border-2 border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500" />
                  <span className="text-sm font-semibold text-cyan-800">Water Tank</span>
                </div>
                <p className="text-2xl font-bold text-cyan-900">
                  {state.waterLevel !== undefined && state.waterLevel !== null && state.waterLevel !== -999 
                    ? `${state.waterLevel.toFixed(1)}%` 
                    : 'N/A'}
                </p>
                <p className="text-xs text-cyan-600 mt-1">Tank level</p>
              </div>
            </div>

            {/* Charts Section */}
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
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            interval={'preserveStartEnd'}
                            angle={-90}
                            textAnchor="end"
                            height={60}
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
         <AIPlantHealthAnalysis />
          </div>

          {/* AI Plant Health Analysis */}
          

          {/* Badges Card */}
          <Card className="bg-yellow-100/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-yellow-400 absolute bottom-[10px]">
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
    </DashboardLayout>
  )
}