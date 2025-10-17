import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Award,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logo from "../assets/logo.png";
import BottomBar from "../components/BottomBar";

interface BodyweightEntry {
  id: string;
  weight: number;
  date: string;
}

interface BodyfatEntry {
  id: string;
  bodyfat: number;
  date: string;
}

interface PersonalRecord {
  exerciseName: string;
  exerciseId: string;
  weight: number;
  reps: number;
  date: string;
  muscleGroup: string;
}

export default function Metrics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"bodyweight" | "bodyfat" | "prs">(
    "bodyweight"
  );

  // Bodyweight tracking
  const [bodyweightHistory, setBodyweightHistory] = useState<BodyweightEntry[]>(
    []
  );
  const [showAddBodyweight, setShowAddBodyweight] = useState(false);
  const [newBodyweight, setNewBodyweight] = useState("");

  // Bodyfat tracking
  const [bodyfatHistory, setBodyfatHistory] = useState<BodyfatEntry[]>([]);
  const [showAddBodyfat, setShowAddBodyfat] = useState(false);
  const [newBodyfat, setNewBodyfat] = useState("");

  // Personal Records
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);

  // Graph scrolling
  const graphRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        // Fetch bodyweight history
        const bodyweightRes = await fetch(
          "http://localhost:4242/auth/metrics/bodyweight",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (bodyweightRes.ok) {
          const data = await bodyweightRes.json();
          setBodyweightHistory(data);
        }

        // Fetch bodyfat history
        const bodyfatRes = await fetch(
          "http://localhost:4242/auth/metrics/bodyfat",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (bodyfatRes.ok) {
          const data = await bodyfatRes.json();
          setBodyfatHistory(data);
        }

        // Fetch personal records
        const prsRes = await fetch(
          "http://localhost:4242/auth/metrics/personal-records",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (prsRes.ok) {
          const data = await prsRes.json();
          setPersonalRecords(data);
        }

        setLoading(false);
      } catch (error) {
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

  const scrollGraph = (direction: "left" | "right") => {
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
    const weight = parseFloat(newBodyweight);
    if (!weight || weight <= 0) {
      alert("Please enter a valid weight");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        "http://localhost:4242/auth/metrics/bodyweight",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ weight }),
        }
      );

      if (response.ok) {
        const newEntry = await response.json();
        setBodyweightHistory([newEntry, ...bodyweightHistory]);
        setNewBodyweight("");
        setShowAddBodyweight(false);
      }
    } catch (error) {
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
      const response = await fetch(
        "http://localhost:4242/auth/metrics/bodyfat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bodyfat }),
        }
      );

      if (response.ok) {
        const newEntry = await response.json();
        setBodyfatHistory([newEntry, ...bodyfatHistory]);
        setNewBodyfat("");
        setShowAddBodyfat(false);
      }
    } catch (error) {
      console.error("Error adding bodyfat:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  const calculateTrend = (history: any[], key: string) => {
    if (history.length < 2) return null;
    const latest = history[0][key];
    const previous = history[1][key];
    const diff = latest - previous;
    const percentChange = ((diff / previous) * 100).toFixed(1);
    return { diff: diff.toFixed(1), percentChange, isPositive: diff > 0 };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  // Render line graph for bodyweight or bodyfat
  const renderLineGraph = (
    data: any[],
    valueKey: string,
    color: string,
    unit: string
  ) => {
    if (data.length === 0) return null;

    // Sort by date (oldest first for graph)
    const sortedData = [...data].reverse();

    // Calculate min and max for scaling
    const values = sortedData.map((d) => d[valueKey]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.2;

    const graphHeight = 200;
    const graphWidth = Math.max(sortedData.length * 80, 300);
    const leftMargin = 50; // Space for Y-axis labels
    const bottomMargin = 40; // Space for X-axis labels
    const topMargin = 30; // Space for top value labels

    // Generate SVG points (adjusted for margins)
    const plotWidth = graphWidth - leftMargin;
    const plotHeight = graphHeight - bottomMargin - topMargin;

    const points = sortedData.map((entry, index) => {
      const x = leftMargin + (index / (sortedData.length - 1)) * plotWidth;
      const normalizedValue =
        (entry[valueKey] - minValue + padding) / (range + 2 * padding);
      const y = topMargin + plotHeight - normalizedValue * plotHeight;
      return { x, y, value: entry[valueKey], date: entry.date };
    });

    const pathD = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    // Generate Y-axis labels (5 labels from min to max)
    const yAxisLabels = [];
    for (let i = 0; i <= 4; i++) {
      const value = minValue - padding + ((range + 2 * padding) * i) / 4;
      const y = topMargin + plotHeight - (i / 4) * plotHeight;
      yAxisLabels.push({ value: value.toFixed(1), y });
    }

    return (
      <div className="relative bg-[#262A34] rounded-xl p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-white font-semibold">Progress Over Time</h4>
          <div className="flex gap-2">
            <button
              onClick={() => scrollGraph("left")}
              disabled={!canScrollLeft}
              className={`p-1 rounded ${
                canScrollLeft
                  ? "bg-[#246BFD] text-white"
                  : "bg-[#1F222B] text-[#5E6272]"
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scrollGraph("right")}
              disabled={!canScrollRight}
              className={`p-1 rounded ${
                canScrollRight
                  ? "bg-[#246BFD] text-white"
                  : "bg-[#1F222B] text-[#5E6272]"
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          ref={graphRef}
          className="overflow-x-auto scrollbar-hide"
          onScroll={checkScroll}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <svg
            width={graphWidth}
            height={graphHeight + bottomMargin + topMargin}
            className="min-w-full"
          >
            {/* Y-axis */}
            <line
              x1={leftMargin}
              y1={topMargin}
              x2={leftMargin}
              y2={graphHeight + topMargin}
              stroke="#5E6272"
              strokeWidth="2"
            />

            {/* X-axis */}
            <line
              x1={leftMargin}
              y1={graphHeight + topMargin}
              x2={graphWidth}
              y2={graphHeight + topMargin}
              stroke="#5E6272"
              strokeWidth="2"
            />

            {/* Y-axis labels */}
            {yAxisLabels.map((label, i) => (
              <g key={i}>
                <line
                  x1={leftMargin - 5}
                  y1={label.y}
                  x2={leftMargin}
                  y2={label.y}
                  stroke="#5E6272"
                  strokeWidth="1"
                />
                <text
                  x={leftMargin - 10}
                  y={label.y + 4}
                  fill="#5E6272"
                  fontSize="11"
                  textAnchor="end"
                >
                  {label.value}
                  {unit}
                </text>
                {/* Grid line */}
                <line
                  x1={leftMargin}
                  y1={label.y}
                  x2={graphWidth}
                  y2={label.y}
                  stroke="#1F222B"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
              </g>
            ))}

            {/* Gradient fill under line */}
            <defs>
              <linearGradient
                id={`gradient-${valueKey}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Fill area */}
            <path
              d={`${pathD} L ${points[points.length - 1].x} ${
                graphHeight + topMargin
              } L ${leftMargin} ${graphHeight + topMargin} Z`}
              fill={`url(#gradient-${valueKey})`}
            />

            {/* Line */}
            <path
              d={pathD}
              stroke={color}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points and labels */}
            {points.map((point, index) => (
              <g key={index}>
                {/* Vertical grid line at each point */}
                <line
                  x1={point.x}
                  y1={topMargin}
                  x2={point.x}
                  y2={graphHeight + topMargin}
                  stroke="#1F222B"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />

                {/* Data point circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={color}
                  stroke="#262A34"
                  strokeWidth="2"
                />

                {/* Date labels on X-axis */}
                <text
                  x={point.x}
                  y={graphHeight + topMargin + 20}
                  fill="#FFFFFF"
                  fontSize="11"
                  textAnchor="middle"
                  fontWeight="500"
                >
                  {formatShortDate(point.date)}
                </text>

                {/* Value labels above points */}
                <text
                  x={point.x}
                  y={point.y - 12}
                  fill="#FFFFFF"
                  fontSize="12"
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {point.value.toFixed(1)}
                </text>
              </g>
            ))}

            {/* Axis labels */}
            <text
              x={leftMargin / 2}
              y={(graphHeight + topMargin) / 2}
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
              transform={`rotate(-90 ${leftMargin / 2} ${
                (graphHeight + topMargin) / 2
              })`}
            >
              {valueKey === "weight" ? "Weight (kg)" : "Body Fat (%)"}
            </text>

            <text
              x={(graphWidth + leftMargin) / 2}
              y={graphHeight + topMargin + bottomMargin - 5}
              fill="#FFFFFF"
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
            >
              Date
            </text>
          </svg>
        </div>

        <p className="text-[#5E6272] text-xs mt-4 text-center">
          Scroll left to view past entries • Scroll right to return to present
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{
          background:
            "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
        }}
      >
        <p>Loading metrics...</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      {/* Logo */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mt-4 px-2">
        <button
          onClick={() => navigate("/settings")}
          className="text-white text-sm"
        >
          ← Back
        </button>
        <h2 className="text-white text-xl font-semibold">Track Metrics</h2>
        <div className="w-12"></div>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-around mt-6 mb-4">
        <button
          onClick={() => setActiveTab("bodyweight")}
          className={`px-4 py-2 rounded-full font-medium text-sm ${
            activeTab === "bodyweight"
              ? "bg-[#246BFD] text-white"
              : "text-[#5E6272] bg-transparent"
          }`}
        >
          Bodyweight
        </button>
        <button
          onClick={() => setActiveTab("bodyfat")}
          className={`px-4 py-2 rounded-full font-medium text-sm ${
            activeTab === "bodyfat"
              ? "bg-[#246BFD] text-white"
              : "text-[#5E6272] bg-transparent"
          }`}
        >
          Body Fat
        </button>
        <button
          onClick={() => setActiveTab("prs")}
          className={`px-4 py-2 rounded-full font-medium text-sm ${
            activeTab === "prs"
              ? "bg-[#246BFD] text-white"
              : "text-[#5E6272] bg-transparent"
          }`}
        >
          PRs
        </button>
      </div>

      {/* Bodyweight Tab */}
      {activeTab === "bodyweight" && (
        <div className="space-y-4">
          {/* Current Stats Card */}
          {bodyweightHistory.length > 0 && (
            <div className="bg-[#262A34] rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-4">
                Current Bodyweight
              </h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-white">
                  {bodyweightHistory[0].weight}
                </span>
                <span className="text-xl text-[#5E6272]">kg</span>
              </div>
              {calculateTrend(bodyweightHistory, "weight") && (
                <div className="flex items-center gap-2 text-sm">
                  {calculateTrend(bodyweightHistory, "weight")!.isPositive ? (
                    <TrendingUp size={16} className="text-green-400" />
                  ) : (
                    <TrendingDown size={16} className="text-red-400" />
                  )}
                  <span
                    className={
                      calculateTrend(bodyweightHistory, "weight")!.isPositive
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {calculateTrend(bodyweightHistory, "weight")!.isPositive
                      ? "+"
                      : ""}
                    {calculateTrend(bodyweightHistory, "weight")!.diff} kg (
                    {calculateTrend(bodyweightHistory, "weight")!.percentChange}
                    %)
                  </span>
                  <span className="text-[#5E6272]">from last entry</span>
                </div>
              )}
            </div>
          )}

          {/* Line Graph */}
          {bodyweightHistory.length > 1 &&
            renderLineGraph(bodyweightHistory, "weight", "#00FFAD", "kg")}

          {/* Add New Entry Button */}
          {!showAddBodyweight && (
            <button
              onClick={() => setShowAddBodyweight(true)}
              className="w-full bg-[#246BFD] hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add Bodyweight Entry
            </button>
          )}

          {/* Add Entry Form */}
          {showAddBodyweight && (
            <div className="bg-[#262A34] rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-semibold">Add Bodyweight</h4>
                <button onClick={() => setShowAddBodyweight(false)}>
                  <X size={20} className="text-[#5E6272]" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newBodyweight}
                  onChange={(e) => setNewBodyweight(e.target.value)}
                  placeholder="Weight (kg)"
                  step="0.1"
                  className="flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none"
                />
                <button
                  onClick={handleAddBodyweight}
                  className="px-6 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* History */}
          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">History</h4>
            {bodyweightHistory.length > 0 ? (
              <div className="space-y-2">
                {bodyweightHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between items-center py-3 px-4 bg-[#1F222B] rounded-lg"
                  >
                    <span className="text-white font-medium">
                      {entry.weight} kg
                    </span>
                    <span className="text-[#5E6272] text-sm">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5E6272] text-center py-4">
                No entries yet. Add your first bodyweight entry above!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Body Fat Tab */}
      {activeTab === "bodyfat" && (
        <div className="space-y-4">
          {/* Current Stats Card */}
          {bodyfatHistory.length > 0 && (
            <div className="bg-[#262A34] rounded-xl p-6">
              <h3 className="text-white font-semibold text-lg mb-4">
                Current Body Fat
              </h3>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-bold text-white">
                  {bodyfatHistory[0].bodyfat}
                </span>
                <span className="text-xl text-[#5E6272]">%</span>
              </div>
              {calculateTrend(bodyfatHistory, "bodyfat") && (
                <div className="flex items-center gap-2 text-sm">
                  {calculateTrend(bodyfatHistory, "bodyfat")!.isPositive ? (
                    <TrendingUp size={16} className="text-red-400" />
                  ) : (
                    <TrendingDown size={16} className="text-green-400" />
                  )}
                  <span
                    className={
                      calculateTrend(bodyfatHistory, "bodyfat")!.isPositive
                        ? "text-red-400"
                        : "text-green-400"
                    }
                  >
                    {calculateTrend(bodyfatHistory, "bodyfat")!.isPositive
                      ? "+"
                      : ""}
                    {calculateTrend(bodyfatHistory, "bodyfat")!.diff}% (
                    {calculateTrend(bodyfatHistory, "bodyfat")!.percentChange}%)
                  </span>
                  <span className="text-[#5E6272]">from last entry</span>
                </div>
              )}
            </div>
          )}

          {/* Line Graph */}
          {bodyfatHistory.length > 1 &&
            renderLineGraph(bodyfatHistory, "bodyfat", "#FBA3FF", "%")}

          {/* Add New Entry Button */}
          {!showAddBodyfat && (
            <button
              onClick={() => setShowAddBodyfat(true)}
              className="w-full bg-[#246BFD] hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Add Body Fat Entry
            </button>
          )}

          {/* Add Entry Form */}
          {showAddBodyfat && (
            <div className="bg-[#262A34] rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-semibold">Add Body Fat</h4>
                <button onClick={() => setShowAddBodyfat(false)}>
                  <X size={20} className="text-[#5E6272]" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newBodyfat}
                  onChange={(e) => setNewBodyfat(e.target.value)}
                  placeholder="Body Fat (%)"
                  step="0.1"
                  min="0"
                  max="100"
                  className="flex-1 p-3 rounded bg-[#1F222B] text-white border border-[#5E6272] focus:border-[#246BFD] focus:outline-none"
                />
                <button
                  onClick={handleAddBodyfat}
                  className="px-6 bg-[#00FFAD] hover:bg-[#00E599] text-black rounded-lg font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* History */}
          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">History</h4>
            {bodyfatHistory.length > 0 ? (
              <div className="space-y-2">
                {bodyfatHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex justify-between items-center py-3 px-4 bg-[#1F222B] rounded-lg"
                  >
                    <span className="text-white font-medium">
                      {entry.bodyfat}%
                    </span>
                    <span className="text-[#5E6272] text-sm">
                      {formatDate(entry.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5E6272] text-center py-4">
                No entries yet. Add your first body fat entry above!
              </p>
            )}
          </div>
        </div>
      )}

      {/* Personal Records Tab */}
      {activeTab === "prs" && (
        <div className="space-y-4">
          {personalRecords.length > 0 ? (
            personalRecords.map((pr, index) => (
              <div
                key={index}
                className="bg-[#262A34] rounded-xl p-4 border-l-4 border-[#00FFAD]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-[#00FFAD]" />
                    <h4 className="text-white font-semibold">
                      {pr.exerciseName}
                    </h4>
                  </div>
                  <span className="text-[#5E6272] text-xs">
                    {pr.muscleGroup}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-white">
                    {pr.weight} kg
                  </span>
                  <span className="text-[#5E6272]">×</span>
                  <span className="text-xl text-white">{pr.reps} reps</span>
                </div>
                <p className="text-[#5E6272] text-sm">{formatDate(pr.date)}</p>
              </div>
            ))
          ) : (
            <div className="bg-[#262A34] rounded-xl p-8 text-center">
              <Award size={48} className="text-[#5E6272] mx-auto mb-4" />
              <p className="text-white font-semibold mb-2">
                No Personal Records Yet
              </p>
              <p className="text-[#5E6272] text-sm">
                Complete workouts to start tracking your PRs!
              </p>
            </div>
          )}
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
