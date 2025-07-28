import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SettingsIcon, MoreHorizontal, Copy, Check, X } from "lucide-react";
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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const navigate = useNavigate();

  const [bodyweight, setBodyweight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [birthday, setBirthday] = useState<string>("");
  const [gender, setGender] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Helper function to calculate age from birthday
  const calculateAge = (birthdayString: string): number | null => {
    if (!birthdayString) return null;
    const today = new Date();
    const birthDate = new Date(birthdayString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  // Fetch user profile info
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    console.log("Fetching profile with token:", token.substring(0, 20) + "...");

    fetch("http://localhost:4242/auth/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        console.log("Profile fetch response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          throw new Error(`Failed to fetch profile: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Profile data received:", data);
        setBodyweight(data.bodyweight ?? null);
        setHeight(data.height ?? null);
        setBirthday(
          data.birthday
            ? new Date(data.birthday).toISOString().split("T")[0]
            : ""
        );
        setGender(data.gender ?? null);
        setProfilePhoto(data.profilePhoto ?? null);
        setProfileError(null);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setProfileError("Failed to load profile data");
        // Don't redirect on profile fetch error - user might still want to use other features
      });
  }, [navigate]);

  const handleProfilePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setPhotoUploading(true);

    try {
      const formData = new FormData();
      formData.append("profilePhoto", file);

      const response = await fetch(
        "http://localhost:4242/auth/user/profile-photo",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        throw new Error("Failed to upload photo");
      }

      const result = await response.json();
      setProfilePhoto(result.profilePhoto);
      alert("Profile photo updated successfully!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemoveProfilePhoto = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setPhotoUploading(true);

    try {
      const response = await fetch(
        "http://localhost:4242/auth/user/profile-photo",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }
        throw new Error("Failed to remove photo");
      }

      setProfilePhoto(null);
      alert("Profile photo removed successfully!");
    } catch (error) {
      console.error("Error removing photo:", error);
      alert("Failed to remove photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleProfileSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setProfileSaving(true);
    setProfileError(null);

    const profileData = {
      bodyweight: bodyweight || null,
      height: height || null,
      birthday: birthday || null,
      gender: gender || null,
    };

    console.log("Saving profile data:", profileData);

    try {
      const res = await fetch("http://localhost:4242/auth/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      console.log("Profile update response status:", res.status);

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        // Get more specific error information
        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: "Unknown error" };
        }

        console.error("Profile update failed:", res.status, errorData);
        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const result = await res.json();
      console.log("Profile update result:", result);

      setProfileError(null);
      alert("Profile updated successfully!");

      // Optionally refresh the profile data to confirm it was saved
      try {
        const refreshRes = await fetch(
          "http://localhost:4242/auth/user/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (refreshRes.ok) {
          const refreshedData = await refreshRes.json();
          console.log("Refreshed profile data:", refreshedData);
          setBodyweight(refreshedData.bodyweight ?? null);
          setHeight(refreshedData.height ?? null);
          setBirthday(
            refreshedData.birthday
              ? new Date(refreshedData.birthday).toISOString().split("T")[0]
              : ""
          );
          setGender(refreshedData.gender ?? null);
          setProfilePhoto(refreshedData.profilePhoto ?? null);
        }
      } catch (refreshErr) {
        console.warn("Failed to refresh profile data:", refreshErr);
        // Don't show error for refresh failure
      }
    } catch (err: any) {
      console.error("Profile save error:", err);
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  // Fetch user profile info
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    console.log("Fetching profile with token:", token.substring(0, 20) + "...");

    fetch("http://localhost:4242/auth/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        console.log("Profile fetch response status:", res.status);
        if (!res.ok) {
          if (res.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          throw new Error(`Failed to fetch profile: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Profile data received:", data);
        setBodyweight(data.bodyweight ?? null);
        setHeight(data.height ?? null);
        setBirthday(
          data.birthday
            ? new Date(data.birthday).toISOString().split("T")[0]
            : ""
        );
        setGender(data.gender ?? null);
        setProfileError(null);
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setProfileError("Failed to load profile data");
        // Don't redirect on profile fetch error - user might still want to use other features
      });
  }, [navigate]);

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

  const resetPasswordModal = () => {
    setShowChangePassword(false);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setPasswordError("");
  };

  const resetDeleteAccountModal = () => {
    setShowDeleteAccount(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordLoading(true);

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords don't match");
      setPasswordLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      setPasswordLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:4242/auth/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      if (!response.ok) {
        // Safer error message, not exposing backend errors
        throw new Error(
          "Failed to change password. Please check your current password."
        );
      }

      // Success
      resetPasswordModal();
      alert("Password changed successfully!");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // Function to handle actual account deletion
  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:4242/auth/delete-account",
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete account.");
      }

      // Clear storage and redirect to login or landing page
      localStorage.clear();
      alert("Account deleted successfully.");
      navigate("/login");
    } catch (err: any) {
      alert(err.message || "Error deleting account.");
    }
  };

  const settingsOptions = [
    {
      label: "Change Email",
      onClick: () => alert("Change Email clicked"),
    },
    {
      label: "Change Password",
      onClick: () => setShowChangePassword(true),
    },
    {
      label: "Manage Notifications",
      onClick: () => alert("Manage Notifications clicked"),
    },
    {
      label: "Delete Account",
      onClick: () => setShowDeleteAccount(true),
    },
  ];

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
      {/* Logo */}
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      {/* Top Bar */}
      <div className="flex justify-between items-center mt-4 px-2 h-10 relative">
        <SettingsIcon className="text-white w-6 h-6" />
        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          Settings
        </h2>
        <MoreHorizontal className="text-white w-6 h-6" />
      </div>

      {/* Referral Code Box */}
      <div className="mt-8 rounded-2xl p-6 bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] text-black text-center">
        <h3
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Your Referral Code
        </h3>
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
          Share this code with friends - you'll both get a free month!
        </p>
      </div>

      {/* Referral Stats */}
      {referralStats && (
        <div className="mt-6 space-y-4">
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
            <div className="mt-4 text-center">
              <p className="text-sm text-[#5E6272]">
                Referral Credits Available:{" "}
                <span className="text-white font-semibold">
                  {referralStats.referralCredits}
                </span>
              </p>
            </div>
          </div>

          {/* Recent Referrals */}
          {referralStats.referredUsers?.length > 0 && (
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

          {/* Personal Profile Section */}
          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">Personal Profile</h4>

            {/* Show profile error if there is one */}
            {profileError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{profileError}</p>
              </div>
            )}

            <div className="space-y-3 text-white">
              <div className="flex flex-col">
                <label className="text-sm text-[#5E6272] mb-1">
                  Bodyweight (kg)
                </label>
                <input
                  type="number"
                  value={bodyweight ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBodyweight(value === "" ? null : parseFloat(value));
                  }}
                  step="0.1"
                  min="0"
                  className="p-3 rounded bg-[#1F222B] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
                  placeholder="Enter your weight"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-[#5E6272] mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={height ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setHeight(value === "" ? null : parseFloat(value));
                  }}
                  step="0.1"
                  min="0"
                  className="p-3 rounded bg-[#1F222B] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
                  placeholder="Enter your height"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-[#5E6272] mb-1">
                  Date of Birth{" "}
                  {birthday && calculateAge(birthday) !== null
                    ? `(Age: ${calculateAge(birthday)})`
                    : ""}
                </label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="p-3 rounded bg-[#1F222B] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                  placeholder="Select your birth date"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-[#5E6272] mb-1">Gender</label>
                <select
                  value={gender ?? ""}
                  onChange={(e) => setGender(e.target.value || null)}
                  className="p-3 rounded bg-[#1F222B] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                >
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <button
                onClick={handleProfileSave}
                disabled={profileSaving}
                className="w-full mt-4 py-3 bg-[#246BFD] rounded font-semibold hover:bg-blue-700 transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>

          {/* General Settings Section */}
          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">General Settings</h4>
            <div className="space-y-2">
              {settingsOptions.map((setting, index) => (
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

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#262A34] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">
                Change Password
              </h3>
              <button
                onClick={resetPasswordModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                className="w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                required
                minLength={8}
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                required
                minLength={8}
              />

              {passwordError && (
                <p className="text-red-400 text-sm">{passwordError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={resetPasswordModal}
                  className="flex-1 py-3 bg-gray-600 rounded font-semibold hover:bg-gray-700 transition text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-3 bg-[#246BFD] rounded font-semibold hover:bg-blue-700 transition text-white disabled:opacity-50"
                >
                  {passwordLoading ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#262A34] rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">
                Delete Account
              </h3>
              <button
                onClick={resetDeleteAccountModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-red-500 mb-6">
              Are you sure you want to delete your account? This action cannot
              be undone.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetDeleteAccountModal}
                className="flex-1 py-3 bg-gray-600 rounded font-semibold hover:bg-gray-700 transition text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 py-3 bg-red-600 rounded font-semibold hover:bg-red-700 transition text-white"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
