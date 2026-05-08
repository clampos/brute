import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { pageTransition, stagger, fadeUp, easeOut } from "../utils/animations";
import {
  Camera,
  SettingsIcon,
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
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import {
  UnitSystem,
  getUnitPreference,
  setUnitPreference,
  getWeightDisplayPreference,
  setWeightDisplayPreference,
  formatHeight,
  formatWeight,
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
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [emailForm, setEmailForm] = useState({
    currentPassword: "",
    newEmail: "",
    confirmEmail: "",
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
  const [imperialWeightType, setImperialWeightType] = useState<"lbs" | "stone">(
    getWeightDisplayPreference()
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

  const toggleImperialWeightType = () => {
    const newType = imperialWeightType === "lbs" ? "stone" : "lbs";
    setImperialWeightType(newType);
    setWeightDisplayPreference(newType);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    fetch("/auth/user/profile", {
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
        "/auth/user/profile-photo",
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
        "/auth/user/profile-photo",
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
      const res = await fetch("/auth/user/profile", {
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
        return formatWeight(value, unitSystem, imperialWeightType === "stone");
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

    fetch("/auth/referrals", {
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

  const resetEmailModal = () => {
    setShowChangeEmail(false);
    setEmailForm({ currentPassword: "", newEmail: "", confirmEmail: "" });
    setEmailError("");
  };

  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

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
        "/auth/change-password",
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
        "/auth/delete-account",
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
      onClick: () => setShowChangeEmail(true),
    },
    {
      label: "Change Password",
      onClick: () => setShowChangePassword(true),
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
    <motion.div
      className="min-h-screen text-[#5E6272] flex flex-col p-4 pb-32 gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
    >
      <TopBar
        title="Settings"
        pageIcon={<SettingsIcon size={18} />}
        menuItems={[
          { label: "Dashboard", onClick: () => navigate("/dashboard") },
          { label: "Programmes", onClick: () => navigate("/programmes") },
          { label: "Workouts", onClick: () => navigate("/workouts") },
          { label: "Track Metrics", onClick: () => navigate("/metrics") },
        ]}
      />

      {/* Profile photo */}
      <div className="glass-card border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-white/20 overflow-hidden flex items-center justify-center bg-white/5">
            {profilePhoto ? (
              <img
                src={`${profilePhoto}`}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
                }}
              />
            ) : null}
            <div className={`absolute inset-0 flex items-center justify-center ${profilePhoto ? "hidden" : "flex"}`}>
              <User size={28} className="text-[#5E6272]" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <label
            htmlFor="profilePhotoUpload"
            className={`cursor-pointer glass-button border border-white/10 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${photoUploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Camera size={14} />
            {photoUploading ? "Uploading…" : "Upload Photo"}
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
              className="glass-button border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
        {profileError && <p className="text-red-400 text-xs text-center">{profileError}</p>}
      </div>

      {/* Quick access — Track Metrics */}
      <motion.button
        onClick={() => navigate("/metrics")}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(158,211,255,0.15)" }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="glass-card border border-[#9ED3FF]/30 rounded-2xl p-4 flex items-center justify-between w-full hover:border-[#9ED3FF]/60 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9ED3FF] to-[#246BFD] flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-medium text-sm">Track Metrics</p>
            <p className="text-[#A0AEC0] text-xs">Bodyweight, body fat & PRs</p>
          </div>
        </div>
        <svg className="text-[#A0AEC0]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </motion.button>

      {/* Personal Profile */}
      <div className="glass-card border border-white/10 rounded-2xl p-5">
        <p className="text-[#A0AEC0] text-xs uppercase tracking-widest mb-4">Personal Profile</p>

        <motion.div className="space-y-3" variants={stagger} initial="hidden" animate="show">
        {/* Unit System */}
        <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-[#9ED3FF]" />
              <span className="text-white text-sm font-medium">Unit System</span>
            </div>
            <button
              onClick={toggleUnitSystem}
              className={`relative w-12 h-6 rounded-full transition-colors ${unitSystem === "imperial" ? "bg-[#246BFD]" : "bg-white/15"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${unitSystem === "imperial" ? "translate-x-6" : "translate-x-0"}`} />
            </button>
          </div>
          <div className="flex gap-3 mt-1">
            <span className={`text-xs ${unitSystem === "metric" ? "text-[#9ED3FF] font-semibold" : "text-[#5E6272]"}`}>Metric (kg, cm)</span>
            <span className={`text-xs ${unitSystem === "imperial" ? "text-[#9ED3FF] font-semibold" : "text-[#5E6272]"}`}>Imperial (lbs/st, ft)</span>
          </div>
          {unitSystem === "imperial" && (
            <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
              <span className="text-white text-xs">Weight display</span>
              <button
                onClick={toggleImperialWeightType}
                className="text-xs px-3 py-1 glass-button border border-white/10 text-[#9ED3FF] rounded-lg"
              >
                {imperialWeightType === "lbs" ? "Switch to Stone" : "Switch to Pounds"}
              </button>
            </div>
          )}
        </motion.div>

        {/* Height */}
        <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[#A0AEC0] text-xs mb-1">Height</p>
              {editing.height ? (
                unitSystem === "metric" ? (
                  <input
                    type="number"
                    value={height ?? ""}
                    onChange={(e) => setHeight(e.target.value === "" ? null : parseFloat(e.target.value))}
                    step="0.1" min="0"
                    className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#9ED3FF] focus:outline-none"
                    placeholder="cm"
                    autoFocus
                  />
                ) : (
                  <div className="flex gap-2">
                    <input type="number" value={heightFeet} onChange={(e) => setHeightFeet(e.target.value)} min="0"
                      className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#9ED3FF] focus:outline-none" placeholder="ft" autoFocus />
                    <input type="number" value={heightInches} onChange={(e) => setHeightInches(e.target.value)} min="0" max="11"
                      className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#9ED3FF] focus:outline-none" placeholder="in" />
                  </div>
                )
              ) : (
                <p className="text-white text-sm">{formatDisplayValue("height", height)}</p>
              )}
            </div>
            <div className="ml-3">
              {editing.height ? (
                <button onClick={() => handleFieldSave("height")} disabled={fieldLoading.height}
                  className="p-2 bg-[#246BFD] rounded-lg disabled:opacity-50">
                  {fieldLoading.height ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={15} className="text-white" />}
                </button>
              ) : (
                <button onClick={() => toggleEdit("height")} className="p-2 glass-button rounded-lg border border-white/10">
                  <Edit3 size={15} className="text-[#A0AEC0]" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Date of Birth */}
        <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[#A0AEC0] text-xs mb-1">Date of Birth</p>
              {editing.birthday ? (
                <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} autoFocus
                  className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-[#9ED3FF] focus:outline-none" />
              ) : (
                <p className="text-white text-sm">{formatDisplayValue("birthday", birthday)}</p>
              )}
            </div>
            <div className="ml-3">
              {editing.birthday ? (
                <button onClick={() => handleFieldSave("birthday")} disabled={fieldLoading.birthday}
                  className="p-2 bg-[#246BFD] rounded-lg disabled:opacity-50">
                  {fieldLoading.birthday ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={15} className="text-white" />}
                </button>
              ) : (
                <button onClick={() => toggleEdit("birthday")} className="p-2 glass-button rounded-lg border border-white/10">
                  <Edit3 size={15} className="text-[#A0AEC0]" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Gender */}
        <motion.div variants={fadeUp} transition={easeOut} className="glass-subtile rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[#A0AEC0] text-xs mb-1">Gender</p>
              {editing.gender ? (
                <select value={gender ?? ""} onChange={(e) => setGender(e.target.value || null)} autoFocus
                  className="w-full p-2 rounded-lg bg-[#0B1220] border border-white/10 text-white text-sm focus:border-[#9ED3FF] focus:outline-none">
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <p className="text-white text-sm">{formatDisplayValue("gender", gender)}</p>
              )}
            </div>
            <div className="ml-3">
              {editing.gender ? (
                <button onClick={() => handleFieldSave("gender")} disabled={fieldLoading.gender}
                  className="p-2 bg-[#246BFD] rounded-lg disabled:opacity-50">
                  {fieldLoading.gender ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={15} className="text-white" />}
                </button>
              ) : (
                <button onClick={() => toggleEdit("gender")} className="p-2 glass-button rounded-lg border border-white/10">
                  <Edit3 size={15} className="text-[#A0AEC0]" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
        </motion.div>
      </div>

      {/* Referral */}
      {referralStats && (
        <div className="glass-card border border-white/10 rounded-2xl p-5">
          <p className="text-[#A0AEC0] text-xs uppercase tracking-widest mb-4">Referrals</p>

          <div className="glass-subtile rounded-xl p-3 mb-3 flex items-center justify-between">
            <div>
              <p className="text-[#A0AEC0] text-xs mb-0.5">Your referral code</p>
              <p className="text-white font-bold tracking-widest">{referralStats.referralCode}</p>
            </div>
            <motion.button
              onClick={copyReferralCode}
              whileTap={{ scale: 0.85, rotate: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="glass-button border border-white/10 p-2.5 rounded-xl"
            >
              {copied ? <Check size={16} className="text-[#86FF99]" /> : <Copy size={16} className="text-[#A0AEC0]" />}
            </motion.button>
          </div>

          <p className="text-[#5E6272] text-xs mb-4 text-center">Share your code — you'll both earn a free month</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-subtile rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#9ED3FF]">{referralStats.totalReferrals}</p>
              <p className="text-[#A0AEC0] text-xs mt-0.5">Referrals</p>
            </div>
            <div className="glass-subtile rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#86FF99]">{referralStats.freeMonthsEarned}</p>
              <p className="text-[#A0AEC0] text-xs mt-0.5">Free months earned</p>
            </div>
          </div>

          {referralStats.referredUsers?.length > 0 && (
            <div className="mt-3 space-y-2">
              {referralStats.referredUsers.slice(0, 5).map((user, index) => (
                <div key={index} className="glass-subtile rounded-xl px-3 py-2 flex justify-between items-center">
                  <span className="text-white text-sm">{user.firstName} {user.surname}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.subscribed ? "bg-[#86FF99]/15 text-[#86FF99]" : "bg-white/5 text-[#5E6272]"}`}>
                    {user.subscribed ? "Active" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account */}
      <div className="glass-card border border-white/10 rounded-2xl p-5">
        <p className="text-[#A0AEC0] text-xs uppercase tracking-widest mb-4">Account</p>
        <div className="space-y-2">
          <button onClick={() => setShowChangeEmail(true)}
            className="w-full glass-subtile rounded-xl px-4 py-3 flex justify-between items-center text-white text-sm">
            <span>Change Email</span>
            <svg className="text-[#5E6272]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button onClick={() => setShowChangePassword(true)}
            className="w-full glass-subtile rounded-xl px-4 py-3 flex justify-between items-center text-white text-sm">
            <span>Change Password</span>
            <svg className="text-[#5E6272]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button onClick={handleLogout}
            className="w-full rounded-xl px-4 py-3 flex justify-between items-center text-sm bg-red-500/10 border border-red-500/20">
            <span className="text-red-400 font-medium">Log Out</span>
            <LogOut size={15} className="text-red-400" />
          </button>
          <button onClick={() => setShowDeleteAccount(true)}
            className="w-full rounded-xl px-4 py-3 text-left text-xs text-[#5E6272]">
            Delete Account
          </button>
        </div>
      </div>

      {/* Change Password modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 z-50">
          <div className="glass-modal border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-semibold">Change Password</h3>
              <button onClick={resetPasswordModal} className="text-[#5E6272] hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-3">
              {["currentPassword", "newPassword", "confirmPassword"].map((field, i) => (
                <input key={field} type="password"
                  placeholder={["Current password", "New password", "Confirm new password"][i]}
                  value={passwordForm[field as keyof typeof passwordForm]}
                  onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:border-[#9ED3FF] focus:outline-none"
                  required minLength={field !== "currentPassword" ? 8 : undefined}
                />
              ))}
              {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetPasswordModal}
                  className="flex-1 py-3 glass-button border border-white/10 rounded-xl text-white text-sm font-medium">Cancel</button>
                <button type="submit" disabled={passwordLoading}
                  className="flex-1 py-3 bg-[#246BFD] rounded-xl text-white text-sm font-medium disabled:opacity-50">
                  {passwordLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Email modal */}
      {showChangeEmail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 z-50">
          <div className="glass-modal border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-white font-semibold">Change Email</h3>
              <button onClick={resetEmailModal} className="text-[#5E6272] hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setEmailError("");
              setEmailLoading(true);
              if (emailForm.newEmail !== emailForm.confirmEmail) { setEmailError("Emails don't match"); setEmailLoading(false); return; }
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(emailForm.newEmail)) { setEmailError("Invalid email address"); setEmailLoading(false); return; }
              try {
                const token = localStorage.getItem("token");
                const res = await fetch("/auth/change-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ currentPassword: emailForm.currentPassword, newEmail: emailForm.newEmail }),
                });
                if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || "Failed to change email"); }
                resetEmailModal();
                alert("Email changed. Please log in with your new email.");
                localStorage.removeItem("token");
                navigate("/login");
              } catch (err: any) { setEmailError(err.message || "Failed to change email"); }
              finally { setEmailLoading(false); }
            }} className="space-y-3">
              <input type="password" placeholder="Current password" value={emailForm.currentPassword}
                onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:border-[#9ED3FF] focus:outline-none" required />
              <input type="email" placeholder="New email" value={emailForm.newEmail}
                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:border-[#9ED3FF] focus:outline-none" required />
              <input type="email" placeholder="Confirm new email" value={emailForm.confirmEmail}
                onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:border-[#9ED3FF] focus:outline-none" required />
              {emailError && <p className="text-red-400 text-xs">{emailError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={resetEmailModal}
                  className="flex-1 py-3 glass-button border border-white/10 rounded-xl text-white text-sm font-medium">Cancel</button>
                <button type="submit" disabled={emailLoading}
                  className="flex-1 py-3 bg-[#246BFD] rounded-xl text-white text-sm font-medium disabled:opacity-50">
                  {emailLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Account modal */}
      {showDeleteAccount && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4 z-50">
          <div className="glass-modal border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Delete Account</h3>
              <button onClick={resetDeleteAccountModal} className="text-[#5E6272] hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-[#A0AEC0] text-sm mb-6">This will permanently delete your account and all your data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={resetDeleteAccountModal}
                className="flex-1 py-3 glass-button border border-white/10 rounded-xl text-white text-sm font-medium">Cancel</button>
              <button type="button" onClick={handleDeleteAccount}
                className="flex-1 py-3 bg-red-600 rounded-xl text-white text-sm font-medium hover:bg-red-700">Delete Account</button>
            </div>
          </div>
        </div>
      )}

      <BottomBar onLogout={handleLogout} />
    </motion.div>
  );

}
