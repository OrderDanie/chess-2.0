import React, { useEffect, useState } from "react";

interface ParallaxBackgroundProps {
  scrollY: number;
}

export default function ParallaxBackground({ scrollY }: ParallaxBackgroundProps) {
  // Mouse position for subtle interactive depth on desktop
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Normalize mouse from -1 to 1 relative to window center
          const nx = (e.clientX / window.innerWidth - 0.5) * 2;
          const ny = (e.clientY / window.innerHeight - 0.5) * 2;
          setMousePos({ x: nx, y: ny });
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const mx = mousePos.x;
  const my = mousePos.y;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* Embedded Ambient Cartographic CSS Keyframes */}
      <style>{`
        @keyframes floatSway {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2.5deg); }
        }
        @keyframes krakenSway {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          50% { transform: translateY(8px) translateX(6px) rotate(-1.5deg); }
        }
        @keyframes windDrift {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(20px) translateY(-6px); }
        }
        @keyframes slowRotateClockwise {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slowRotateCounterClockwise {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes flagFlutter {
          0%, 100% { transform: skewY(0deg) scaleX(1); }
          50% { transform: skewY(-8deg) scaleX(0.85); }
        }
        .anim-galleon {
          animation: floatSway 9s ease-in-out infinite;
        }
        .anim-kraken {
          animation: krakenSway 11s ease-in-out infinite;
        }
        .anim-wind {
          animation: windDrift 15s ease-in-out infinite;
        }
        .anim-rotate-cw {
          animation: slowRotateClockwise 160s linear infinite;
        }
        .anim-rotate-ccw {
          animation: slowRotateCounterClockwise 200s linear infinite;
        }
        .anim-flag {
          animation: flagFlutter 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Subtle Warm Parchment Tint Radial Gradient */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 30%, rgba(254, 243, 199, 0.4) 0%, transparent 70%)",
        }}
      />

      {/* =========================================================================
          LAYER 0: Deep Celestial Navigation & Rhumb Lines (Depth 0.06 - Slowest)
          ========================================================================= */}
      <div
        className="absolute -top-16 -right-16 transition-transform duration-100 ease-out will-change-transform opacity-30"
        style={{
          transform: `translate3d(${mx * 8}px, ${scrollY * 0.06 + my * 8}px, 0)`,
        }}
      >
        <div className="anim-rotate-cw" style={{ transformOrigin: "210px 210px" }}>
          <svg width="420" height="420" viewBox="0 0 100 100" fill="none" stroke="#2b2118" strokeWidth="0.9">
            <circle cx="50" cy="50" r="46" strokeDasharray="2 3" strokeOpacity="0.4" />
            <circle cx="50" cy="50" r="36" strokeDasharray="4 2" strokeOpacity="0.35" />
            <circle cx="50" cy="50" r="22" strokeOpacity="0.3" />
            {/* Main 8-Point Compass Star */}
            <polygon points="50,6 54,46 50,50 46,46" fill="#2b2118" fillOpacity="0.18" />
            <polygon points="50,94 54,54 50,50 46,54" fill="#2b2118" fillOpacity="0.18" />
            <polygon points="6,50 46,46 50,50 46,54" fill="#2b2118" fillOpacity="0.18" />
            <polygon points="94,50 54,46 50,50 54,54" fill="#2b2118" fillOpacity="0.18" />
            {/* Diagonal Corner Rays */}
            <polygon points="19,19 47,47 50,50 47,50" fill="#2b2118" fillOpacity="0.1" />
            <polygon points="81,19 53,47 50,50 50,47" fill="#2b2118" fillOpacity="0.1" />
            <polygon points="19,81 47,53 50,50 47,50" fill="#2b2118" fillOpacity="0.1" />
            <polygon points="81,81 53,53 50,50 50,53" fill="#2b2118" fillOpacity="0.1" />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          LAYER 1: Western Wind Currents & Cartographic Script (Depth 0.14)
          ========================================================================= */}
      <div
        className="absolute top-[18%] -left-10 transition-transform duration-100 ease-out will-change-transform opacity-35"
        style={{
          transform: `translate3d(${Math.sin(scrollY * 0.003) * 18 + mx * 12}px, ${scrollY * 0.14 + my * 10}px, 0)`,
        }}
      >
        <div className="anim-wind">
          <svg width="320" height="240" viewBox="0 0 240 180" fill="none" stroke="#2b2118" strokeWidth="1.3">
            <path d="M15,40 Q80,15 150,55 T235,30" strokeOpacity="0.45" strokeDasharray="5 3" />
            <path d="M5,85 Q90,60 170,105 T245,80" strokeOpacity="0.35" />
            <path d="M30,135 Q105,105 180,145 T240,125" strokeOpacity="0.4" strokeDasharray="3 3" />
            <text
              x="45"
              y="55"
              fontSize="10"
              fontFamily="serif"
              fontStyle="italic"
              fontWeight="bold"
              fill="#2b2118"
              fillOpacity="0.5"
              letterSpacing="2"
            >
              TERRA INCOGNITA
            </text>
          </svg>
        </div>
      </div>

      {/* =========================================================================
          LAYER 2: Floating War Galleon Sailing the Ocean Margins (Depth 0.22)
          ========================================================================= */}
      <div
        className="absolute top-[32%] -right-8 transition-transform duration-100 ease-out will-change-transform opacity-40"
        style={{
          transform: `translate3d(${Math.sin(scrollY * 0.004) * 22 + mx * 16}px, ${scrollY * 0.22 + my * 14}px, 0)`,
        }}
      >
        <div className="anim-galleon">
          <svg width="220" height="180" viewBox="0 0 160 140" fill="none" stroke="#2b2118" strokeWidth="1.4">
            {/* Hull */}
            <path
              d="M30,95 Q80,115 130,95 L145,75 Q80,85 15,75 Z"
              fill="#f8e8c8"
              fillOpacity="0.3"
              strokeWidth="1.8"
            />
            {/* Main Mast & Billowing Square Sails */}
            <line x1="80" y1="20" x2="80" y2="85" strokeWidth="2" />
            <path d="M50,30 Q80,22 110,30 Q80,55 50,30 Z" fill="#ffe066" fillOpacity="0.25" />
            <path d="M45,55 Q80,48 115,55 Q80,80 45,55 Z" fill="#ffe066" fillOpacity="0.25" />
            {/* Fore Mast */}
            <line x1="45" y1="40" x2="45" y2="80" strokeWidth="1.5" />
            <path d="M25,48 Q45,42 65,48 Q45,68 25,48 Z" fill="#fff" fillOpacity="0.3" />
            {/* Water wake lines */}
            <path d="M10,105 Q40,95 80,105 T150,102" strokeOpacity="0.4" strokeDasharray="4 2" />
            <path d="M25,115 Q60,108 100,115 T160,112" strokeOpacity="0.3" strokeDasharray="3 3" />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          LAYER 3: Mid-Page Imperial Fortress & Mountain Ridgeline (Depth 0.30)
          ========================================================================= */}
      <div
        className="absolute top-[52%] -left-12 transition-transform duration-100 ease-out will-change-transform opacity-35"
        style={{
          transform: `translate3d(${mx * 18}px, ${scrollY * 0.30 + my * 16}px, 0)`,
        }}
      >
        <svg width="290" height="200" viewBox="0 0 220 150" fill="none" stroke="#2b2118" strokeWidth="1.3">
          {/* Mountain Peaks */}
          <path d="M15,110 L50,45 L85,110" strokeOpacity="0.5" />
          <path d="M50,45 L62,110" strokeOpacity="0.3" strokeDasharray="2 2" />
          <path d="M70,110 L105,35 L140,110" strokeOpacity="0.55" />
          <path d="M125,110 L160,25 L195,110" strokeOpacity="0.6" strokeWidth="1.6" />
          {/* Fortress tower sketch atop peak */}
          <rect x="153" y="16" width="14" height="15" fill="#fef08a" fillOpacity="0.2" />
          <line x1="160" y1="16" x2="160" y2="9" strokeWidth="1.5" />
          {/* Fluttering Red Flag */}
          <g className="anim-flag" style={{ transformOrigin: "160px 12px" }}>
            <polygon points="160,9 169,12 160,15" fill="#ef4444" fillOpacity="0.65" />
          </g>
          <text
            x="75"
            y="130"
            fontSize="9"
            fontFamily="serif"
            fontStyle="italic"
            fontWeight="bold"
            fill="#2b2118"
            fillOpacity="0.45"
            letterSpacing="1.5"
          >
            MONS BELLUM
          </text>
        </svg>
      </div>

      {/* =========================================================================
          LAYER 4: Kraken Sea Monster Waves & Serpentine Tails (Depth 0.38)
          ========================================================================= */}
      <div
        className="absolute top-[68%] -right-10 transition-transform duration-100 ease-out will-change-transform opacity-40"
        style={{
          transform: `translate3d(${Math.cos(scrollY * 0.003) * 16 + mx * 22}px, ${scrollY * 0.38 + my * 18}px, 0)`,
        }}
      >
        <div className="anim-kraken">
          <svg width="250" height="190" viewBox="0 0 200 150" fill="none" stroke="#2b2118" strokeWidth="1.4">
            {/* Serpent coils in ocean */}
            <path
              d="M30,90 Q50,55 70,90 Q90,55 110,90 Q130,55 150,90"
              strokeWidth="2.2"
              strokeOpacity="0.6"
            />
            {/* Serpent Head with crest */}
            <path d="M150,90 Q170,70 178,55 Q165,58 155,70" strokeWidth="1.8" fill="#8ee59a" fillOpacity="0.25" />
            {/* Ocean foam ripples */}
            <path d="M15,102 Q55,92 95,102 T175,100" strokeOpacity="0.4" strokeDasharray="4 3" />
            <path d="M40,114 Q80,106 120,114 T190,110" strokeOpacity="0.3" strokeDasharray="3 3" />
            <text
              x="60"
              y="132"
              fontSize="8"
              fontFamily="serif"
              fontStyle="italic"
              fill="#2b2118"
              fillOpacity="0.4"
              letterSpacing="2"
            >
              HIC SUNT DRACONES
            </text>
          </svg>
        </div>
      </div>

      {/* =========================================================================
          LAYER 5: Southern Royal Astrolabe & Quadrant (Depth 0.46 - Deep Base)
          ========================================================================= */}
      <div
        className="absolute top-[84%] -left-14 transition-transform duration-100 ease-out will-change-transform opacity-30"
        style={{
          transform: `translate3d(${mx * 24}px, ${scrollY * 0.46 + my * 20}px, 0)`,
        }}
      >
        <div className="anim-rotate-ccw" style={{ transformOrigin: "170px 170px" }}>
          <svg width="340" height="340" viewBox="0 0 100 100" fill="none" stroke="#2b2118" strokeWidth="1">
            <circle cx="50" cy="50" r="45" strokeDasharray="3 3" strokeOpacity="0.3" />
            <circle cx="50" cy="50" r="32" strokeOpacity="0.25" />
            <line x1="5" y1="50" x2="95" y2="50" strokeOpacity="0.2" />
            <line x1="50" y1="5" x2="50" y2="95" strokeOpacity="0.2" />
            {/* Radial Degree Ticks */}
            <polygon points="50,15 52,47 50,50 48,47" fill="#2b2118" fillOpacity="0.12" />
            <polygon points="50,85 52,53 50,50 48,53" fill="#2b2118" fillOpacity="0.12" />
            <polygon points="15,50 47,48 50,50 47,52" fill="#2b2118" fillOpacity="0.12" />
            <polygon points="85,50 53,48 50,50 53,52" fill="#2b2118" fillOpacity="0.12" />
          </svg>
        </div>
      </div>
    </div>
  );
}
