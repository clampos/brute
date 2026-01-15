import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import BubblesBackground from "./BubblesBackground"; // if separated
import logo from "../assets/logo.png";
export default function AuthLayout({ title, children, footer, }) {
    return (_jsxs("div", { className: "relative w-full h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white overflow-hidden", children: [_jsx(BubblesBackground, {}), _jsxs("div", { className: "relative z-10 flex flex-col items-center justify-center h-full px-6", children: [_jsx("img", { src: logo, alt: "Logo", className: "mb-6 w-40 h-auto" }), _jsxs("div", { className: "w-full max-w-md px-4 space-y-6", children: [_jsx("h1", { className: "text-3xl font-semibold font-poppins text-center", children: title }), children, footer && _jsx("div", { children: footer })] })] })] }));
}
