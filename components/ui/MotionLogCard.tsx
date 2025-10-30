import { Card } from "@/components/ui/card"
import Image from "next/image"

export default function MotionLogCard() {
  const motionLog = [
    {
      image: "SMART FARM/PAGE 8/4x/Asset 113@4x.png", // Chicken
      label: "Chicken Detected!",
      time: "9.15AM",
    },
    {
      image: "SMART FARM/PAGE 8/4x/Asset 114@4x.png", // Butterfly
      label: "Butterfly Fluttered by!",
      time: "9.12AM",
    },
    {
      image: "SMART FARM/PAGE 8/4x/Asset 115@4x.png", // Chicken again
      label: "Chicken Detected!",
      time: "9.05AM",
    },
  ]

  return (
    <Card className="bg-[#EFC6F8]/90 backdrop-blur-sm rounded-3xl p-8 border-4 border-[#D6A4F5] shadow-2xl w-[50%]">
      {/* Title */}
      <h3 className="text-2xl font-bold text-[#6B21A8] mb-6">Motion Log</h3>

      {/* Inner white area */}
      <div className="bg-white/70 rounded-2xl p-8">
        <div className="flex justify-center items-center gap-10">
          {motionLog.map((log, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              {/* Circle background for image */}
              <div className="relative w-[120px] h-[120px] mb-3">
                <div className="absolute inset-0 bg-[#E9C5F4] rounded-full"></div>
                <Image
                  src={log.image}
                  alt={log.label}
                  fill
                  className="object-contain p-2"
                />
              </div>

              {/* Labels */}
              <p className="text-[#5B189A] font-semibold text-base">
                {log.label}
              </p>
              <p className="text-[#5B189A]/70 text-sm mt-1">{log.time}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
