import React, { useState, useRef, useEffect } from "react";

type Option = { value: string | number; label: string };

type Props = {
  options: Option[];
  value: string | number | null;
  onChange: (v: string | number) => void;
  placeholder?: string;
};

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = options.find((o) => o.value === value)?.label || "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left bg-transparent outline-none text-white"
        aria-haspopup
        aria-expanded={open}
      >
        <div className="w-full bg-transparent outline-none text-white py-1 relative flex items-center">
          <span className="text-[#9CA3AF]">
            {selected || placeholder || "Select..."}
          </span>
          <svg
            className="absolute right-2 top-1/2 -translate-y-1/2"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            focusable={false}
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {open && (
        <ul
          className="absolute left-0 right-0 mt-2 max-h-56 overflow-auto rounded shadow-lg"
          style={{ background: "#0B1117", zIndex: 9999, pointerEvents: "auto" }}
        >
          {options.map((opt, idx) => {
            const isHighlighted = highlight === idx;
            return (
              <li
                key={String(opt.value)}
                onMouseEnter={() => setHighlight(idx)}
                onMouseOver={() => setHighlight(idx)}
                onMouseLeave={() => setHighlight(null)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                role="option"
                tabIndex={0}
                style={{
                  padding: "8px 16px",
                  cursor: "pointer",
                  backgroundColor: isHighlighted ? "#246BFD" : "transparent",
                  color: "#FFFFFF",
                  pointerEvents: "auto",
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
