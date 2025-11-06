import Groq from 'groq-sdk'

// Initialize Groq client with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'your_groq_api_key_here'
})

// Smart Farm AI Assistant with predefined knowledge base
export async function getSmartFarmResponse(userMessage: string, sensorData?: any) {
  try {
    const systemPrompt = `You are FarmBot, an expert agricultural AI assistant for a smart farm system. You provide helpful, practical advice based on sensor data and farming best practices.

CURRENT SENSOR DATA:
${sensorData ? `
- Temperature: ${sensorData.temperature}°C
- Humidity: ${sensorData.humidity}%
- Soil Moisture: ${sensorData.soilHumidity}%
- Light Level: ${sensorData.light}%
- Water Level: ${sensorData.waterLevel}%
- Distance Sensor: ${sensorData.distance}cm
- Motion Detected: ${sensorData.motionDetected ? 'Yes' : 'No'}
` : 'No current sensor data available'}

KNOWLEDGE BASE - Answer these FAQs with specific, actionable advice:

🌱 PLANT CARE:
Q: How often should I water my plants?
A: Based on soil moisture levels. Water when soil moisture drops below 30-40%. Your current reading is ${sensorData?.soilHumidity || 'N/A'}%.

Q: What's the optimal temperature for plant growth?
A: 20-30°C is ideal. Your current temperature is ${sensorData?.temperature || 'N/A'}°C.

Q: My plants are wilting, what should I do?
A: Check soil moisture, temperature, and humidity. Wilting often indicates low water or high heat stress.

💧 WATERING:
Q: When is the best time to water plants?
A: Early morning (6-8 AM) or evening (6-8 PM) when evaporation is lowest.

Q: How much water should I give my plants?
A: Water deeply but less frequently. Aim for 2-3 second watering cycles when soil moisture drops below 35%.

🌡️ ENVIRONMENT:
Q: What humidity level is best for plants?
A: 50-70% humidity is optimal. Your current humidity is ${sensorData?.humidity || 'N/A'}%.

Q: How much light do plants need?
A: Most plants need 40-60% light levels during growing season. Monitor light patterns throughout the day.

🚨 TROUBLESHOOTING:
Q: Why aren't my plants growing?
A: Check if temperature (20-30°C), humidity (50-70%), soil moisture (40-80%), and light (40-60%) are in optimal ranges.

Q: How do I prevent plant diseases?
A: Maintain proper airflow, avoid overwatering, keep optimal humidity, and monitor for early signs of stress.

🤖 AUTOMATION:
Q: Can I automate my farm?
A: Yes! Set up rules like: "Water for 3 seconds when soil moisture < 30%" or "Turn on fan when temperature > 28°C".

Q: What sensors should I monitor?
A: Temperature, humidity, soil moisture, light levels, and water tank levels are essential for optimal plant health.

Always provide specific advice based on current sensor readings when available. Be concise but helpful.`

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: userMessage
        }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 800
    })

    return completion.choices[0]?.message?.content || "FarmBot is temporarily offline. Please check your API key configuration."
    
  } catch (error) {
    console.error('Groq AI Error:', error)
    
    // Fallback responses for when Groq is unavailable
    const fallbackResponses: { [key: string]: string } = {
      'water': `💧 Based on your soil moisture of ${sensorData?.soilHumidity || 'unknown'}%, water your plants if it's below 35%. Water for 2-3 seconds in early morning or evening.`,
      'temperature': `🌡️ Your current temperature is ${sensorData?.temperature || 'unknown'}°C. Optimal range is 20-30°C. Use fans if too hot, or heating if too cold.`,
      'humidity': `💨 Current humidity is ${sensorData?.humidity || 'unknown'}%. Optimal range is 50-70%. Increase ventilation if too high, add water sources if too low.`,
      'light': `☀️ Current light level is ${sensorData?.light || 'unknown'}%. Most plants need 40-60% light. Adjust artificial lighting or shading as needed.`,
      'health': `🌱 Plant health depends on balanced conditions: Temperature 20-30°C, Humidity 50-70%, Soil moisture 40-80%, Light 40-60%.`
    }
    
    // Simple keyword matching for fallback
    const lowerMessage = userMessage.toLowerCase()
    for (const [keyword, response] of Object.entries(fallbackResponses)) {
      if (lowerMessage.includes(keyword)) {
        return `${response}\n\n⚠️ FarmBot AI is currently offline. This is a basic response.`
      }
    }
    
    return `🤖 FarmBot AI is currently offline. Please check your Groq API key configuration. For immediate help, try asking about: water, temperature, humidity, light, or plant health.`
  }
}

