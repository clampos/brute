import React, { useState, useEffect } from "react";
import logo from "../assets/logo.png";
import { MoreHorizontal } from "lucide-react";

type MenuItem = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  pageIcon?: React.ReactNode;
  menuItems?: MenuItem[];
};

export default function TopBar({ title, pageIcon, menuItems }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the click is on a menu button or inside a dropdown menu
      const isMenuButton = target.closest('button[aria-haspopup]');
      const isDropdownMenu = target.closest('.dropdown-menu');
      
      // Close menu if clicking outside both the button and the dropdown menu
      if (!isMenuButton && !isDropdownMenu) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [menuOpen]);

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

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="more"
            className="text-white"
            aria-haspopup
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-6 h-6" />
          </button>

          {menuOpen && menuItems && menuItems.length > 0 && (
            <div className="dropdown-menu absolute right-0 mt-2 w-56 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50">
              <div className="px-3 py-2 text-xs text-[#9CA3AF] font-semibold">
                SHORTCUTS TO
              </div>
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className="w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm"
                  onClick={() => {
                    item.onClick();
                    setMenuOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
