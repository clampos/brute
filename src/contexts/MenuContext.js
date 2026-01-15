import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from "react";
const MenuContext = createContext(undefined);
export function MenuProvider({ children }) {
    const [activeMenu, setActiveMenu] = useState(null);
    const openMenu = useCallback((menuId) => {
        setActiveMenu(menuId);
    }, []);
    const closeMenu = useCallback((menuId) => {
        setActiveMenu((current) => (current === menuId ? null : current));
    }, []);
    const toggleMenu = useCallback((menuId) => {
        setActiveMenu((current) => (current === menuId ? null : menuId));
    }, []);
    return (_jsx(MenuContext.Provider, { value: { activeMenu, openMenu, closeMenu, toggleMenu }, children: children }));
}
export function useMenu() {
    const context = useContext(MenuContext);
    if (!context) {
        throw new Error("useMenu must be used within a MenuProvider");
    }
    return context;
}
