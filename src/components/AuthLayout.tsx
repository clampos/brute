// src/components/AuthLayout.tsx
import React from "react";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthLayout({
  title,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white px-6">
      <div className="w-full max-w-md px-4 space-y-6 mt-6">
        <h1 className="text-3xl font-semibold mb-6 font-poppins text-center">
          {title}
        </h1>
        {children}
        {footer && <div>{footer}</div>}
      </div>
    </div>
  );
}
