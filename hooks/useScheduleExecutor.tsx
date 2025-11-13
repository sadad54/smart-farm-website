"use client"

import { useEffect, useRef } from 'react'

interface ScheduleExecutorOptions {
  checkInterval?: number // milliseconds
  enabled?: boolean
  onScheduleExecuted?: (schedule: any) => void
  onError?: (error: any) => void
}

export function useScheduleExecutor({
  checkInterval = 60000, // Check every minute by default
  enabled = true,
  onScheduleExecuted,
  onError
}: ScheduleExecutorOptions = {}) {
  const intervalRef = useRef<number | null>(null)

  const checkAndExecuteSchedules = async () => {
    try {
      const currentTime = new Date().toISOString()
      console.log(`🔍 Checking for pending watering schedules at ${currentTime}...`)
      
      const response = await fetch('/api/watering-schedules/execute', {
        method: 'GET'
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Schedule check failed: ${response.status} ${response.statusText}`, errorText)
        throw new Error(`Schedule check failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('📋 Schedule check result:', result)
      
      if (result.executedSchedules && result.executedSchedules.length > 0) {
        console.log(`✅ Executed ${result.executedSchedules.length} scheduled watering(s)`)
        
        result.executedSchedules.forEach((schedule: any) => {
          console.log(`💧 Executed schedule: ${schedule.name} for ${schedule.plant_type}`)
          onScheduleExecuted?.(schedule)
        })
      } else {
        console.log('📅 No pending schedules found at this time')
      }
    } catch (error) {
      console.error('❌ Failed to check/execute schedules:', error)
      onError?.(error)
    }
  }

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial check
    checkAndExecuteSchedules()

    // Set up interval
    intervalRef.current = window.setInterval(
      checkAndExecuteSchedules,
      checkInterval
    )

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, checkInterval])

  // Manual trigger function
  const triggerCheck = () => {
    if (enabled) {
      checkAndExecuteSchedules()
    }
  }

  return {
    triggerCheck
  }
}