import Image from "next/image";

export default function WaterTankCard() {
  const waterLevel = 61; // percentage

  return (
    <div className="relative w-[380*2px] h-[300px] bg-[#9FD6F9] rounded-2xl border-4 border-[#75BDED] flex flex-col items-center justify-center shadow-md">
      {/* Title */}
      <h3 className="text-2xl font-bold mb-6 absolute top-4 left-6 text-[20px] font-semibold text-[#204060]">
        Water Tank
      </h3>

      {/* Tank Wrapper */}
      <div className="relative mt-8 w-[300px] h-[80px] flex items-end justify-center overflow-hidden">
        {/* Water Waves (below) */}
        <div
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
          style={{
            height: `${waterLevel}%`,
            clipPath: "inset(0 0 0 0 round 12px)",
          }}
        >
          <Image
            src="/SMART FARM/PAGE 10/4x/Asset 129@4x.png"
            alt="Water Waves"
            fill
            className="object-cover"
          />
        </div>

        {/* Tank Frame (on top) */}
        <Image
          src="/SMART FARM/PAGE 10/4x/Asset 130@4x.png"
          alt="Tank Frame"
          fill
          className="object-cover pointer-events-none z-10"
        />
      </div>

      {/* Percentage Text */}
      <p className="absolute bottom-3 text-[13px] font-semibold text-[#204060]">
        {waterLevel}% Full
      </p>
    </div>
  );
}
