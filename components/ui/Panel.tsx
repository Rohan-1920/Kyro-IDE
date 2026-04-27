import type { ReactNode } from "react";

type PanelProps = {
  children: ReactNode;
  className?: string;
};

export function Panel({ children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-xl border border-white/[0.07] panel-bg shadow-panel ${className}`.trim()}
    >
      {children}
    </section>
  );
}
