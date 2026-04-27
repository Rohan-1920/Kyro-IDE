import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coder — AI-Powered IDE",
  description: "Professional AI-powered coding environment by Coder."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
