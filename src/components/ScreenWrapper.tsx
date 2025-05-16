// src/components/GradientBackground.tsx
import { ReactNode } from "react";

export default function GradientBackground({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-radial text-white">
      {children}
    </div>
  );
}
