import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, SettingsIcon, Copy, Check, X, User, Edit3, Save, TrendingUp, LogOut, Globe, } from "lucide-react";
import TopBar from "../components/TopBar";
import BottomBar from "../components/BottomBar";
import { getUnitPreference, setUnitPreference, getWeightDisplayPreference, setWeightDisplayPreference, formatHeight, formatWeight, cmToFeetAndInches, feetAndInchesToCm, } from "../utils/unitConversions";
export default function Settings() {
    const [referralStats, setReferralStats] = useState(null);
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
    const [bodyweight, setBodyweight] = useState(null);
    const [height, setHeight] = useState(null);
    const [birthday, setBirthday] = useState("");
    const [gender, setGender] = useState(null);
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [profileError, setProfileError] = useState(null);
    const [photoUploading, setPhotoUploading] = useState(false);
    // Unit system state
    const [unitSystem, setUnitSystemState] = useState(getUnitPreference());
    const [imperialWeightType, setImperialWeightType] = useState(getWeightDisplayPreference());
    // Imperial height input state
    const [heightFeet, setHeightFeet] = useState("");
    const [heightInches, setHeightInches] = useState("");
    const [editing, setEditing] = useState({
        bodyweight: false,
        height: false,
        birthday: false,
        gender: false,
    });
    const [fieldLoading, setFieldLoading] = useState({
        bodyweight: false,
        height: false,
        birthday: false,
        gender: false,
    });
    const calculateAge = (birthdayString) => {
        if (!birthdayString)
            return null;
        const today = new Date();
        const birthDate = new Date(birthdayString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    const toggleUnitSystem = () => {
        const newSystem = unitSystem === "metric" ? "imperial" : "metric";
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
            setBirthday(data.birthday
                ? new Date(data.birthday).toISOString().split("T")[0]
                : "");
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
    const handleProfilePhotoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file)
            return;
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
            const response = await fetch("http://localhost:4242/auth/user/profile-photo", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });
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
        }
        catch (error) {
            console.error("Error uploading photo:", error);
            setProfileError("Failed to upload photo. Please try again.");
            alert("Failed to upload photo. Please try again.");
        }
        finally {
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
            const response = await fetch("http://localhost:4242/auth/user/profile-photo", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
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
        }
        catch (error) {
            console.error("Error removing photo:", error);
            setProfileError("Failed to remove photo. Please try again.");
            alert("Failed to remove photo. Please try again.");
        }
        finally {
            setPhotoUploading(false);
        }
    };
    const handleFieldSave = async (field) => {
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
                }
                catch {
                    errorData = { error: "Unknown error" };
                }
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }
            const result = await res.json();
            setEditing({ ...editing, [field]: false });
            setProfileError(null);
        }
        catch (err) {
            console.error("Profile save error:", err);
            setProfileError(err.message || "Failed to update profile");
        }
        finally {
            setFieldLoading({ ...fieldLoading, [field]: false });
        }
    };
    const toggleEdit = (field) => {
        setEditing({ ...editing, [field]: !editing[field] });
        // When starting to edit height in imperial, set the current values
        if (field === "height" &&
            !editing[field] &&
            height &&
            unitSystem === "imperial") {
            const { feet, inches } = cmToFeetAndInches(height);
            setHeightFeet(feet.toString());
            setHeightInches(inches.toString());
        }
    };
    const formatDisplayValue = (field, value) => {
        switch (field) {
            case "bodyweight":
                return formatWeight(value, unitSystem, imperialWeightType === "stone");
            case "height":
                return formatHeight(value, unitSystem);
            case "birthday":
                if (!value)
                    return "Not set";
                const age = calculateAge(value);
                return `${new Date(value).toLocaleDateString()} ${age !== null ? `(Age: ${age})` : ""}`;
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
            if (!res.ok)
                throw new Error("Unauthorized");
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
            }
            catch (err) {
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
    const handleChangePassword = async (e) => {
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
            const response = await fetch("http://localhost:4242/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });
            if (!response.ok) {
                throw new Error("Failed to change password. Please check your current password.");
            }
            resetPasswordModal();
            alert("Password changed successfully!");
        }
        catch (err) {
            setPasswordError(err.message || "Failed to change password");
        }
        finally {
            setPasswordLoading(false);
        }
    };
    const handleDeleteAccount = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch("http://localhost:4242/auth/delete-account", {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error("Failed to delete account.");
            }
            localStorage.clear();
            alert("Account deleted successfully.");
            navigate("/login");
        }
        catch (err) {
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
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center text-white font-poppins bg-gradient-to-b from-[#001F3F] to-[#000B1A]", children: "Loading settings..." }));
    }
    return (_jsxs("div", { className: "min-h-screen text-[#5E6272] flex flex-col p-4 pb-16", style: {
            backgroundColor: "#0A0E1A",
        }, children: [_jsx(TopBar, { title: "Settings", pageIcon: _jsx(SettingsIcon, { size: 18 }), menuItems: [
                    { label: "Dashboard", onClick: () => navigate("/") },
                    { label: "Programmes", onClick: () => navigate("/programmes") },
                    { label: "Workouts", onClick: () => navigate("/workouts") },
                    { label: "Track Metrics", onClick: () => navigate("/metrics") },
                ] }), _jsxs("div", { className: "mt-8 rounded-2xl p-6 bg-gradient-to-br from-[#FFB8E0] via-[#BE9EFF] via-[#88C0FC] to-[#86FF99] text-black text-center", children: [_jsx("h3", { className: "text-lg font-semibold mb-2", style: { fontFamily: "'Poppins', sans-serif" }, children: "Your Referral Code" }), _jsxs("div", { className: "flex items-center justify-center gap-2 mb-4", children: [_jsx("p", { className: "text-xl font-bold tracking-wide", children: referralStats?.referralCode }), _jsx("button", { onClick: copyReferralCode, className: "p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors", children: copied ? _jsx(Check, { size: 16 }) : _jsx(Copy, { size: 16 }) })] }), _jsx("p", { className: "text-sm", children: "Share this code with friends - you'll both get a free month!" })] }), referralStats && (_jsxs("div", { className: "mt-6 space-y-4", children: [_jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsx("h4", { className: "text-white font-semibold mb-3", children: "Referral Stats" }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-[#246BFD]", children: referralStats.freeMonthsEarned }), _jsx("p", { className: "text-sm text-[#5E6272]", children: "Free Months Earned" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl font-bold text-[#246BFD]", children: referralStats.totalReferrals }), _jsx("p", { className: "text-sm text-[#5E6272]", children: "Total Referrals" })] })] }), _jsx("div", { className: "mt-4 text-center", children: _jsxs("p", { className: "text-sm text-[#5E6272]", children: ["Referral Credits Available:", " ", _jsx("span", { className: "text-white font-semibold", children: referralStats.referralCredits })] }) })] }), referralStats.referredUsers?.length > 0 && (_jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsx("h4", { className: "text-white font-semibold mb-3", children: "Recent Referrals" }), _jsx("div", { className: "space-y-2", children: referralStats.referredUsers.slice(0, 5).map((user, index) => (_jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0", children: [_jsxs("span", { className: "text-white", children: [user.firstName, " ", user.surname] }), _jsx("span", { className: `text-xs px-2 py-1 rounded ${user.subscribed
                                                ? "bg-green-600 text-white"
                                                : "bg-gray-600 text-gray-300"}`, children: user.subscribed ? "Active" : "Pending" })] }, index))) })] })), _jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsx("h4", { className: "text-white font-semibold mb-3", children: "Personal Profile" }), profileError && (_jsx("div", { className: "mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg", children: _jsx("p", { className: "text-red-400 text-sm", children: profileError }) })), _jsxs("div", { className: "space-y-4 text-white", children: [_jsxs("div", { className: "flex flex-col items-center space-y-2 mb-6", children: [_jsxs("div", { className: "w-24 h-24 rounded-full bg-[#1F222B] border-2 border-[#5E6272] overflow-hidden flex items-center justify-center relative", children: [profilePhoto ? (_jsx("img", { src: `http://localhost:4242${profilePhoto}`, alt: "Profile", className: "w-full h-full object-cover", onError: (e) => {
                                                            e.currentTarget.style.display = "none";
                                                            const fallback = e.currentTarget.parentElement.querySelector(".fallback-icon");
                                                            if (fallback) {
                                                                fallback.style.display = "flex";
                                                            }
                                                        } })) : null, _jsx("div", { className: `absolute inset-0 w-full h-full bg-[#1F222B] flex items-center justify-center fallback-icon ${profilePhoto ? "hidden" : "flex"}`, children: _jsx(User, { size: 32, className: "text-[#5E6272]" }) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("label", { htmlFor: "profilePhotoUpload", className: `cursor-pointer bg-[#86FF99] text-black px-4 py-2 rounded font-semibold hover:bg-[#6bd664] transition flex items-center gap-2 select-none ${photoUploading ? "opacity-50 cursor-not-allowed" : ""}`, children: [_jsx(Camera, { size: 16 }), photoUploading ? "Uploading..." : "Upload", _jsx("input", { type: "file", id: "profilePhotoUpload", accept: "image/*", className: "hidden", onChange: handleProfilePhotoUpload, disabled: photoUploading })] }), profilePhoto && (_jsx("button", { onClick: handleRemoveProfilePhoto, disabled: photoUploading, className: "bg-red-600 hover:bg-red-700 rounded px-4 py-2 font-semibold text-white disabled:opacity-50", children: "Remove" }))] })] }), _jsxs("div", { className: "mb-4 p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Globe, { size: 18, className: "text-[#246BFD]" }), _jsx("span", { className: "text-white font-medium", children: "Unit System" })] }), _jsx("button", { onClick: toggleUnitSystem, className: `relative w-14 h-7 rounded-full transition-colors ${unitSystem === "imperial"
                                                            ? "bg-[#246BFD]"
                                                            : "bg-[#5E6272]"}`, children: _jsx("div", { className: `absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${unitSystem === "imperial"
                                                                ? "translate-x-7"
                                                                : "translate-x-0"}` }) })] }), _jsxs("div", { className: "flex gap-4 mt-2", children: [_jsx("span", { className: `text-sm ${unitSystem === "metric"
                                                            ? "text-[#246BFD] font-semibold"
                                                            : "text-[#5E6272]"}`, children: "Metric (kg, cm)" }), _jsx("span", { className: `text-sm ${unitSystem === "imperial"
                                                            ? "text-[#246BFD] font-semibold"
                                                            : "text-[#5E6272]"}`, children: "Imperial (lbs/st, ft)" })] }), unitSystem === "imperial" && (_jsx("div", { className: "mt-3 pt-3 border-t border-[#5E6272]/30", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-white text-sm", children: "Weight Display" }), _jsx("button", { onClick: toggleImperialWeightType, className: "px-3 py-1 bg-[#246BFD] hover:bg-blue-700 rounded-lg text-white text-xs font-medium transition-colors", children: imperialWeightType === "lbs"
                                                                ? "Switch to Stone"
                                                                : "Switch to Pounds" })] }) }))] }), _jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm text-[#5E6272] mb-1", children: "Bodyweight" }), _jsx("p", { className: "text-white", children: formatDisplayValue("bodyweight", bodyweight) }), _jsx("p", { className: "text-xs text-[#5E6272] mt-1", children: "Update via Track Metrics \u2192" })] }), _jsx("div", { className: "ml-3", children: _jsx("button", { onClick: () => navigate("/metrics"), className: "p-2 bg-[#246BFD]/20 hover:bg-[#246BFD]/40 rounded-lg transition-colors", children: _jsx(TrendingUp, { size: 16, className: "text-[#246BFD]" }) }) })] }), _jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm text-[#5E6272] mb-1", children: "Height" }), editing.height ? (unitSystem === "metric" ? (_jsx("input", { type: "number", value: height ?? "", onChange: (e) => setHeight(e.target.value === ""
                                                            ? null
                                                            : parseFloat(e.target.value)), step: "0.1", min: "0", className: "w-full p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", placeholder: "Enter height in cm", autoFocus: true })) : (_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "number", value: heightFeet, onChange: (e) => setHeightFeet(e.target.value), min: "0", className: "flex-1 p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", placeholder: "Feet", autoFocus: true }), _jsx("input", { type: "number", value: heightInches, onChange: (e) => setHeightInches(e.target.value), min: "0", max: "11", className: "flex-1 p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", placeholder: "Inches" })] }))) : (_jsx("p", { className: "text-white", children: formatDisplayValue("height", height) }))] }), _jsx("div", { className: "ml-3", children: editing.height ? (_jsx("button", { onClick: () => handleFieldSave("height"), disabled: fieldLoading.height, className: "p-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50", children: fieldLoading.height ? (_jsx("div", { className: "w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" })) : (_jsx(Save, { size: 16 })) })) : (_jsx("button", { onClick: () => toggleEdit("height"), className: "p-2 bg-[#5E6272]/20 hover:bg-[#5E6272]/40 rounded-lg transition-colors", children: _jsx(Edit3, { size: 16, className: "text-[#5E6272]" }) })) })] }), _jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm text-[#5E6272] mb-1", children: "Date of Birth" }), editing.birthday ? (_jsx("input", { type: "date", value: birthday, onChange: (e) => setBirthday(e.target.value), className: "w-full p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", autoFocus: true })) : (_jsx("p", { className: "text-white", children: formatDisplayValue("birthday", birthday) }))] }), _jsx("div", { className: "ml-3", children: editing.birthday ? (_jsx("button", { onClick: () => handleFieldSave("birthday"), disabled: fieldLoading.birthday, className: "p-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50", children: fieldLoading.birthday ? (_jsx("div", { className: "w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" })) : (_jsx(Save, { size: 16 })) })) : (_jsx("button", { onClick: () => toggleEdit("birthday"), className: "p-2 bg-[#5E6272]/20 hover:bg-[#5E6272]/40 rounded-lg transition-colors", children: _jsx(Edit3, { size: 16, className: "text-[#5E6272]" }) })) })] }), _jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg bg-[#1F222B] border border-transparent hover:border-[#5E6272]/30 transition-colors", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-sm text-[#5E6272] mb-1", children: "Gender" }), editing.gender ? (_jsxs("select", { value: gender ?? "", onChange: (e) => setGender(e.target.value || null), className: "w-full p-2 rounded bg-[#262A34] text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", autoFocus: true, children: [_jsx("option", { value: "", children: "Select" }), _jsx("option", { value: "Male", children: "Male" }), _jsx("option", { value: "Female", children: "Female" }), _jsx("option", { value: "Non-binary", children: "Non-binary" }), _jsx("option", { value: "Other", children: "Other" })] })) : (_jsx("p", { className: "text-white", children: formatDisplayValue("gender", gender) }))] }), _jsx("div", { className: "ml-3", children: editing.gender ? (_jsx("button", { onClick: () => handleFieldSave("gender"), disabled: fieldLoading.gender, className: "p-2 bg-[#246BFD] hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50", children: fieldLoading.gender ? (_jsx("div", { className: "w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" })) : (_jsx(Save, { size: 16 })) })) : (_jsx("button", { onClick: () => toggleEdit("gender"), className: "p-2 bg-[#5E6272]/20 hover:bg-[#5E6272]/40 rounded-lg transition-colors", children: _jsx(Edit3, { size: 16, className: "text-[#5E6272]" }) })) })] })] }), _jsx("div", { className: "mt-4", children: _jsxs("button", { onClick: () => navigate("/metrics"), className: "w-full bg-[#246BFD] hover:bg-blue-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors", children: [_jsx(TrendingUp, { size: 18 }), "Track Metrics"] }) })] }), _jsxs("div", { className: "bg-[#262A34] rounded-xl p-4", children: [_jsx("h4", { className: "text-white font-semibold mb-3", children: "General Settings" }), _jsx("div", { className: "space-y-2", children: settingsOptions.map((setting, index) => (_jsxs("div", { className: `flex justify-between items-center py-3 px-4 rounded-lg text-white cursor-pointer transition-colors ${setting.danger
                                        ? "bg-red-600/20 hover:bg-red-600/30"
                                        : "bg-[#1F222B] hover:bg-[#2A2E39]"}`, onClick: setting.onClick, children: [_jsx("span", { className: setting.danger ? "text-red-400" : "", children: setting.label }), setting.label === "Logout" && (_jsx(LogOut, { size: 18, className: "text-red-400" }))] }, index))) })] })] })), showChangePassword && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#262A34] rounded-xl p-6 w-full max-w-md", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-white text-lg font-semibold", children: "Change Password" }), _jsx("button", { onClick: resetPasswordModal, className: "text-gray-400 hover:text-white", children: _jsx(X, { size: 24 }) })] }), _jsxs("form", { onSubmit: handleChangePassword, className: "space-y-4", children: [_jsx("input", { type: "password", placeholder: "Current Password", value: passwordForm.currentPassword, onChange: (e) => setPasswordForm({
                                        ...passwordForm,
                                        currentPassword: e.target.value,
                                    }), className: "w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", required: true }), _jsx("input", { type: "password", placeholder: "New Password", value: passwordForm.newPassword, onChange: (e) => setPasswordForm({
                                        ...passwordForm,
                                        newPassword: e.target.value,
                                    }), className: "w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", required: true, minLength: 8 }), _jsx("input", { type: "password", placeholder: "Confirm New Password", value: passwordForm.confirmPassword, onChange: (e) => setPasswordForm({
                                        ...passwordForm,
                                        confirmPassword: e.target.value,
                                    }), className: "w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", required: true, minLength: 8 }), passwordError && (_jsx("p", { className: "text-red-400 text-sm", children: passwordError })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: resetPasswordModal, className: "flex-1 py-3 bg-gray-600 rounded font-semibold hover:bg-gray-700 transition text-white", children: "Cancel" }), _jsx("button", { type: "submit", disabled: passwordLoading, className: "flex-1 py-3 bg-[#246BFD] rounded font-semibold hover:bg-blue-700 transition text-white disabled:opacity-50", children: passwordLoading ? "Changing..." : "Change Password" })] })] })] }) })), showChangeEmail && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#262A34] rounded-xl p-6 w-full max-w-md", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-white text-lg font-semibold", children: "Change Email" }), _jsx("button", { onClick: resetEmailModal, className: "text-gray-400 hover:text-white", children: _jsx(X, { size: 24 }) })] }), _jsxs("form", { onSubmit: async (e) => {
                                e.preventDefault();
                                setEmailError("");
                                setEmailLoading(true);
                                if (emailForm.newEmail !== emailForm.confirmEmail) {
                                    setEmailError("Emails don't match");
                                    setEmailLoading(false);
                                    return;
                                }
                                // simple email format check
                                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                if (!emailRegex.test(emailForm.newEmail)) {
                                    setEmailError("Please enter a valid email address");
                                    setEmailLoading(false);
                                    return;
                                }
                                try {
                                    const token = localStorage.getItem("token");
                                    const res = await fetch("http://localhost:4242/auth/change-email", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({
                                            currentPassword: emailForm.currentPassword,
                                            newEmail: emailForm.newEmail,
                                        }),
                                    });
                                    if (!res.ok) {
                                        const body = await res.json().catch(() => ({}));
                                        throw new Error(body.error || "Failed to change email");
                                    }
                                    resetEmailModal();
                                    alert("Email changed successfully. Please use your new email to login next time.");
                                    // Optionally, log out the user to force re-login
                                    localStorage.removeItem("token");
                                    navigate("/login");
                                }
                                catch (err) {
                                    setEmailError(err.message || "Failed to change email");
                                }
                                finally {
                                    setEmailLoading(false);
                                }
                            }, className: "space-y-4", children: [_jsx("input", { type: "password", placeholder: "Current Password", value: emailForm.currentPassword, onChange: (e) => setEmailForm({
                                        ...emailForm,
                                        currentPassword: e.target.value,
                                    }), className: "w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", required: true }), _jsx("input", { type: "email", placeholder: "New Email", value: emailForm.newEmail, onChange: (e) => setEmailForm({ ...emailForm, newEmail: e.target.value }), className: "w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", required: true }), _jsx("input", { type: "email", placeholder: "Confirm New Email", value: emailForm.confirmEmail, onChange: (e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value }), className: "w-full p-3 rounded bg-[#1F222B] placeholder-white/70 text-white border border-gray-600 focus:border-[#246BFD] focus:outline-none", required: true }), emailError && (_jsx("p", { className: "text-red-400 text-sm", children: emailError })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: resetEmailModal, className: "flex-1 py-3 bg-gray-600 rounded font-semibold hover:bg-gray-700 transition text-white", children: "Cancel" }), _jsx("button", { type: "submit", disabled: emailLoading, className: "flex-1 py-3 bg-[#246BFD] rounded font-semibold hover:bg-blue-700 transition text-white disabled:opacity-50", children: emailLoading ? "Changing..." : "Change Email" })] })] })] }) })), showDeleteAccount && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-[#262A34] rounded-xl p-6 w-full max-w-md", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-white text-lg font-semibold", children: "Delete Account" }), _jsx("button", { onClick: resetDeleteAccountModal, className: "text-gray-400 hover:text-white", children: _jsx(X, { size: 24 }) })] }), _jsx("p", { className: "text-red-500 mb-6", children: "Are you sure you want to delete your account? This action cannot be undone." }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: resetDeleteAccountModal, className: "flex-1 py-3 bg-gray-600 rounded font-semibold hover:bg-gray-700 transition text-white", children: "Cancel" }), _jsx("button", { type: "button", onClick: handleDeleteAccount, className: "flex-1 py-3 bg-red-600 rounded font-semibold hover:bg-red-700 transition text-white", children: "Delete Account" })] })] }) })), _jsx(BottomBar, { onLogout: handleLogout })] }));
}
