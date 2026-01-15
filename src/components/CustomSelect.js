import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
export default function CustomSelect({ options, value, onChange, placeholder, }) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(null);
    const ref = useRef(null);
    useEffect(() => {
        const onDoc = (e) => {
            if (!ref.current)
                return;
            if (!ref.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);
    const selected = options.find((o) => o.value === value)?.label || "";
    return (_jsxs("div", { className: "relative", ref: ref, children: [_jsx("button", { type: "button", onClick: () => setOpen((s) => !s), className: "w-full text-left bg-transparent outline-none text-white", "aria-haspopup": true, "aria-expanded": open, children: _jsxs("div", { className: "w-full bg-[#262A34] border border-[#404854] rounded-lg outline-none text-white py-2 px-3 relative flex items-center justify-between hover:bg-[#2D3139] transition-colors", children: [_jsx("span", { className: "text-white", children: selected || placeholder || "Select..." }), _jsx("svg", { className: `transition-transform ${open ? "rotate-180" : ""}`, width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true, focusable: false, children: _jsx("path", { d: "M6 9l6 6 6-6", stroke: "#9CA3AF", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })] }) }), open && (_jsx("ul", { className: "absolute left-0 right-0 mt-2 max-h-60 overflow-auto rounded-lg border border-[#404854]", style: { background: "#262A34", zIndex: 9999, pointerEvents: "auto" }, children: options.map((opt, idx) => {
                    const isHighlighted = highlight === idx;
                    return (_jsx("li", { onMouseEnter: () => setHighlight(idx), onMouseOver: () => setHighlight(idx), onMouseLeave: () => setHighlight(null), onClick: () => {
                            onChange(opt.value);
                            setOpen(false);
                        }, role: "option", tabIndex: 0, style: {
                            padding: "10px 16px",
                            cursor: "pointer",
                            backgroundColor: isHighlighted ? "#246BFD" : "transparent",
                            color: "#FFFFFF",
                            pointerEvents: "auto",
                            fontSize: "14px",
                        }, children: opt.label }, String(opt.value)));
                }) }))] }));
}
