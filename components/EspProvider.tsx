"use client"

import React, { createContext, useContext, useEffect } from "react"
import { useEsp, EspState } from "@/hooks/useEsp"
import smartFarmMQTT from "@/lib/mqtt-client"

type EspContextValue = {
  state: EspState
  connected: boolean
  sendCommand: (value: string, location?: string, metadata?: any) => Promise<any>
}

const EspContext = createContext<EspContextValue | null>(null)

export function EspProvider({ children }: { children: React.ReactNode }) {
  const { state, connected, sendCommand } = useEsp()

  // Initialize MQTT connection when provider mounts
  useEffect(() => {
    console.log('🔌 Initializing MQTT connection...')
    smartFarmMQTT.connect()
    
    return () => {
      console.log('🔌 Disconnecting MQTT...')
      smartFarmMQTT.disconnect()
    }
  }, [])

  return <EspContext.Provider value={{ state, connected, sendCommand }}>{children}</EspContext.Provider>
}

export function useEspContext() {
  const ctx = useContext(EspContext)
  if (!ctx) throw new Error("useEspContext must be used within EspProvider")
  return ctx
}

export default EspProvider
