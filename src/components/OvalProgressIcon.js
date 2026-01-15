import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const OvalProgressIcon = ({ progress }) => {
    const circumference = Math.PI * ((32 + 24) / 2); // approx perimeter of an oval
    const offset = circumference - (progress / 100) * circumference;
    return (_jsxs("svg", { width: "32", height: "24", viewBox: "0 0 32 24", fill: "none", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "ovalGradient", x1: "0", y1: "0", x2: "1", y2: "1", children: [_jsx("stop", { offset: "34.57%", stopColor: "#C393FF" }), _jsx("stop", { offset: "100%", stopColor: "#E42A6C" })] }) }), _jsx("ellipse", { cx: "16", cy: "12", rx: "10", ry: "8", fill: "white" }), _jsx("ellipse", { cx: "16", cy: "12", rx: "10", ry: "8", fill: "none", stroke: "url(#ovalGradient)", strokeWidth: "6", strokeDasharray: circumference, strokeDashoffset: offset, strokeLinecap: "round", transform: "rotate(-90 16 12)" // start from top
             })] }));
};
export default OvalProgressIcon;
