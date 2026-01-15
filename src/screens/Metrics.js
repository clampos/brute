import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Award, Plus, X, Check, ChevronLeft, ChevronRight, Edit2, Trash2, } from "lucide-react";
import MuscleIcon from "../components/MuscleIcon";
import TopBar from "../components/TopBar";
import { Link } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import { getUnitPreference, getWeightDisplayPreference, setWeightDisplayPreference, formatWeight, kgToLbs, lbsToKg, kgToStone, stoneAndLbsToKg, } from "../utils/unitConversions";
export default function Metrics() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("bodyweight");
    // Unit system state
    const [unitSystem, setUnitSystem] = useState(getUnitPreference());
    const [imperialWeightType, setImperialWeightType] = useState(getWeightDisplayPreference());
    // Bodyweight tracking
    const [bodyweightHistory, setBodyweightHistory] = useState([]);
    const [showAddBodyweight, setShowAddBodyweight] = useState(false);
    const [newBodyweight, setNewBodyweight] = useState("");
    const [editingBodyweightId, setEditingBodyweightId] = useState(null);
    // Imperial weight input state
    const [newWeightStone, setNewWeightStone] = useState("");
    const [newWeightLbs, setNewWeightLbs] = useState("");
    // Bodyfat tracking
    const [bodyfatHistory, setBodyfatHistory] = useState([]);
    const [showAddBodyfat, setShowAddBodyfat] = useState(false);
    const [newBodyfat, setNewBodyfat] = useState("");
    const [editingBodyfatId, setEditingBodyfatId] = useState(null);
    // Personal Records
    const [personalRecords, setPersonalRecords] = useState([]);
    // Graph scrolling
    const graphRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    useEffect(() => {
        const savedUnit = getUnitPreference();
        const savedWeightType = getWeightDisplayPreference();
        setUnitSystem(savedUnit);
        setImperialWeightType(savedWeightType);
    }, []);
    useEffect(() => {
        const fetchMetrics = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                navigate("/login");
                return;
            }
            try {
                // Fetch bodyweight history
                const bodyweightRes = await fetch("http://localhost:4242/auth/metrics/bodyweight", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (bodyweightRes.ok) {
                    const data = await bodyweightRes.json();
                    setBodyweightHistory(data);
                }
                // Fetch bodyfat history
                const bodyfatRes = await fetch("http://localhost:4242/auth/metrics/bodyfat", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (bodyfatRes.ok) {
                    const data = await bodyfatRes.json();
                    setBodyfatHistory(data);
                }
                // Fetch personal records
                const prsRes = await fetch("http://localhost:4242/auth/metrics/personal-records", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (prsRes.ok) {
                    const data = await prsRes.json();
                    // Only keep exercises that have at least one PR entry (1,2,3,5,10)
                    const filtered = data.filter((d) => Object.values(d.prs || {}).some((v) => v != null));
                    setPersonalRecords(filtered);
                }
                setLoading(false);
            }
            catch (error) {
                console.error("Error fetching metrics:", error);
                setLoading(false);
            }
        };
        fetchMetrics();
    }, [navigate]);
    // Check scroll position
    const checkScroll = () => {
        if (graphRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = graphRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };
    useEffect(() => {
        checkScroll();
    }, [bodyweightHistory, bodyfatHistory, activeTab]);
    const scrollGraph = (direction) => {
        if (graphRef.current) {
            const scrollAmount = 200;
            graphRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
            setTimeout(checkScroll, 300);
        }
    };
    const handleAddBodyweight = async () => {
        let weightInKg;
        if (unitSystem === "metric") {
            const weight = parseFloat(newBodyweight);
            if (!weight || weight <= 0) {
                alert("Please enter a valid weight");
                return;
            }
            weightInKg = weight;
        }
        else {
            // Imperial
            if (imperialWeightType === "stone") {
                const stone = parseFloat(newWeightStone) || 0;
                const lbs = parseFloat(newWeightLbs) || 0;
                if (stone === 0 && lbs === 0) {
                    alert("Please enter a valid weight");
                    return;
                }
                weightInKg = stoneAndLbsToKg(stone, lbs);
            }
            else {
                const lbs = parseFloat(newBodyweight);
                if (!lbs || lbs <= 0) {
                    alert("Please enter a valid weight");
                    return;
                }
                weightInKg = lbsToKg(lbs);
            }
        }
        const token = localStorage.getItem("token");
        try {
            const response = await fetch("http://localhost:4242/auth/metrics/bodyweight", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ weight: weightInKg }),
            });
            if (response.ok) {
                const newEntry = await response.json();
                setBodyweightHistory([newEntry, ...bodyweightHistory]);
                setNewBodyweight("");
                setNewWeightStone("");
                setNewWeightLbs("");
                setShowAddBodyweight(false);
            }
        }
        catch (error) {
            console.error("Error adding bodyweight:", error);
        }
    };
    const handleAddBodyfat = async () => {
        const bodyfat = parseFloat(newBodyfat);
        if (!bodyfat || bodyfat <= 0 || bodyfat > 100) {
            alert("Please enter a valid body fat percentage (0-100)");
            return;
        }
        const token = localStorage.getItem("token");
        try {
            const response = await fetch("http://localhost:4242/auth/metrics/bodyfat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ bodyfat }),
            });
            if (response.ok) {
                const newEntry = await response.json();
                setBodyfatHistory([newEntry, ...bodyfatHistory]);
                setNewBodyfat("");
                setShowAddBodyfat(false);
            }
        }
        catch (error) {
            console.error("Error adding bodyfat:", error);
        }
    };
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("installPromptDismissed");
        navigate("/login");
    };
    const deleteBodyweightEntry = async (id) => {
        if (!confirm("Delete this bodyweight entry?"))
            return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:4242/auth/metrics/bodyweight/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setBodyweightHistory(bodyweightHistory.filter((e) => e.id !== id));
            }
        }
        catch (error) {
            console.error("Error deleting bodyweight entry:", error);
        }
    };
    const deleteBodyfatEntry = async (id) => {
        if (!confirm("Delete this body fat entry?"))
            return;
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`http://localhost:4242/auth/metrics/bodyfat/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (response.ok) {
                setBodyfatHistory(bodyfatHistory.filter((e) => e.id !== id));
            }
        }
        catch (error) {
            console.error("Error deleting bodyfat entry:", error);
        }
    };
    const editBodyweightEntry = (entry) => {
        setEditingBodyweightId(entry.id);
        setNewBodyweight(entry.weight.toString());
    };
    const editBodyfatEntry = (entry) => {
        setEditingBodyfatId(entry.id);
        setNewBodyfat(entry.bodyfat.toString());
    };
    const saveEditedBodyweight = async () => {
        if (!editingBodyweightId)
            return;
        try {
            const token = localStorage.getItem("token");
            const weight = parseFloat(newBodyweight);
            const response = await fetch(`http://localhost:4242/auth/metrics/bodyweight/${editingBodyweightId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ weight }),
            });
            if (response.ok) {
                const updated = await response.json();
                setBodyweightHistory(bodyweightHistory.map((e) => e.id === editingBodyweightId ? updated : e));
                setEditingBodyweightId(null);
                setNewBodyweight("");
            }
        }
        catch (error) {
            console.error("Error updating bodyweight entry:", error);
        }
    };
    const saveEditedBodyfat = async () => {
        if (!editingBodyfatId)
            return;
        try {
            const token = localStorage.getItem("token");
            const bodyfat = parseFloat(newBodyfat);
            const response = await fetch(`http://localhost:4242/auth/metrics/bodyfat/${editingBodyfatId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ bodyfat }),
            });
            if (response.ok) {
                const updated = await response.json();
                setBodyfatHistory(bodyfatHistory.map((e) => (e.id === editingBodyfatId ? updated : e)));
                setEditingBodyfatId(null);
                setNewBodyfat("");
            }
        }
        catch (error) {
            console.error("Error updating bodyfat entry:", error);
        }
    };
    const toggleImperialWeightType = () => {
        const newType = imperialWeightType === "lbs" ? "stone" : "lbs";
        setImperialWeightType(newType);
        setWeightDisplayPreference(newType);
    };
    const calculateTrend = (history, key) => {
        if (history.length < 2)
            return null;
        const latest = history[0][key];
        const previous = history[1][key];
        const diff = latest - previous;
        const percentChange = ((diff / previous) * 100).toFixed(1);
        return { diff: diff.toFixed(1), percentChange, isPositive: diff > 0 };
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };
    const formatShortDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
        });
    };
    const renderLineGraph = (data, valueKey, color, unit) => {
        if (data.length === 0)
            return null;
        const sortedData = [...data].reverse();
        const values = sortedData.map((d) => d[valueKey]);
        const dataMin = Math.min(...values);
        const dataMax = Math.max(...values);
        const dataRange = dataMax - dataMin || 1;
        const padding = dataRange * 0.1;
        // Initial graph layout
        const graphHeight = 200;
        const graphWidth = Math.max(sortedData.length * 80, 300);
        const leftMargin = 60;
        const rightMargin = 20;
        const bottomMargin = 60;
        const topMargin = 50;
        const plotWidth = graphWidth - leftMargin - rightMargin;
        const plotHeight = graphHeight;
        // Compute 'nice' tick step so labels are evenly spaced and make sense
        const rawMin = dataMin - padding;
        const rawMax = dataMax + padding;
        const targetTicks = 5; // 5 tick positions (4 segments)
        const rawStep = (rawMax - rawMin) / (targetTicks - 1) || 1;
        // Nice numbers sequence
        const niceSteps = [1, 2, 2.5, 5, 10];
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        let step = magnitude;
        for (let n of niceSteps) {
            if (n * magnitude >= rawStep) {
                step = n * magnitude;
                break;
            }
        }
        // Compute rounded bounds using the chosen step
        let yMin = Math.floor(rawMin / step) * step;
        let yMax = Math.ceil(rawMax / step) * step;
        // Ensure non-zero range
        if (yMax === yMin) {
            yMax = yMin + step;
        }
        const yRange = yMax - yMin;
        // Decide decimals: if step < 1 we need decimals, else integers. For weight axis, show one decimal.
        let decimals = 0;
        if (step < 1) {
            decimals = Math.max(1, -Math.floor(Math.log10(step)));
        }
        // Force one decimal for weight axis as requested
        if (valueKey === "weight")
            decimals = Math.max(decimals, 1);
        const yAxisLabels = [];
        for (let i = 0; i < targetTicks; i++) {
            const value = yMin + step * i;
            const normalized = i / (targetTicks - 1);
            const y = topMargin + plotHeight * (1 - normalized);
            yAxisLabels.push({ value: value.toFixed(decimals), y });
        }
        // Now compute points using settled yMin/yRange
        const points = sortedData.map((entry, index) => {
            const value = entry[valueKey];
            const normalized = (value - yMin) / yRange;
            const x = leftMargin + (index / (sortedData.length - 1)) * plotWidth;
            const y = topMargin + plotHeight * (1 - normalized);
            return { x, y, value, date: entry.date, index };
        });
        // Generate simple path (no gap detection)
        const pathD = points
            .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
            .join(" ");
        return (_jsxs("div", { className: "relative bg-[#262A34] rounded-xl p-4 mb-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h4", { className: "text-white font-semibold", children: "Progress Over Time" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => scrollGraph("left"), disabled: !canScrollLeft, className: `p-1 rounded ${canScrollLeft
                                        ? "bg-[#246BFD] text-white"
                                        : "bg-[#1F222B] text-[#5E6272]"}`, children: _jsx(ChevronLeft, { size: 20 }) }), _jsx("button", { onClick: () => scrollGraph("right"), disabled: !canScrollRight, className: `p-1 rounded ${canScrollRight
                                        ? "bg-[#246BFD] text-white"
                                        : "bg-[#1F222B] text-[#5E6272]"}`, children: _jsx(ChevronRight, { size: 20 }) })] })] }), _jsx("div", { ref: graphRef, className: "overflow-x-auto scrollbar-hide", onScroll: checkScroll, style: { scrollbarWidth: "none", msOverflowStyle: "none" }, children: _jsxs("svg", { width: graphWidth + rightMargin, height: graphHeight + bottomMargin + topMargin, className: "min-w-full", children: [_jsx("line", { x1: leftMargin, y1: topMargin, x2: leftMargin, y2: topMargin + plotHeight, stroke: "#5E6272", strokeWidth: "2" }), _jsx("line", { x1: leftMargin, y1: topMargin + plotHeight, x2: graphWidth, y2: topMargin + plotHeight, stroke: "#5E6272", strokeWidth: "2" }), yAxisLabels.map((label, i) => (_jsxs("g", { children: [_jsx("line", { x1: leftMargin, y1: label.y, x2: graphWidth, y2: label.y, stroke: "#1F222B", strokeWidth: "1", strokeDasharray: "3,3", opacity: "0.5" }), _jsx("line", { x1: leftMargin - 5, y1: label.y, x2: leftMargin, y2: label.y, stroke: "#5E6272", strokeWidth: "2" }), _jsx("text", { x: leftMargin - 10, y: label.y + 4, fill: "#FFFFFF", fontSize: "11", textAnchor: "end", fontWeight: "500", children: label.value })] }, i))), _jsx("defs", { children: _jsxs("linearGradient", { id: `gradient-${valueKey}`, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: "0.3" }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: "0" })] }) }), _jsx("path", { d: `${pathD} L ${points[points.length - 1].x} ${topMargin + plotHeight} L ${leftMargin} ${topMargin + plotHeight} Z`, fill: `url(#gradient-${valueKey})` }), _jsx("path", { d: pathD, stroke: color, strokeWidth: "3", fill: "none", strokeLinecap: "round", strokeLinejoin: "round" }), points.map((point, index) => {
                                const distanceFromTop = point.y - topMargin;
                                const labelBelow = distanceFromTop < 25;
                                return (_jsxs("g", { children: [_jsx("line", { x1: point.x, y1: topMargin, x2: point.x, y2: topMargin + plotHeight, stroke: "#1F222B", strokeWidth: "1", strokeDasharray: "3,3", opacity: "0.3" }), _jsx("circle", { cx: point.x, cy: point.y, r: "5", fill: color, stroke: "#262A34", strokeWidth: "2" }), _jsx("text", { x: point.x, y: topMargin + plotHeight + 20, fill: "#FFFFFF", fontSize: "10", textAnchor: "middle", fontWeight: "500", children: formatShortDate(point.date) }), _jsx("text", { x: point.x, y: labelBelow ? point.y + 20 : point.y - 15, fill: "#FFFFFF", fontSize: "11", textAnchor: "middle", fontWeight: "600", children: point.value.toFixed(1) })] }, index));
                            }), _jsx("text", { x: 20, y: topMargin + plotHeight / 2, fill: "#FFFFFF", fontSize: "11", fontWeight: "600", textAnchor: "middle", transform: `rotate(-90 20 ${topMargin + plotHeight / 2})`, children: valueKey === "weight"
                                    ? `Weight (${unit})`
                                    : `Body Fat (${unit})` }), _jsx("text", { x: (graphWidth + leftMargin) / 2, y: topMargin + plotHeight + bottomMargin - 10, fill: "#FFFFFF", fontSize: "11", fontWeight: "600", textAnchor: "middle", children: "Date" })] }) }), _jsx("p", { className: "text-[#5E6272] text-xs mt-4 text-center", children: "Scroll horizontally to view all data points" })] }));
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center text-white", style: {
                backgroundColor: "#0A0E1A",
            }, children: _jsx("p", { children: "Loading metrics..." }) }));
    }
    const getWeightUnit = () => {
        if (unitSystem === "metric")
            return "kg";
        return imperialWeightType === "stone" ? "st/lbs" : "lbs";
    };
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Track Metrics", pageIcon: _jsx(Award, { size: 18 }), menuItems: [
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Settings", onClick: () => navigate("/settings") },
                ] }), _jsxs("div", { className: "flex justify-around mt-6 mb-4", children: [_jsx("button", { onClick: () => setActiveTab("bodyweight"), className: `px-4 py-2 rounded-full font-medium text-sm ${activeTab === "bodyweight"
                            ? "bg-[#246BFD] text-white"
                            : "text-[#5E6272] bg-transparent"}`, children: "Bodyweight" }), _jsx("button", { onClick: () => setActiveTab("bodyfat"), className: `px-4 py-2 rounded-full font-medium text-sm ${activeTab === "bodyfat"
                            ? "bg-[#246BFD] text-white"
                            : "text-[#5E6272] bg-transparent"}`, children: "Body Fat" }), _jsx("button", { onClick: () => setActiveTab("prs"), className: `px-4 py-2 rounded-full font-medium text-sm ${activeTab === "prs"
                            ? "bg-[#246BFD] text-white"
                            : "text-[#5E6272] bg-transparent"}`, children: "PRs" })] }), activeTab === "bodyweight" && (_jsxs("div", { className: "space-y-4", children: [unitSystem === "imperial" && (_jsx("div", { className: "bg-[#262A34] rounded-xl p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-white font-medium", children: "Imperial Weight Format" }), _jsx("button", { onClick: toggleImperialWeightType, className: "px-4 py-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors", children: imperialWeightType === "lbs"
                                        ? "Switch to Stone"
                                        : "Switch to Pounds" })] }) })), bodyweightHistory.length > 0 && (_jsxs("div", { className: "bg-[#262A34] rounded-xl p-6", children: [_jsx("h3", { className: "text-white font-semibold text-lg mb-4", children: "Current Bodyweight" }), _jsxs("div", { className: "flex items-baseline gap-2 mb-2", children: [_jsx("span", { className: "text-4xl font-bold text-white", children: unitSystem === "metric"
                                            ? bodyweightHistory[0].weight
                                            : imperialWeightType === "stone"
                                                ? (() => {
                                                    const { stone, lbs } = kgToStone(bodyweightHistory[0].weight);
                                                    return `${stone} st ${lbs}`;
                                                })()
                                                : kgToLbs(bodyweightHistory[0].weight) }), _jsx("span", { className: "text-xl text-[#5E6272]", children: getWeightUnit() })] }), calculateTrend(bodyweightHistory, "weight") && (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [calculateTrend(bodyweightHistory, "weight").isPositive ? (_jsx(TrendingUp, { size: 16, className: "text-green-400" })) : (_jsx(TrendingDown, { size: 16, className: "text-red-400" })), _jsxs("span", { className: calculateTrend(bodyweightHistory, "weight").isPositive
                                            ? "text-green-400"
                                            : "text-red-400", children: [calculateTrend(bodyweightHistory, "weight").isPositive
                                                ? "+"
                                                : "", calculateTrend(bodyweightHistory, "weight").diff, " kg (", calculateTrend(bodyweightHistory, "weight").percentChange, "%)"] }), _jsx("span", { className: "text-[#5E6272]", children: "from last entry" })] }))] })), bodyweightHistory.length > 1 &&
                        renderLineGraph(bodyweightHistory, "weight", "#00FFAD", getWeightUnit()), !showAddBodyweight && (_jsxs("button", { onClick: () => setShowAddBodyweight(true), className: "w-full bg-[#246BFD] hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors", children: [_jsx(Plus, { size: 18 }), "Add Bodyweight Entry"] })), showAddBodyweight && (_jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h4", { className: "text-white font-semibold", children: "Add Bodyweight" }), _jsx("button", { onClick: () => setShowAddBodyweight(false), children: _jsx(X, { size: 20, className: "text-[#5E6272]" }) })] }), unitSystem === "metric" ? (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", value: newBodyweight, onChange: (e) => setNewBodyweight(e.target.value), placeholder: "Weight (kg)", step: "0.1", className: "flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none" }), _jsx("button", { onClick: handleAddBodyweight, className: "px-6 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Save" })] })) : imperialWeightType === "stone" ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", value: newWeightStone, onChange: (e) => setNewWeightStone(e.target.value), placeholder: "Stone", step: "1", min: "0", className: "flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none" }), _jsx("input", { type: "number", value: newWeightLbs, onChange: (e) => setNewWeightLbs(e.target.value), placeholder: "Pounds", step: "0.1", min: "0", max: "13.9", className: "flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none" })] }), _jsx("button", { onClick: handleAddBodyweight, className: "w-full px-6 py-3 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Save" })] })) : (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", value: newBodyweight, onChange: (e) => setNewBodyweight(e.target.value), placeholder: "Weight (lbs)", step: "0.1", className: "flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none" }), _jsx("button", { onClick: handleAddBodyweight, className: "px-6 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Save" })] }))] })), _jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsx("h4", { className: "text-white font-semibold mb-3", children: "History" }), bodyweightHistory.length > 0 ? (_jsx("div", { className: "space-y-2", children: bodyweightHistory.map((entry) => (_jsx("div", { className: "flex justify-between items-center py-3 px-4 bg-[#1F222B] rounded-lg", children: editingBodyweightId === entry.id ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "number", value: newBodyweight, onChange: (e) => setNewBodyweight(e.target.value), placeholder: "Weight", className: "bg-[#2A2E38] text-white rounded-md px-2 py-1 flex-1 placeholder:text-[#5E6272] text-sm", step: "0.1", inputMode: "decimal" }), _jsxs("div", { className: "flex gap-2 ml-3", children: [_jsx("button", { onClick: saveEditedBodyweight, className: "p-2 text-green-500 hover:bg-green-500/20 rounded transition", title: "Save", children: _jsx(Check, { size: 16 }) }), _jsx("button", { onClick: () => setEditingBodyweightId(null), className: "p-2 text-[#5E6272] hover:bg-[#5E6272]/20 rounded transition", title: "Cancel", children: _jsx(X, { size: 16 }) })] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex-1", children: _jsx("span", { className: "text-white font-medium", children: formatWeight(entry.weight, unitSystem, imperialWeightType === "stone") }) }), _jsx("span", { className: "text-[#5E6272] text-sm", children: formatDate(entry.date) }), _jsxs("div", { className: "flex gap-2 ml-3", children: [_jsx("button", { onClick: () => editBodyweightEntry(entry), className: "p-2 text-[#246BFD] hover:bg-[#246BFD]/20 rounded transition", title: "Edit", children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => deleteBodyweightEntry(entry.id), className: "p-2 text-red-500 hover:bg-red-500/20 rounded transition", title: "Delete", children: _jsx(Trash2, { size: 16 }) })] })] })) }, entry.id))) })) : (_jsx("p", { className: "text-[#5E6272] text-center py-4", children: "No entries yet. Add your first bodyweight entry above!" }))] })] })), activeTab === "bodyfat" && (_jsxs("div", { className: "space-y-4", children: [bodyfatHistory.length > 0 && (_jsxs("div", { className: "bg-[#262A34] rounded-xl p-6", children: [_jsx("h3", { className: "text-white font-semibold text-lg mb-4", children: "Current Body Fat" }), _jsxs("div", { className: "flex items-baseline gap-2 mb-2", children: [_jsx("span", { className: "text-4xl font-bold text-white", children: bodyfatHistory[0].bodyfat }), _jsx("span", { className: "text-xl text-[#5E6272]", children: "%" })] }), calculateTrend(bodyfatHistory, "bodyfat") && (_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [calculateTrend(bodyfatHistory, "bodyfat").isPositive ? (_jsx(TrendingUp, { size: 16, className: "text-red-400" })) : (_jsx(TrendingDown, { size: 16, className: "text-green-400" })), _jsxs("span", { className: calculateTrend(bodyfatHistory, "bodyfat").isPositive
                                            ? "text-red-400"
                                            : "text-green-400", children: [calculateTrend(bodyfatHistory, "bodyfat").isPositive
                                                ? "+"
                                                : "", calculateTrend(bodyfatHistory, "bodyfat").diff, "% (", calculateTrend(bodyfatHistory, "bodyfat").percentChange, "%)"] }), _jsx("span", { className: "text-[#5E6272]", children: "from last entry" })] }))] })), bodyfatHistory.length > 1 &&
                        renderLineGraph(bodyfatHistory, "bodyfat", "#FBA3FF", "%"), !showAddBodyfat && (_jsxs("button", { onClick: () => setShowAddBodyfat(true), className: "w-full bg-[#246BFD] hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors", children: [_jsx(Plus, { size: 18 }), "Add Body Fat Entry"] })), showAddBodyfat && (_jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h4", { className: "text-white font-semibold", children: "Add Body Fat" }), _jsx("button", { onClick: () => setShowAddBodyfat(false), children: _jsx(X, { size: 20, className: "text-[#5E6272]" }) })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", value: newBodyfat, onChange: (e) => setNewBodyfat(e.target.value), placeholder: "Body Fat (%)", step: "0.1", min: "0", max: "100", className: "flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none" }), _jsx("button", { onClick: handleAddBodyfat, className: "px-6 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium", children: "Save" })] })] })), _jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsx("h4", { className: "text-white font-semibold mb-3", children: "History" }), bodyfatHistory.length > 0 ? (_jsx("div", { className: "space-y-2", children: bodyfatHistory.map((entry) => (_jsx("div", { className: "flex justify-between items-center py-3 px-4 bg-[#1F222B] rounded-lg", children: editingBodyfatId === entry.id ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "number", value: newBodyfat, onChange: (e) => setNewBodyfat(e.target.value), placeholder: "Body Fat %", min: "0", max: "100", className: "bg-[#2A2E38] text-white rounded-md px-2 py-1 flex-1 placeholder:text-[#5E6272] text-sm", inputMode: "decimal" }), _jsxs("div", { className: "flex gap-2 ml-3", children: [_jsx("button", { onClick: saveEditedBodyfat, className: "p-2 text-green-500 hover:bg-green-500/20 rounded transition", title: "Save", children: _jsx(Check, { size: 16 }) }), _jsx("button", { onClick: () => setEditingBodyfatId(null), className: "p-2 text-[#5E6272] hover:bg-[#5E6272]/20 rounded transition", title: "Cancel", children: _jsx(X, { size: 16 }) })] })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex-1", children: _jsxs("span", { className: "text-white font-medium", children: [entry.bodyfat, "%"] }) }), _jsx("span", { className: "text-[#5E6272] text-sm", children: formatDate(entry.date) }), _jsxs("div", { className: "flex gap-2 ml-3", children: [_jsx("button", { onClick: () => editBodyfatEntry(entry), className: "p-2 text-[#246BFD] hover:bg-[#246BFD]/20 rounded transition", title: "Edit", children: _jsx(Edit2, { size: 16 }) }), _jsx("button", { onClick: () => deleteBodyfatEntry(entry.id), className: "p-2 text-red-500 hover:bg-red-500/20 rounded transition", title: "Delete", children: _jsx(Trash2, { size: 16 }) })] })] })) }, entry.id))) })) : (_jsx("p", { className: "text-[#5E6272] text-center py-4", children: "No entries yet. Add your first body fat entry above!" }))] })] })), activeTab === "prs" && (_jsx("div", { className: "space-y-4", children: personalRecords.length > 0 ? (personalRecords.map((pr) => {
                    const top = Object.values(pr.prs || {})
                        .filter(Boolean)
                        .map((p) => p.weight)
                        .sort((a, b) => b - a)[0];
                    return (_jsx(Link, { to: `/metrics/pr/${pr.exerciseId}`, children: _jsx("div", { className: "bg-[#262A34] rounded-xl p-4 border-l-4 border-[#00FFAD] hover:opacity-90", children: _jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(MuscleIcon, { muscleGroup: pr.muscleGroup, size: 28 }), _jsx("h4", { className: "text-white font-semibold", children: pr.exerciseName })] }), _jsx("div", { className: "text-right", children: _jsx("div", { className: "text-[#5E6272] text-xs", children: pr.muscleGroup }) })] }) }) }, pr.exerciseId));
                })) : (_jsxs("div", { className: "bg-[#262A34] rounded-xl p-8 text-center", children: [_jsx(Award, { size: 48, className: "text-[#5E6272] mx-auto mb-4" }), _jsx("p", { className: "text-white font-semibold mb-2", children: "No Personal Records Yet" }), _jsx("p", { className: "text-[#5E6272] text-sm", children: "Complete workouts to start tracking your PRs!" })] })) })), _jsx(BottomBar, { onLogout: handleLogout })] }));
}
