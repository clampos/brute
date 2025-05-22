// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:4242/api/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setMessage(data.message); // You can display this in the UI
        setLoading(false);
      })
      .catch((err) => {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-poppins bg-gradient-to-b from-[#001F3F] to-[#000B1A]">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white p-6 font-poppins">
      <img
        src={logo}
        alt="App Logo"
        style={{ width: 225.49, height: 108 }}
        className="object-contain"
      />

      {message && (
        <p className="text-lg text-center mb-8 font-medium">{message}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/10 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
          <p className="text-xl font-semibold mb-2">Enter your bodyweight</p>
          <input
            type="number"
            placeholder="kg"
            className="p-2 rounded-md bg-white/20 text-white w-full text-center"
          />
        </div>

        <div className="bg-white/10 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
          <p className="text-xl font-semibold mb-2">
            Update new bench press PR
          </p>
          <input
            type="number"
            placeholder="kg"
            className="p-2 rounded-md bg-white/20 text-white w-full text-center"
          />
        </div>

        <div className="bg-white/10 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center">
          <p className="text-xl font-semibold mb-2">Select programme</p>
          <select className="p-2 rounded-md bg-white/20 text-white w-full text-center">
            <option>Strength</option>
            <option>Hypertrophy</option>
            <option>Endurance</option>
          </select>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 w-full bg-[#000B1A] p-4 flex justify-around">
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
        <div className="w-10 h-10 bg-white/20 rounded-lg"></div>
      </footer>
    </div>
  );
}