// Plant Health AI Analysis
export async function analyzeePlantHealth(enhancedData: any) {
  try {
    // Extract data from enhanced payload
    const sensorData = enhancedData.currentSensorData || enhancedData
    const previousReadings = enhancedData.previousReadings || []
    const trends = enhancedData.trends || { improving: false, declining: false, stable: true }
    const analysisHistory = enhancedData.analysisHistory || []
    
    // Build historical context
    const historicalContext = previousReadings.length > 0 ? 
      `\nHISTORICAL DATA (last ${previousReadings.length} readings):
${previousReadings.map((reading: any, i: number) => 
  `Reading ${i + 1}: Temp: ${reading.temperature}°C, Humidity: ${reading.humidity}%, Soil: ${reading.soilHumidity}%, Light: ${reading.light}%, Water: ${reading.waterLevel}%`
).join('\n')}` : '\nNo historical data available.'

    const trendContext = `\nTREND ANALYSIS:
- Improving: ${trends.improving}
- Declining: ${trends.declining} 
- Stable: ${trends.stable}`

    const previousAnalysisContext = analysisHistory.length > 0 ? 
      `\nPREVIOUS AI ANALYSIS:
${analysisHistory.slice(-3).map((analysis: any, i: number) => 
  `Analysis ${i + 1}: Score: ${analysis.healthScore}%, Status: ${analysis.status}, Main Issues: ${analysis.immediateActions?.slice(0,2).join(', ') || 'None'}`
).join('\n')}` : '\nNo previous analysis available.'

    const prompt = `As an expert agricultural AI with advanced analytics capabilities, provide a comprehensive plant health analysis using real-time and historical data:

CURRENT SENSOR DATA:
- Temperature: ${sensorData.temperature}°C
- Humidity: ${sensorData.humidity}%  
- Soil Moisture: ${sensorData.soilHumidity}%
- Light Level: ${sensorData.light}%
- Water Level: ${sensorData.waterLevel}%
${historicalContext}
${trendContext}
${previousAnalysisContext}

Using this comprehensive data, provide enhanced analysis in this exact JSON format:
{
  "healthScore": <number 0-100>,
  "status": "<excellent|good|fair|poor|critical>",
  "immediateActions": ["action1", "action2"],
  "recommendations": ["rec1", "rec2"], 
  "risks": ["risk1", "risk2"],
  "summary": "brief overall assessment incorporating trends and history",
  "metrics": {
    "temperatureScore": <number 0-100>,
    "humidityScore": <number 0-100>,
    "soilScore": <number 0-100>,
    "lightScore": <number 0-100>,
    "waterScore": <number 0-100>
  },
  "trends": {
    "improving": <boolean>,
    "declining": <boolean>,
    "stable": <boolean>
  },
  "confidence": <number 0-100>
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 800 // Increased for enhanced response
    })

    const response = completion.choices[0]?.message?.content || '{}'
    
    try {
      const parsed = JSON.parse(response)
      // Ensure all required fields are present for enhanced analysis
      return {
        healthScore: parsed.healthScore || 75,
        status: parsed.status || 'good',
        immediateActions: parsed.immediateActions || [],
        recommendations: parsed.recommendations || [],
        risks: parsed.risks || [],
        summary: parsed.summary || 'Analysis complete',
        metrics: parsed.metrics || {
          temperatureScore: 85,
          humidityScore: 80,
          soilScore: 75,
          lightScore: 70,
          waterScore: 90
        },
        trends: parsed.trends || trends,
        confidence: parsed.confidence || 90
      }
    } catch {
      // Enhanced fallback calculation if JSON parsing fails  
      return calculateEnhancedFallbackHealth(sensorData, trends, previousReadings)
    }
    
  } catch (error) {
    console.error('Plant health analysis error:', error)
    // Extract sensor data from enhanced payload for fallback
    const fallbackSensorData = enhancedData.currentSensorData || enhancedData
    const fallbackTrends = enhancedData.trends || { improving: false, declining: false, stable: true }
    const fallbackPreviousReadings = enhancedData.previousReadings || []
    return calculateEnhancedFallbackHealth(fallbackSensorData, fallbackTrends, fallbackPreviousReadings)
  }
}

// Predictive Watering Assistant
export async function predictWateringNeeds(sensorData: any, historicalData?: any[]) {
  try {
    const prompt = `As a smart irrigation AI, analyze current conditions and predict watering needs:

CURRENT CONDITIONS:
- Soil Moisture: ${sensorData.soilHumidity}%
- Temperature: ${sensorData.temperature}°C
- Humidity: ${sensorData.humidity}%
- Light Level: ${sensorData.light}%

Provide prediction in JSON format:
{
  "shouldWater": <boolean>,
  "hoursUntilWatering": <number>,
  "wateringDuration": <number seconds>,
  "confidence": <number 0-100>,
  "reasoning": "explanation",
  "nextCheckIn": <number hours>
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 400
    })

    const response = completion.choices[0]?.message?.content || '{}'
    
    try {
      return JSON.parse(response)
    } catch {
      return calculateFallbackWatering(sensorData)
    }
    
  } catch (error) {
    console.error('Watering prediction error:', error)
    return calculateFallbackWatering(sensorData)
  }
}

