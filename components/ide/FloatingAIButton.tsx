"use client";

import { motion } from "framer-motion";

type FloatingAIButtonProps = {
  onClick: () => void;
  isOpen: boolean;
};

export function FloatingAIButton({ onClick, isOpen }: FloatingAIButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={isOpen ? "Close AI" : "Open Coder AI"}
      className="premium-ring fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-indigo-500/40 bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-[0_0_28px_rgba(99,102,241,0.6)] transition-shadow hover:shadow-[0_0_36px_rgba(99,102,241,0.8)] xl:hidden"
    >
      <motion.span
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
        className="text-lg font-bold"
      >
        ✦
      </motion.span>
    </motion.button>
  );
}
