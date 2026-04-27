import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "default" | "gradient" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  children: ReactNode;
};

export function Button({
  variant = "default",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "premium-ring inline-flex items-center justify-center rounded-lg font-medium tracking-[0.01em] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none";

  const sizes = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
  };

  const variants: Record<ButtonVariant, string> = {
    default:
      "border border-white/10 bg-white/[0.05] text-[#d4d4dc] hover:bg-white/[0.09] hover:border-white/20 hover:text-white",
    gradient:
      "ai-glow border border-indigo-500/40 bg-gradient-to-br from-indigo-600/80 to-violet-600/80 text-white hover:from-indigo-500/90 hover:to-violet-500/90 hover:shadow-glow",
    ghost:
      "border border-transparent text-muted hover:bg-white/[0.06] hover:text-text",
    danger:
      "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
