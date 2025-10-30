import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"

export default function Scenario1Page() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Scenario 1</h2>

        <Card className="bg-green-200/90 backdrop-blur-sm rounded-3xl p-8 border-4 border-green-400">
          <h3 className="text-2xl font-bold text-green-900 mb-6">Scenario 1 Content</h3>
          <div className="bg-white/80 rounded-2xl p-12 text-center">
            <p className="text-xl text-gray-700">Scenario 1 interactive content will be displayed here</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
