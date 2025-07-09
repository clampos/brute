import React, { useState } from "react";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import BottomBar from "../components/BottomBar";
import OvalProgressIcon from "../components/OvalProgressIcon";

export default function Programmes() {
  const [activeFilter, setActiveFilter] = useState("All");

  const filterOptions = ["All", "Previous", "BRUTE"];

  return (
    <div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-16"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      {/* Top Logo */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mt-4 px-2">
        <h2
          className="text-white"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
            fontSize: "20px",
          }}
        >
          Programmes
        </h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

      {/* Filter Menu */}
      <div className="flex justify-around mt-6 mb-4">
        {filterOptions.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-full font-medium text-sm ${
              activeFilter === filter
                ? "bg-[#246BFD] text-white"
                : "text-[#5E6272] bg-transparent"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Create New Custom Programme */}
      <div className="flex justify-center mb-6">
        <div
          className="w-[327px] h-[80px] border rounded-xl flex items-center justify-between px-4 cursor-pointer transition-all"
          style={{
            backgroundColor: "#262A34",
            borderColor: "#5E6272",
            borderWidth: "1px",
            opacity: 0.5,
          }}
        >
          <span
            style={{
              width: "249px",
              height: "24px",
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: "16px",
              lineHeight: "24px",
              letterSpacing: "0px",
              color: "#FFFFFF",
              opacity: 1,
            }}
          >
            Create New Custom Programme
          </span>
          <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-lg font-bold">
            +
          </div>
        </div>
      </div>

      {/* In-Progress Programme Box */}
      <div className="flex justify-center mb-6">
        <div
          className="w-[327px] h-[80px] bg-[#262A34] rounded-xl border border-[#5E6272] px-4 py-3 flex items-center gap-3"
          style={{ opacity: 1 }}
        >
          {/* Progress Icon */}
          <div
            className="relative flex items-center justify-center"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "white",
              position: "relative",
            }}
          >
            <div
              style={{
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                borderWidth: "6px",
                borderStyle: "solid",
                borderImage:
                  "linear-gradient(270deg, #C393FF 34.57%, #E42A6C 100%) 1",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Programme Text */}
          <div className="flex flex-col">
            <span
              style={{
                width: "147px",
                height: "24px",
                fontFamily: "Inter, sans-serif",
                fontWeight: 600,
                fontSize: "16px",
                lineHeight: "24px",
                letterSpacing: "0px",
                color: "#FFFFFF",
                opacity: 1,
              }}
            >
              Full Body (Current)
            </span>
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "16px",
                letterSpacing: "0px",
                color: "#FBA3FF",
                opacity: 1,
              }}
            >
              5 Days a Week
            </span>
          </div>
        </div>
      </div>

      {/* Placeholder for Body Part Scrollable List */}
      <div className="flex flex-col gap-4 px-2 overflow-y-auto pb-16">
        {/* Example body part programme boxes */}
        {["Upper Body", "Lower Body", "Push", "Pull", "Core"].map(
          (part, idx) => (
            <div
              key={idx}
              className="w-full max-w-[327px] mx-auto bg-[#262A34] rounded-xl border border-[#5E6272] px-4 py-3 text-white"
            >
              <span className="font-semibold text-base">{part} Programme</span>
              <p className="text-sm text-[#AAAAAA] mt-1">4 Days a Week</p>
            </div>
          )
        )}
      </div>

      <BottomBar />
    </div>
  );
}
