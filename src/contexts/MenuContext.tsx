import React, { createContext, useContext, useState, useCallback } from "react";

type MenuContextType = {
  activeMenu: string | null;
  openMenu: (menuId: string) => void;
  closeMenu: (menuId: string) => void;
  toggleMenu: (menuId: string) => void;
};

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const openMenu = useCallback((menuId: string) => {
    setActiveMenu(menuId);
  }, []);

  const closeMenu = useCallback((menuId: string) => {
    setActiveMenu((current) => (current === menuId ? null : current));
  }, []);

  const toggleMenu = useCallback((menuId: string) => {
    setActiveMenu((current) => (current === menuId ? null : menuId));
  }, []);

  return (
    <MenuContext.Provider
      value={{ activeMenu, openMenu, closeMenu, toggleMenu }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
