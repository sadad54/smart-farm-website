"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { AIAutomationDashboard } from "@/components/AIAutomationDashboard"
import { SmartAlerts } from "@/components/SmartAlerts"
import { Poppins } from "next/font/google"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export default function AutomationPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className={`${poppins.className} text-4xl font-bold text-white ml-4`}>
          AI Automation Center
        </h2>
        <p className={`${poppins.className} text-lg text-white/80 ml-4 mb-8`}>
          Intelligent automation rules and smart farm management
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* AI Automation Dashboard */}
          <div>
            <AIAutomationDashboard />
          </div>
          
          {/* Smart Alerts */}
          <div>
            <SmartAlerts />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}