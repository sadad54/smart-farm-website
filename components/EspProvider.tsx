"use client"

import React, { createContext, useContext } from "react"
import useEsp, { EspState } from "@/hooks/useEsp"

type EspContextValue = {
  state: EspState
  connected: boolean
  sendCommand: (value: string) => Promise<any>
}

const EspContext = createContext<EspContextValue | null>(null)

export function EspProvider({ children }: { children: React.ReactNode }) {
  const { state, connected, sendCommand } = useEsp()

  return <EspContext.Provider value={{ state, connected, sendCommand }}>{children}</EspContext.Provider>
}

export function useEspContext() {
  const ctx = useContext(EspContext)
  if (!ctx) throw new Error("useEspContext must be used within EspProvider")
  return ctx
}

export default EspProvider
