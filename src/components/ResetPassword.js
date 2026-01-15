import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { Eye, EyeOff } from "lucide-react";
export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    useEffect(() => {
        const tokenFromUrl = searchParams.get("token");
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        }
        else {
            setError("Invalid reset link. Please request a new password reset.");
        }
    }, [searchParams]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        // Validation
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            setLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            setLoading(false);
            return;
        }
        if (!token) {
            setError("Invalid reset token. Please request a new password reset.");
            setLoading(false);
            return;
        }
        try {
            const response = await fetch("http://localhost:4242/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    newPassword,
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to reset password");
            }
            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        }
        catch (err) {
            setError(err.message || "Failed to reset password");
        }
        finally {
            setLoading(false);
        }
    };
    if (success) {
        return (_jsx(AuthLayout, { title: "Password Reset Successful", footer: _jsx("p", { className: "text-center text-sm text-white/70", children: "Redirecting to login in 3 seconds..." }), children: _jsxs("div", { className: "text-center space-y-4", children: [_jsx("div", { className: "w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto", children: _jsx("svg", { className: "w-8 h-8 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h3", { className: "text-white text-xl font-semibold", children: "Password Updated Successfully!" }), _jsx("p", { className: "text-white/70", children: "Your password has been reset. You can now log in with your new password." }), _jsx("button", { onClick: () => navigate("/login"), className: "w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition text-white", children: "Go to Login" })] }) }));
    }
    return (_jsxs(AuthLayout, { title: "Reset Password", footer: _jsxs("p", { className: "text-center text-sm text-white/70", children: ["Remember your password?", " ", _jsx("button", { onClick: () => navigate("/login"), className: "text-blue-400 underline", children: "Log In" })] }), children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? "text" : "password", placeholder: "New Password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), className: "w-full p-3 pr-12 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none", required: true, minLength: 8 }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white", children: showPassword ? _jsx(EyeOff, { size: 20 }) : _jsx(Eye, { size: 20 }) })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showConfirmPassword ? "text" : "password", placeholder: "Confirm New Password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), className: "w-full p-3 pr-12 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none", required: true, minLength: 8 }), _jsx("button", { type: "button", onClick: () => setShowConfirmPassword(!showConfirmPassword), className: "absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white", children: showConfirmPassword ? _jsx(EyeOff, { size: 20 }) : _jsx(Eye, { size: 20 }) })] }), _jsxs("div", { className: "text-sm text-white/70 space-y-1", children: [_jsx("p", { children: "Password requirements:" }), _jsxs("ul", { className: "list-disc list-inside space-y-1 text-xs", children: [_jsx("li", { children: "At least 8 characters long" }), _jsx("li", { children: "Must match confirmation password" })] })] }), _jsx("button", { type: "submit", disabled: loading || !token, className: "w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition text-white disabled:opacity-50 disabled:cursor-not-allowed", children: loading ? "Resetting Password..." : "Reset Password" })] }), error && (_jsx("p", { className: "text-red-400 mt-4 text-sm text-center", children: error }))] }));
}
