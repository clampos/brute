import { jsx as _jsx } from "react/jsx-runtime";
import ChestIcon from "../assets/Icons/Chest Icon.png";
import BackIcon from "../assets/Icons/Back Icon Muscle.png";
import ShoulderIcon from "../assets/Icons/Shoulder Icon.png";
import BicepIcon from "../assets/Icons/Bicep Icon.png";
import LegIcon from "../assets/Icons/Leg Icon.png";
import CalvesIcon from "../assets/Icons/Calves Icon.png";
function getIconImage(group) {
    const g = (group || "").toLowerCase().trim();
    if (g.includes("chest"))
        return ChestIcon;
    if (g.includes("back") || g.includes("lat"))
        return BackIcon;
    if (g.includes("shoulder") || g.includes("trap"))
        return ShoulderIcon;
    if (g.includes("bicep") || g.includes("tricep") || g.includes("forearm") || (g.includes("arm") && !g.includes("back")))
        return BicepIcon;
    if (g.includes("quad") || g.includes("hamstring") || g.includes("glute") || g.includes("adductor") || g.includes("abductor") || (g.includes("leg") && !g.includes("bicep")))
        return LegIcon;
    if (g.includes("calf"))
        return CalvesIcon;
    return ChestIcon; // Default
}
export default function MuscleIcon({ muscleGroup, size = 40 }) {
    return (_jsx("img", { src: getIconImage(muscleGroup || ""), alt: muscleGroup, title: muscleGroup, style: {
            width: size,
            height: size,
            objectFit: "contain",
        } }));
}
