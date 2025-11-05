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
export async function analyzeePlantHealth(sensorData: any) {
  try {
    const prompt = `As an expert agricultural AI, provide a comprehensive plant health analysis based on these sensor readings:

SENSOR DATA:
- Temperature: ${sensorData.temperature}°C
- Humidity: ${sensorData.humidity}%  
- Soil Moisture: ${sensorData.soilHumidity}%
- Light Level: ${sensorData.light}%
- Water Level: ${sensorData.waterLevel}%

Provide analysis in this exact JSON format:
{
  "healthScore": <number 0-100>,
  "status": "<excellent|good|fair|poor|critical>",
  "immediateActions": ["action1", "action2"],
  "recommendations": ["rec1", "rec2"], 
  "risks": ["risk1", "risk2"],
  "summary": "brief overall assessment"
}`

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 500
    })

    const response = completion.choices[0]?.message?.content || '{}'
    
    try {
      return JSON.parse(response)
    } catch {
      // Fallback calculation if JSON parsing fails
      return calculateFallbackHealth(sensorData)
    }
    
  } catch (error) {
    console.error('Plant health analysis error:', error)
    return calculateFallbackHealth(sensorData)
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