import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function getIconSVG(group) {
    const g = (group || "").toLowerCase().trim();
    // Chest
    if (g.includes("chest")) {
        return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12 6V18" }), _jsx("ellipse", { cx: "8", cy: "12", rx: "3", ry: "5" }), _jsx("ellipse", { cx: "16", cy: "12", rx: "3", ry: "5" })] }));
    }
    // Back
    if (g.includes("back") || g.includes("lat")) {
        return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M12 6V18" }), _jsx("path", { d: "M6 10L12 8L18 10" }), _jsx("path", { d: "M6 14L12 16L18 14" })] }));
    }
    // Shoulders/Traps
    if (g.includes("shoulder") || g.includes("trap")) {
        return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "5", cy: "10", r: "2" }), _jsx("circle", { cx: "19", cy: "10", r: "2" }), _jsx("line", { x1: "7", y1: "11", x2: "17", y2: "11" }), _jsx("path", { d: "M7 11V16" }), _jsx("path", { d: "M17 11V16" })] }));
    }
    // Arms
    if (g.includes("bicep") ||
        g.includes("tricep") ||
        g.includes("forearm") ||
        (g.includes("arm") && !g.includes("back"))) {
        return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M7 7L6 15" }), _jsx("path", { d: "M17 7L18 15" }), _jsx("circle", { cx: "6", cy: "6", r: "1.5" }), _jsx("circle", { cx: "18", cy: "6", r: "1.5" })] }));
    }
    // Legs
    if (g.includes("quad") ||
        g.includes("hamstring") ||
        g.includes("glute") ||
        g.includes("calf") ||
        g.includes("adductor") ||
        g.includes("abductor") ||
        g.includes("leg")) {
        return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "8", y1: "5", x2: "8", y2: "18" }), _jsx("line", { x1: "16", y1: "5", x2: "16", y2: "18" }), _jsx("circle", { cx: "8", cy: "4", r: "1" }), _jsx("circle", { cx: "16", cy: "4", r: "1" })] }));
    }
    // Abs
    if (g.includes("abdom") || g.includes("core") || g.includes("abs")) {
        return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "6", width: "6", height: "12", rx: "1" }), _jsx("line", { x1: "9", y1: "9", x2: "15", y2: "9" }), _jsx("line", { x1: "9", y1: "12", x2: "15", y2: "12" }), _jsx("line", { x1: "9", y1: "15", x2: "15", y2: "15" })] }));
    }
    // Default
    return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "#86FF99", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "5", r: "2" }), _jsx("path", { d: "M12 7V12" }), _jsx("line", { x1: "7", y1: "9", x2: "17", y2: "9" }), _jsx("line", { x1: "8", y1: "12L8 18" }), _jsx("line", { x1: "16", y1: "12L16 18" })] }));
}
export default function MuscleIcon({ muscleGroup, size = 40 }) {
    return (_jsx("div", { style: {
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        }, title: muscleGroup, role: "img", "aria-label": muscleGroup, children: getIconSVG(muscleGroup || "") }));
}
