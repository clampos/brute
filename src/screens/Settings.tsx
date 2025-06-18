import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check } from "lucide-react";
import logo from "../assets/logo.png";
import icon from "../assets/icon_placeholder.png";
import BottomBar from "../components/BottomBar";

interface ReferralStats {
  referralCode: string;
  referralCredits: number;
  freeMonthsEarned: number;
  totalReferrals: number;
  activeReferrals: number;
  referredUsers: Array<{
    firstName: string;
    surname: string;
    createdAt: string;
    subscribed: boolean;
  }>;
}

export default function Settings() {
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:4242/auth/referrals", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setReferralStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Auth error:", err);
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("installPromptDismissed");
    navigate("/login");
  };

  const copyReferralCode = async () => {
    if (referralStats?.referralCode) {
      try {
        await navigator.clipboard.writeText(referralStats.referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-poppins bg-gradient-to-b from-[#001F3F] to-[#000B1A]">
        Loading settings...
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
      {/* Logo container */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      {/* Title + Avatar aligned like Dashboard */}
      <div className="flex justify-between items-center mt-4 px-2 max-w-[375px] mx-auto w-full">
        <h2
          className="text-white"
          style={{
            fontWeight: 600,
            fontSize: "20px",
            fontFamily: "'Poppins', sans-serif",
          }}
        >
          Settings
        </h2>
        <img
          src={icon}
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover"
        />
      </div>

      {/* Referral Code Box */}
      <div
        className="mt-8 max-w-[375px] mx-auto w-full rounded-2xl p-6 bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] text-black text-center"
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <h3 className="text-lg font-semibold mb-2">Your Referral Code</h3>
        <div className="flex items-center justify-center gap-2 mb-4">
          <p className="text-xl font-bold tracking-wide">
            {referralStats?.referralCode}
          </p>
          <button
            onClick={copyReferralCode}
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <p className="text-sm">
          Share this code with friends to earn free months!
        </p>
      </div>

      {/* Referral Stats */}
      {referralStats && (
        <div className="mt-6 max-w-[375px] mx-auto w-full space-y-4">
          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">Referral Stats</h4>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-[#246BFD]">
                  {referralStats.freeMonthsEarned}
                </p>
                <p className="text-sm text-[#5E6272]">Free Months Earned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#246BFD]">
                  {referralStats.totalReferrals}
                </p>
                <p className="text-sm text-[#5E6272]">Total Referrals</p>
              </div>
            </div>
          </div>

          {/* Recent Referrals */}
          {referralStats.referredUsers.length > 0 && (
            <div className="bg-[#262A34] rounded-xl p-4">
              <h4 className="text-white font-semibold mb-3">
                Recent Referrals
              </h4>
              <div className="space-y-2">
                {referralStats.referredUsers.slice(0, 5).map((user, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0"
                  >
                    <span className="text-white">
                      {user.firstName} {user.surname}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        user.subscribed
                          ? "bg-green-600 text-white"
                          : "bg-gray-600 text-gray-300"
                      }`}
                    >
                      {user.subscribed ? "Active" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Settings Section */}
          <div className="bg-[#262A34] rounded-xl p-4 mt-4">
            <h4 className="text-white font-semibold mb-3">General Settings</h4>
            <div className="space-y-2">
              {[
                {
                  label: "Change Email",
                  onClick: () => alert("Change Email clicked"),
                },
                {
                  label: "Change Password",
                  onClick: () => alert("Change Password clicked"),
                },
                {
                  label: "Manage Notifications",
                  onClick: () => alert("Manage Notifications clicked"),
                },
                {
                  label: "Delete Account",
                  onClick: () =>
                    window.confirm(
                      "Are you sure you want to delete your account?"
                    ) && alert("Account deleted"),
                },
              ].map((setting, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-3 px-4 rounded-lg bg-[#1F222B] text-white hover:bg-[#2A2E39] cursor-pointer transition-colors"
                  onClick={setting.onClick}
                >
                  <span>{setting.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