// Smart Alert Generation
export async function generateSmartAlert(alertType: string, sensorData: any, severity: 'low' | 'medium' | 'high' | 'critical') {
  try {
    const prompt = `Generate a smart farm alert with AI context:

ALERT TYPE: ${alertType}
SEVERITY: ${severity}
SENSOR DATA: ${JSON.stringify(sensorData)}

Provide alert in JSON format:
{
  "title": "Brief alert title",
  "message": "Detailed explanation with context", 
  "actions": ["immediate action 1", "action 2"],
  "icon": "appropriate emoji",
  "priority": <number 1-5>
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 400
    })

    const response = completion.choices[0]?.message?.content || '{}'
    
    try {
      return JSON.parse(response)
    } catch {
      const safeSeverity = severity || 'medium'
      return {
        title: `${alertType} Alert`,
        message: `${safeSeverity.toUpperCase()} priority alert detected in your smart farm system.`,
        actions: ["Check sensor readings", "Review system status"],
        icon: "⚠️",
        priority: safeSeverity === 'critical' ? 5 : safeSeverity === 'high' ? 4 : 3
      }
    }
    
  } catch (error) {
    console.error('Smart alert generation error:', error)
    const safeSeverity = severity || 'medium'
    return {
      title: `${alertType || 'System'} Alert`,
      message: `${safeSeverity.toUpperCase()} priority system alert: ${alertType || 'Unknown issue'}. Please check your farm conditions.`,
      actions: ["Check sensors", "Review settings"],
      icon: "🚨",
      priority: safeSeverity === 'critical' ? 5 : safeSeverity === 'high' ? 4 : 3
    }
  }
}

// Fallback health calculation
function calculateFallbackHealth(sensorData: any) {
  const temp = sensorData.temperature || 25
  const humidity = sensorData.humidity || 60
  const soil = sensorData.soilHumidity || 50
  
  const tempScore = temp >= 20 && temp <= 30 ? 100 : Math.max(0, 100 - Math.abs(temp - 25) * 4)
  const humidityScore = humidity >= 50 && humidity <= 70 ? 100 : Math.max(0, 100 - Math.abs(humidity - 60) * 2)
  const soilScore = soil >= 40 && soil <= 80 ? 100 : Math.max(0, 100 - Math.abs(soil - 60) * 2)
  
  const healthScore = Math.round((tempScore * 0.3) + (humidityScore * 0.2) + (soilScore * 0.5))
  
  let status = 'critical'
  if (healthScore >= 90) status = 'excellent'
  else if (healthScore >= 75) status = 'good'
  else if (healthScore >= 60) status = 'fair'
  else if (healthScore >= 40) status = 'poor'
  
  return {
    healthScore,
    status,
    immediateActions: soil < 30 ? ["Water plants immediately"] : ["Monitor conditions"],
    recommendations: ["Maintain optimal temperature 20-30°C", "Keep humidity 50-70%"],
    risks: temp > 30 ? ["Heat stress risk"] : [],
    summary: `Plant health is ${status} (${healthScore}%)`
  }
}

// Enhanced fallback health calculation with historical context
function calculateEnhancedFallbackHealth(sensorData: any, trends: any, previousReadings: any[]) {
  const temp = sensorData.temperature || 25
  const humidity = sensorData.humidity || 60
  const soil = sensorData.soilHumidity || 50
  const light = sensorData.light || 50
  const water = sensorData.waterLevel || 50
  
  // Enhanced scoring with more factors
  const tempScore = Math.max(0, 100 - Math.abs(temp - 25) * 2.5)
  const humidityScore = Math.max(0, 100 - Math.abs(humidity - 65) * 1.5)
  const soilScore = Math.max(0, 100 - Math.abs(soil - 50) * 2)
  const lightScore = Math.max(0, 100 - Math.abs(light - 55) * 1.2)
  const waterScore = water > 20 ? 100 : Math.max(0, water * 5)

  // Trend-based adjustments
  let trendAdjustment = 0
  if (trends.improving) trendAdjustment = 5
  else if (trends.declining) trendAdjustment = -5

  // Historical context adjustment
  let stabilityBonus = 0
  if (previousReadings.length >= 3) {
    const recentVariation = calculateVariation(previousReadings.slice(-3))
    stabilityBonus = recentVariation < 10 ? 3 : recentVariation > 20 ? -3 : 0
  }

  const baseScore = Math.round(
    (tempScore * 0.25) + (humidityScore * 0.15) + (soilScore * 0.35) + 
    (lightScore * 0.15) + (waterScore * 0.10)
  )
  
  const healthScore = Math.max(0, Math.min(100, baseScore + trendAdjustment + stabilityBonus))
  
  let status = 'critical'
  if (healthScore >= 90) status = 'excellent'
  else if (healthScore >= 75) status = 'good'
  else if (healthScore >= 60) status = 'fair'
  else if (healthScore >= 40) status = 'poor'

  const immediateActions = []
  const recommendations = []
  const risks = []

  if (temp < 18 || temp > 32) {
    immediateActions.push(`Temperature adjustment needed (${temp}°C)`)
    risks.push('Temperature stress')
  }
  if (soil < 30) {
    immediateActions.push('Urgent watering required')
    risks.push('Plant dehydration')
  }
  if (water < 20) {
    immediateActions.push('Refill water tank')
    risks.push('Water supply shortage')
  }

  if (humidity < 50) recommendations.push('Increase humidity')
  if (light < 40) recommendations.push('Provide more light')
  if (trends.declining) recommendations.push('Monitor system closely')

  return {
    healthScore,
    status,
    immediateActions: immediateActions.length ? immediateActions : ['Monitor conditions'],
    recommendations: recommendations.length ? recommendations : ['Maintain current settings'],
    risks: risks.length ? risks : ['No immediate risks'],
    summary: `Plant health: ${status} (${healthScore}%). ${trends.improving ? 'Improving trend.' : trends.declining ? 'Declining trend.' : 'Stable conditions.'}`,
    metrics: {
      temperatureScore: Math.round(tempScore),
      humidityScore: Math.round(humidityScore),
      soilScore: Math.round(soilScore),
      lightScore: Math.round(lightScore),
      waterScore: Math.round(waterScore)
    },
    trends,
    confidence: 85 + (previousReadings.length > 5 ? 10 : 0) + stabilityBonus
  }
}

// Helper function to calculate variation in readings
function calculateVariation(readings: any[]) {
  if (readings.length < 2) return 0
  
  const temps = readings.map(r => r.temperature || 25)
  const soils = readings.map(r => r.soilHumidity || 50)
  
  const tempVar = Math.max(...temps) - Math.min(...temps)
  const soilVar = Math.max(...soils) - Math.min(...soils)
  
  return (tempVar + soilVar) / 2
}

// Fallback watering calculation  
function calculateFallbackWatering(sensorData: any) {
  const soilMoisture = sensorData.soilHumidity || 50
  const shouldWater = soilMoisture < 35
  
  return {
    shouldWater,
    hoursUntilWatering: shouldWater ? 0 : Math.max(1, (soilMoisture - 30) / 5),
    wateringDuration: shouldWater ? 3 : 0,
    confidence: 75,
    reasoning: shouldWater ? "Soil moisture below optimal threshold" : "Soil moisture adequate",
    nextCheckIn: 2
  }
}

export { groq }