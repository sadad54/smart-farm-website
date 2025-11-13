"use client"

import { useState, useEffect, useRef } from 'react'

interface MQTTSchedule {
  id: string
  name: string
  time: string // HH:MM format
  active: boolean
  waterDuration: number // milliseconds
}

export function useMQTTScheduling() {
  const [schedules, setSchedules] = useState<MQTTSchedule[]>([])
  const timeoutRefs = useRef<Map<string, number>>(new Map())

  // Function to send MQTT command (you'll need to implement this)
  const sendMQTTCommand = async (command: string, duration: number) => {
    try {
      // This should send MQTT command via your existing system
      const response = await fetch('/api/mqtt-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: command,
          duration_ms: duration
        })
      })
      
      if (response.ok) {
        console.log(`✅ MQTT command sent: ${command} for ${duration}ms`)
        return true
      }
    } catch (error) {
      console.error('❌ Failed to send MQTT command:', error)
    }
    return false
  }

  // Calculate milliseconds until target time today/tomorrow
  const getMillisecondsUntilTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const now = new Date()
    const targetTime = new Date()
    targetTime.setHours(hours, minutes, 0, 0)

    // If time has passed today, schedule for tomorrow
    if (targetTime <= now) {
      targetTime.setDate(targetTime.getDate() + 1)
    }

    return targetTime.getTime() - now.getTime()
  }

  // Schedule a single watering
  const scheduleWatering = (schedule: MQTTSchedule) => {
    const msUntilExecution = getMillisecondsUntilTime(schedule.time)
    
    console.log(`⏰ Scheduling "${schedule.name}" to execute in ${Math.round(msUntilExecution / 1000)} seconds at ${schedule.time}`)
    
    const timeoutId = window.setTimeout(async () => {
      console.log(`💧 Executing scheduled watering: ${schedule.name}`)
      const success = await sendMQTTCommand('D', schedule.waterDuration)
      
      if (success) {
        console.log(`✅ Scheduled watering "${schedule.name}" completed successfully`)
        // Reschedule for next day
        scheduleWatering(schedule)
      } else {
        console.error(`❌ Failed to execute scheduled watering: ${schedule.name}`)
      }
    }, msUntilExecution)

    // Store timeout reference for cancellation
    timeoutRefs.current.set(schedule.id, timeoutId)
  }

  // Add new schedule
  const addSchedule = (name: string, time: string, waterDuration: number = 5000) => {
    const newSchedule: MQTTSchedule = {
      id: Date.now().toString(),
      name,
      time,
      active: true,
      waterDuration
    }

    setSchedules(prev => {
      const updated = [...prev, newSchedule]
      
      // Schedule the watering
      scheduleWatering(newSchedule)
      
      // Save to localStorage for persistence
      localStorage.setItem('mqttSchedules', JSON.stringify(updated))
      
      return updated
    })

    console.log(`📅 Added schedule: ${name} at ${time}`)
  }

  // Remove schedule
  const removeSchedule = (scheduleId: string) => {
    // Cancel the timeout
    const timeoutId = timeoutRefs.current.get(scheduleId)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutRefs.current.delete(scheduleId)
    }

    setSchedules(prev => {
      const updated = prev.filter(s => s.id !== scheduleId)
      localStorage.setItem('mqttSchedules', JSON.stringify(updated))
      return updated
    })
  }

  // Load schedules from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('mqttSchedules')
    if (saved) {
      const loadedSchedules = JSON.parse(saved) as MQTTSchedule[]
      setSchedules(loadedSchedules)
      
      // Schedule all active schedules
      loadedSchedules
        .filter(s => s.active)
        .forEach(scheduleWatering)
    }
  }, [])

  return {
    schedules,
    addSchedule,
    removeSchedule
  }
}