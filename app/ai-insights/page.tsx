import Image from "next/image"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function AIInsightsPage() {
  const badges = [
    {
      label: "Lorem Ipsum",
      image: "SMART FARM/PAGE 5/4x/Asset 154@4x.png",
    },
    {
      label: "Lorem Ipsum",
      image: "SMART FARM/PAGE 5/4x/Asset 156@4x.png",
    },
    {
      label: "Lorem Ipsum",
      image: "SMART FARM/PAGE 5/4x/Asset 153@4x.png",
    },
    {
      label: "Lorem Ipsum",
      image: "SMART FARM/PAGE 5/4x/Asset 155@4x.png",
    },
  ]

  return (
    <DashboardLayout>
      <div className="relative min-h-screen">
        <div className="space-y-6 pb-96">
          <h2 className={`${poppins.className} text-3xl font-bold text-white`}>
            AI Insights
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plant Health Card */}
            <Card className="bg-pink-200/90 backdrop-blur-sm rounded-3xl p-6 border-4 border-pink-400">
              <h3 className={`${poppins.className} text-2xl font-bold text-purple-900 mb-4`}>
                Plant Health
              </h3>
              <div className="bg-white/80 rounded-2xl p-8 h-64 flex items-center justify-center">
                {/* Plant health chart placeholder */}
                <div className="relative w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </Card>

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
        </div>

        {/* Farmer Robot - Positioned in bottom-right corner */}
        <div className="absolute bottom-[-90px] left-[300px] w-[700px] h-[700px] pointer-events-none z-10">
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