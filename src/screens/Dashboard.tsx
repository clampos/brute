// src/pages/Dashboard.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
    }
  }, []);

  return (
<div className="min-h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white p-6 font-poppins">
      <h1 className="text-4xl font-semibold mb-10">Welcome to BRUTE</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/10 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
          <p className="text-xl font-semibold mb-2">Enter your bodyweight</p>
          {/* Placeholder for input */}
          <input
            type="number"
            placeholder="kg"
            className="p-2 rounded-md bg-white/20 text-white w-full text-center"
          />
        </div>

        <div className="bg-white/10 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
          <p className="text-xl font-semibold mb-2">Update new bench press PR</p>
          {/* Placeholder for input */}
          <input
            type="number"
            placeholder="kg"
            className="p-2 rounded-md bg-white/20 text-white w-full text-center"
          />
        </div>

        <div className="bg-white/10 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
          <p className="text-xl font-semibold mb-2">Select programme</p>
          {/* Placeholder for select */}
          <select className="p-2 rounded-md bg-white/20 text-white w-full text-center">
            <option>Strength</option>
            <option>Hypertrophy</option>
            <option>Endurance</option>
          </select>
        </div>
      </div>

      {/* Placeholder for bottom icons */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#000B1A] p-4 flex justify-around">
        {/* You can replace these divs with real icons */}
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
      </footer>
    </div>
  );
}


