import React, { useState, useEffect } from "react";
import { sound } from "../lib/audio";

export interface AudioControllerProps {
  compact?: boolean;
}

export default function AudioController({ compact = false }: AudioControllerProps) {
  const [muted, setMuted] = useState(sound.isMuted());
  const [volume, setVolume] = useState(sound.getVolume());
  const [showSlider, setShowSlider] = useState(false);

  useEffect(() => {
    setMuted(sound.isMuted());
    setVolume(sound.getVolume());
  }, []);

  const handleToggle = () => {
    const nextMuted = sound.toggleMute();
    setMuted(nextMuted);
    if (!nextMuted) {
      sound.playSelect();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    sound.setVolume(newVol);
    if (muted && newVol > 0) {
      sound.toggleMute();
      setMuted(false);
    }
  };

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1.5 rounded-lg border-2 border-[#2b2118] bg-white/85 px-2.5 py-1 text-xs font-black text-[#2b2118] transition-all hover:bg-white active:scale-95 shadow-sm ${
          muted ? "opacity-60 bg-stone-200" : ""
        }`}
        title={muted ? "Unmute Sound Effects" : "Mute Sound Effects"}
        aria-label="Audio controller"
      >
        {muted ? (
          // Speaker Muted SVG
          <svg className="h-4 w-4 stroke-[#2b2118] stroke-2 fill-none" viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          // Speaker Playing SVG
          <svg className="h-4 w-4 stroke-[#2b2118] stroke-2 fill-none" viewBox="0 0 24 24">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            {volume > 0.5 ? <path d="M19.07 4.93a10 10 0 0 1 0 14.14" /> : null}
          </svg>
        )}
        {!compact ? <span>{muted ? "MUTED" : `SFX ${Math.round(volume * 100)}%`}</span> : null}
      </button>

      {/* Volume Hover Slider Flyout */}
      {showSlider ? (
        <div
          className="absolute left-0 top-full mt-1 z-50 flex flex-col gap-1 rounded-xl border-2 border-[#2b2118] bg-[#fbf4de] p-2.5 shadow-xl w-36"
        >
          <div className="flex items-center justify-between text-[10px] font-black text-[#2b2118]">
            <span>VOLUME</span>
            <span>{muted ? "OFF" : `${Math.round(volume * 100)}%`}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="h-2 w-full accent-[#2b2118] cursor-pointer"
          />
          <div className="flex justify-between mt-0.5">
            <button
              onClick={() => {
                sound.playMove();
              }}
              className="text-[9px] font-black text-amber-900 underline hover:text-[#2b2118]"
            >
              Test Move
            </button>
            <button
              onClick={() => {
                sound.playDraft();
              }}
              className="text-[9px] font-black text-amber-900 underline hover:text-[#2b2118]"
            >
              Test Coins
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
