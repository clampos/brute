// OvalProgressIcon.tsx
import React from "react";

interface OvalProgressIconProps {
  progress: number; // 0 to 100
}

const OvalProgressIcon: React.FC<OvalProgressIconProps> = ({ progress }) => {
  const circumference = Math.PI * ((32 + 24) / 2); // approx perimeter of an oval
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
      <defs>
        <linearGradient id="ovalGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="34.57%" stopColor="#C393FF" />
          <stop offset="100%" stopColor="#E42A6C" />
        </linearGradient>
      </defs>

      {/* White-filled center oval */}
      <ellipse cx="16" cy="12" rx="10" ry="8" fill="white" />

      {/* Gradient stroke oval */}
      <ellipse
        cx="16"
        cy="12"
        rx="10"
        ry="8"
        fill="none"
        stroke="url(#ovalGradient)"
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 16 12)" // start from top
      />
    </svg>
  );
};

export default OvalProgressIcon;
