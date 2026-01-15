import { jsx as _jsx } from "react/jsx-runtime";
export default function GradientBackground({ children }) {
    return (_jsx("div", { className: "min-h-screen w-full flex flex-col items-center justify-center bg-gradient-radial text-white", children: children }));
}
