"use client";

import Link from "next/link";
import Image from "next/image";

export default function SelectPage() {
  const options = [
    {
      title: "Smart Farm",
      href: "/dashboard",
      robotImage: "/SMART FARM/page 2/4x/Asset 13@4x.png",
    },
    {
      title: "Smart House",
      href: "#",
      robotImage: "/SMART FARM/page 2/4x/Asset 14@4x.png",
    },
    {
      title: "Smart Factory",
      href: "#",
      robotImage: "/SMART FARM/page 2/4x/Asset 15@4x.png",
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <Image
        src="/SMART FARM/page 2/4x/Asset 16@4x.png"
        alt="Selection Background"
        fill
        className="object-cover"
        priority
      />

      {/* Robot buttons */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 pt-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl w-full">
          {options.map((option) => (
            <Link key={option.title} href={option.href}>
              <div className="group flex flex-col items-center cursor-pointer transition-transform duration-300 hover:scale-110">
                <div className="relative w-64 h-64 drop-shadow-2xl transition-all duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_30px_rgba(0,200,255,0.6)]">
                  <Image
                    src={option.robotImage}
                    alt={option.title}
                    fill
                    className="object-contain rounded-3xl"
                    priority
                  />
                </div>
                
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
