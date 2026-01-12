import React from "react";
import logo from "../assets/logo.png";
import { MoreHorizontal } from "lucide-react";

type Props = {
  title: string;
  pageIcon?: React.ReactNode;
  onMore?: () => void;
};

export default function TopBar({ title, pageIcon, onMore }: Props) {
  return (
    <div className="w-full max-w-[375px] px-4 mx-auto">
      {/* Logo row (centered) */}
      <div className="w-full h-[44px] flex justify-center items-center">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain"
        />
      </div>

      {/* Title row with left icon and right more button */}
      <div className="flex justify-between items-center mt-2 px-2 h-10 relative">
        <div className="flex items-center">
          {pageIcon ? (
            <div className="text-white">{pageIcon}</div>
          ) : (
            <div style={{ width: 24 }} />
          )}
        </div>

        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          {title}
        </h2>

        <div>
          <button onClick={onMore} aria-label="more" className="text-white">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
