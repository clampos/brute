import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  SettingsIcon,
  MoreHorizontal,
  Copy,
  Check,
  X,
  User,
  Edit3,
  Save,
  TrendingUp,
  LogOut,
  Globe,
} from "lucide-react";
import logo from "../assets/logo.png";
import BottomBar from "../components/BottomBar";
import {
  UnitSystem,
  getUnitPreference,
  setUnitPreference,
  formatHeight,
  cmToFeetAndInches,
  feetAndInchesToCm,
} from "../utils/unitConversions";

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

interface EditingState {
  bodyweight: boolean;
  height: boolean;
  birthday: boolean;
  gender: boolean;
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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Unit system state
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(
    getUnitPreference()
  );

  // Imperial height input state
  const [heightFeet, setHeightFeet] = useState<string>("");
  const [heightInches, setHeightInches] = useState<string>("");

  const [editing, setEditing] = useState<EditingState>({
    bodyweight: false,
    height: false,
    birthday: false,
    gender: false,
  });
  const [fieldLoading, setFieldLoading] = useState<EditingState>({
    bodyweight: false,
    height: false,
    birthday: false,
    gender: false,
  });

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

  const toggleUnitSystem = () => {
    const newSystem: UnitSystem =
      unitSystem === "metric" ? "imperial" : "metric";
    setUnitSystemState(newSystem);
    setUnitPreference(newSystem);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch("http://localhost:4242/auth/user/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
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
        setBodyweight(data.bodyweight ?? null);
        setHeight(data.height ?? null);

        // Initialize height in imperial if that's the preference
        if (data.height && unitSystem === "imperial") {
          const { feet, inches } = cmToFeetAndInches(data.height);
          setHeightFeet(feet.toString());
          setHeightInches(inches.toString());
        }

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
      });
  }, [navigate]);

  // Update imperial height when metric height changes
  useEffect(() => {
    if (height && unitSystem === "imperial" && !editing.height) {
      const { feet, inches } = cmToFeetAndInches(height);
      setHeightFeet(feet.toString());
      setHeightInches(inches.toString());
    }
  }, [height, unitSystem, editing.height]);

  const handleProfilePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

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
    setProfileError(null);

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
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      setProfilePhoto(result.profilePhoto);
      alert("Profile photo updated successfully!");
      event.target.value = "";
    } catch (error) {
      console.error("Error uploading photo:", error);
      setProfileError("Failed to upload photo. Please try again.");
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
    setProfileError(null);

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
      setProfileError("Failed to remove photo. Please try again.");
      alert("Failed to remove photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleFieldSave = async (field: keyof EditingState) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setFieldLoading({ ...fieldLoading, [field]: true });
    setProfileError(null);

    // Convert imperial height to metric before saving
    let heightToSave = height;
    if (field === "height" && unitSystem === "imperial") {
      const feet = parseInt(heightFeet) || 0;
      const inches = parseInt(heightInches) || 0;
      heightToSave = feetAndInchesToCm(feet, inches);
      setHeight(heightToSave); // Update local state with converted value
    }

    const profileData = {
      bodyweight: bodyweight || null,
      height: heightToSave || null,
      birthday: birthday || null,
      gender: gender || null,
    };

    try {
      const res = await fetch("http://localhost:4242/auth/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          return;
        }

        let errorData;
        try {
          errorData = await res.json();
        } catch {
          errorData = { error: "Unknown error" };
        }

        throw new Error(errorData.error || `Server error: ${res.status}`);
      }

      const result = await res.json();
      setEditing({ ...editing, [field]: false });
      setProfileError(null);
    } catch (err: any) {
      console.error("Profile save error:", err);
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setFieldLoading({ ...fieldLoading, [field]: false });
    }
  };

  const toggleEdit = (field: keyof EditingState) => {
    setEditing({ ...editing, [field]: !editing[field] });

    // When starting to edit height in imperial, set the current values
    if (
      field === "height" &&
      !editing[field] &&
      height &&
      unitSystem === "imperial"
    ) {
      const { feet, inches } = cmToFeetAndInches(height);
      setHeightFeet(feet.toString());
      setHeightInches(inches.toString());
    }
  };

  const formatDisplayValue = (field: keyof EditingState, value: any) => {
    switch (field) {
      case "bodyweight":
        return value ? `${value} kg` : "Not set";
      case "height":
        return formatHeight(value, unitSystem);
      case "birthday":
        if (!value) return "Not set";
        const age = calculateAge(value);
        return `${new Date(value).toLocaleDateString()} ${
          age !== null ? `(Age: ${age})` : ""
        }`;
      case "gender":
        return value || "Not set";
      default:
        return value || "Not set";
    }
  };

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
        throw new Error(
          "Failed to change password. Please check your current password."
        );
      }

      resetPasswordModal();
      alert("Password changed successfully!");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

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
      danger: true,
    },
    {
      label: "Logout",
      onClick: handleLogout,
      danger: true,
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
      <div className="w-full max-w-[375px] h-[44px] px-4 flex justify-center items-center mx-auto">
        <img
          src={logo}
          alt="Logo"
          className="w-[84.56px] h-[15px] object-contain md:w-[100px] md:h-[18px]"
        />
      </div>

      <div className="flex justify-between items-center mt-4 px-2 h-10 relative">
        <SettingsIcon className="text-white w-6 h-6" />
        <h2 className="absolute left-1/2 transform -translate-x-1/2 text-white font-semibold text-xl">
          Settings
        </h2>
        <MoreHorizontal className="text-white w-6 h-6" />
      </div>

      {/* Unit System Toggle */}
      <div className="mt-6 rounded-xl p-4 bg-[#262A34]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[#246BFD]" />
            <span className="text-white font-medium">Unit System</span>
          </div>
          <button
            onClick={toggleUnitSystem}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              unitSystem === "imperial" ? "bg-[#246BFD]" : "bg-[#5E6272]"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                unitSystem === "imperial" ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="flex gap-4 mt-2">
          <span
            className={`text-sm ${
              unitSystem === "metric"
                ? "text-[#246BFD] font-semibold"
                : "text-[#5E6272]"
            }`}
          >
            Metric
          </span>
          <span
            className={`text-sm ${
              unitSystem === "imperial"
                ? "text-[#246BFD] font-semibold"
                : "text-[#5E6272]"
            }`}
          >
            Imperial
          </span>
        </div>
      </div>

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

          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">Personal Profile</h4>

            {profileError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
                <p className="text-red-400 text-sm">{profileError}</p>
              </div>
            )}

            <div className="space-y-4 text-white">
              <div className="flex flex-col items-center space-y-2 mb-6">
                <div className="w-24 h-24 rounded-full bg-[#1F222B] border-2 border-[#5E6272] overflow-hidden flex items-center justify-center relative">
                  {profilePhoto ? (
                    <img
                      src={`http://localhost:4242${profilePhoto}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback =
                          e.currentTarget.parentElement!.querySelector(
                            ".fallback-icon"
                          );
                        if (fallback) {
                          (fallback as HTMLElement).style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`absolute inset-0 w-full h-full bg-[#1F222B] flex items-center justify-center fallback-icon ${
                      profilePhoto ? "hidden" : "flex"
                    }`}
                  >
                    <User size={32} className="text-[#5E6272]" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <label
                    htmlFor="profilePhotoUpload"
                    className={`cursor-pointer bg-[#86FF99] text-black px-4 py-2 rounded font-semibold hover:bg-[#6bd664] transition flex items-center gap-2 select-none ${
                      photoUploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Camera size={16} />
                    {photoUploading ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      id="profilePhotoUpload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoUpload}
                      disabled={photoUploading}
                    />
                  </label>

                  {profilePhoto && (
                    <button
                      onClick={handleRemoveProfilePhoto}
                      disabled={photoUploading}
                      className="bg-red-600 hover:bg-red-700 rounded px-4 py-2 font-semibold text-white disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors">
                <div className="flex-1">
                  <label className="block text-sm text-[#5E6272] mb-1">
                    Bodyweight
                  </label>
                  <p className="text-white">
                    {formatDisplayValue("bodyweight", bodyweight)}
                  </p>
                  <p className="text-xs text-[#5E6272] mt-1">
                    Update via Track Metrics →
                  </p>
                </div>
                <div className="ml-3">
                  <button
                    onClick={() => navigate("/metrics")}
                    className="p-2 bg-[#246BFD]/20 hover:bg-[#246BFD]/40 rounded-lg transition-colors"
                  >
                    <TrendingUp size={16} className="text-[#246BFD]" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors">
                <div className="flex-1">
                  <label className="block text-sm text-[#5E6272] mb-1">
                    Height
                  </label>
                  {editing.height ? (
                    unitSystem === "metric" ? (
                      <input
                        type="number"
                        value={height ?? ""}
                        onChange={(e) =>
                          setHeight(
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value)
                          )
                        }
                        step="0.1"
                        min="0"
                        className="w-full p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                        placeholder="Enter height in cm"
                        autoFocus
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={heightFeet}
                          onChange={(e) => setHeightFeet(e.target.value)}
                          min="0"
                          className="flex-1 p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                          placeholder="Feet"
                          autoFocus
                        />
                        <input
                          type="number"
                          value={heightInches}
                          onChange={(e) => setHeightInches(e.target.value)}
                          min="0"
                          max="11"
                          className="flex-1 p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                          placeholder="Inches"
                        />
                      </div>
                    )
                  ) : (
                    <p className="text-white">
                      {formatDisplayValue("height", height)}
                    </p>
                  )}
                </div>
                <div className="ml-3">
                  {editing.height ? (
                    <button
                      onClick={() => handleFieldSave("height")}
                      disabled={fieldLoading.height}
                      className="p-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {fieldLoading.height ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleEdit("height")}
                      className="p-2 bg-[#5E6272]/20 hover:bg-[#5E6272]/40 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} className="text-[#5E6272]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors">
                <div className="flex-1">
                  <label className="block text-sm text-[#5E6272] mb-1">
                    Date of Birth
                  </label>
                  {editing.birthday ? (
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <p className="text-white">
                      {formatDisplayValue("birthday", birthday)}
                    </p>
                  )}
                </div>
                <div className="ml-3">
                  {editing.birthday ? (
                    <button
                      onClick={() => handleFieldSave("birthday")}
                      disabled={fieldLoading.birthday}
                      className="p-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {fieldLoading.birthday ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleEdit("birthday")}
                      className="p-2 bg-[#5E6272]/20 hover:bg-[#5E6272]/40 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} className="text-[#5E6272]" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors">
                <div className="flex-1">
                  <label className="block text-sm text-[#5E6272] mb-1">
                    Gender
                  </label>
                  {editing.gender ? (
                    <select
                      value={gender ?? ""}
                      onChange={(e) => setGender(e.target.value || null)}
                      className="w-full p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none"
                      autoFocus
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-white">
                      {formatDisplayValue("gender", gender)}
                    </p>
                  )}
                </div>
                <div className="ml-3">
                  {editing.gender ? (
                    <button
                      onClick={() => handleFieldSave("gender")}
                      disabled={fieldLoading.gender}
                      className="p-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {fieldLoading.gender ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save size={16} />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleEdit("gender")}
                      className="p-2 bg-[#5E6272]/20 hover:bg-[#5E6272]/40 rounded-lg transition-colors"
                    >
                      <Edit3 size={16} className="text-[#5E6272]" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => navigate("/metrics")}
                className="w-full bg-[#246BFD] hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingUp size={18} />
                Track Metrics
              </button>
            </div>
          </div>

          <div className="bg-[#262A34] rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3">General Settings</h4>
            <div className="space-y-2">
              {settingsOptions.map((setting, index) => (
                <div
                  key={index}
                  className={`flex justify-between items-center py-3 px-4 rounded-lg text-white cursor-pointer transition-colors ${
                    setting.danger
                      ? "bg-red-600/20 hover:bg-red-600/30"
                      : "bg-[#1F222B] hover:bg-[#2A2E39]"
                  }`}
                  onClick={setting.onClick}
                >
                  <span className={setting.danger ? "text-red-400" : ""}>
                    {setting.label}
                  </span>
                  {setting.label === "Logout" && (
                    <LogOut size={18} className="text-red-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      <BottomBar onLogout={handleLogout} />
    </div>
  );
}
