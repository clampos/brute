import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import logo from "../assets/logo.png";
import { MoreHorizontal } from "lucide-react";
import { useMenu } from "../contexts/MenuContext";
export default function TopBar({ title, pageIcon, menuItems }) {
    const menuRef = useRef(null);
    const { activeMenu, toggleMenu, closeMenu } = useMenu();
    const menuId = "topbar-menu";
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                closeMenu(menuId);
            }
        };
        if (activeMenu === menuId) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [activeMenu, menuId, closeMenu]);
    return (_jsxs("div", { className: "w-full max-w-[375px] px-4 mx-auto", children: [_jsx("div", { className: "w-full h-[44px] flex justify-center items-center", children: _jsx("img", { src: logo, alt: "Logo", className: "w-[84.56px] h-[15px] object-contain" }) }), _jsxs("div", { className: "flex justify-between items-center mt-2 px-2 h-10 relative", children: [_jsx("div", { className: "flex items-center", children: pageIcon ? (_jsx("div", { className: "text-white", children: pageIcon })) : (_jsx("div", { style: { width: 24 } })) }), _jsx("h2", { className: "absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl", children: title }), _jsxs("div", { className: "relative", ref: menuRef, children: [_jsx("button", { onClick: () => toggleMenu(menuId), "aria-label": "more", className: "text-white", "aria-haspopup": true, "aria-expanded": activeMenu === menuId, children: _jsx(MoreHorizontal, { className: "w-6 h-6" }) }), activeMenu === menuId && menuItems && menuItems.length > 0 && (_jsxs("div", { className: "absolute right-0 mt-2 w-56 bg-[#1A1D23] border border-[#2F3544] rounded-lg shadow-lg z-50", children: [_jsx("div", { className: "px-3 py-2 text-xs text-[#9CA3AF] font-semibold", children: "SHORTCUTS TO" }), menuItems.map((item, index) => (_jsx("button", { className: "w-full text-left px-3 py-2 hover:bg-[#2A2E38] text-white text-sm", onClick: () => {
                                            item.onClick();
                                            closeMenu(menuId);
                                        }, children: item.label }, index)))] }))] })] })] }));
}
