import React from "react";
import BubblesBackground from "./BubblesBackground"; // if separated
import logo from "../assets/logo.png";

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
    <div className="relative w-full h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white overflow-hidden">
      <BubblesBackground />
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        <img src={logo} alt="Logo" className="mb-6 w-40 h-auto" />
        <div className="w-full max-w-md px-4 space-y-6">
          <h1 className="text-3xl font-semibold font-poppins text-center">
            {title}
          </h1>
          {children}
          {footer && <div>{footer}</div>}
        </div>
      </div>
    </div>
  );
}
