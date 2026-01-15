import { jsx as _jsx } from "react/jsx-runtime";
import chestIcon from "../assets/Icons/Chest Icon.png";
import backIcon from "../assets/Icons/Back Icon Muscle.png";
import shoulderIcon from "../assets/Icons/Shoulder Icon.png";
import bicepIcon from "../assets/Icons/Bicep Icon.png";
import legIcon from "../assets/Icons/Leg Icon.png";
import calfIcon from "../assets/Icons/Calves Icon.png";
function getIconImage(group) {
    const g = (group || "").toLowerCase().trim();
    // Chest
    if (g.includes("chest")) {
        return chestIcon;
    }
    // Back
    if (g.includes("back") || g.includes("lat")) {
        return backIcon;
    }
    // Shoulders/Traps
    if (g.includes("shoulder") || g.includes("trap")) {
        return shoulderIcon;
    }
    // Arms
    if (g.includes("bicep") ||
        g.includes("tricep") ||
        g.includes("forearm") ||
        (g.includes("arm") && !g.includes("back"))) {
        return bicepIcon;
    }
    // Legs
    if (g.includes("quad") ||
        g.includes("hamstring") ||
        g.includes("glute") ||
        g.includes("calf") ||
        g.includes("adductor") ||
        g.includes("abductor") ||
        g.includes("leg")) {
        return g.includes("calf") ? calfIcon : legIcon;
    }
    // Abs
    if (g.includes("abdom") || g.includes("core") || g.includes("abs")) {
        return chestIcon;
    }
    // Default
    return chestIcon;
}
export default function MuscleIcon({ muscleGroup, size = 40 }) {
    const iconImage = getIconImage(muscleGroup || "");
    return (_jsx("div", { style: {
            width: size,
            height: size,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        }, title: muscleGroup, role: "img", "aria-label": muscleGroup, children: _jsx("img", { src: iconImage, alt: muscleGroup, style: {
                width: "100%",
                height: "100%",
                objectFit: "contain",
            } }) }));
}
