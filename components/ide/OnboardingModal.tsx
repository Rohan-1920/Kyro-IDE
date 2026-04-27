"use client";

import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

type OnboardingModalProps = {
  open: boolean;
  selectedLevel: string;
  onSelectLevel: (level: string) => void;
  onStart: () => void;
};

const levels = [
  { id: "Beginner", label: "Beginner", desc: "Coding seekh raha hun", icon: "🌱" },
  { id: "Intermediate", label: "Intermediate", desc: "Kuch experience hai", icon: "⚡" },
  { id: "Advanced", label: "Advanced", desc: "Professional developer", icon: "🚀" },
];

const features = [
  { icon: "✦", label: "AI Code Assistant", desc: "Real-time help & fixes" },
  { icon: "📖", label: "Learning Mode", desc: "Inline tips & explanations" },
  { icon: "🔴", label: "Error Detection", desc: "Smart error highlighting" },
  { icon: "⚡", label: "Fast Terminal", desc: "Integrated dev environment" },
];

export function OnboardingModal({
  open,
  selectedLevel,
  onSelectLevel,
  onStart,
}: OnboardingModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] shadow-soft"
      >
        {/* Header */}
        <div className="border-b border-white/[0.07] bg-gradient-to-r from-indigo-600/20 to-violet-600/10 px-6 py-5">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-glow">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 12h6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-white">Coder</h1>
              <p className="text-[11px] text-[#6b6b78]">AI-Powered Development Environment</p>
            </div>
          </div>
          <p className="text-[13px] text-[#9898a6]">
            Apna skill level select karo — Coder AI aapke level ke hisaab se help karega.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 border-b border-white/[0.07] p-4">
          {features.map((f) => (
            <div key={f.label} className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
              <span className="text-base">{f.icon}</span>
              <div>
                <p className="text-[11px] font-semibold text-[#d4d4dc]">{f.label}</p>
                <p className="text-[10px] text-[#5a5a68]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Level selection */}
        <div className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a5a68]">
            Skill Level
          </p>
          <div className="mb-4 flex gap-2">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => onSelectLevel(level.id)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 text-center transition-all ${
                  selectedLevel === level.id
                    ? "border-indigo-500/50 bg-indigo-500/15 text-white"
                    : "border-white/[0.07] bg-white/[0.02] text-[#6b6b78] hover:border-white/15 hover:bg-white/[0.05] hover:text-[#a0a0b0]"
                }`}
              >
                <span className="text-xl">{level.icon}</span>
                <span className="text-[12px] font-semibold">{level.label}</span>
                <span className="text-[10px] opacity-70">{level.desc}</span>
              </button>
            ))}
          </div>

          <Button
            variant="gradient"
            className="w-full justify-center py-2.5 text-[13px]"
            onClick={onStart}
          >
            Start Coding with Coder AI →
          </Button>
          <p className="mt-2 text-center text-[10px] text-[#3d3d4a]">
            Free to use · No account required
          </p>
        </div>
      </motion.div>
    </div>
  );
}
