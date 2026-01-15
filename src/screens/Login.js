import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import AuthLayout from "../components/AuthLayout";
import { X } from "lucide-react";
export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [forgotPasswordError, setForgotPasswordError] = useState("");
    const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const { token } = await login(email, password);
            localStorage.setItem("token", token);
            navigate("/dashboard");
        }
        catch (err) {
            if (err.response?.status === 401) {
                setError("Invalid email or password.");
            }
            else if (err.response?.status === 403) {
                setError("Your subscription is inactive.");
            }
            else {
                setError("Something went wrong. Please try again.");
            }
        }
    };
    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotPasswordError("");
        setForgotPasswordLoading(true);
        try {
            const response = await fetch("http://localhost:4242/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: forgotPasswordEmail }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to send reset email");
            }
            setForgotPasswordSuccess(true);
        }
        catch (err) {
            setForgotPasswordError(err.message || "Failed to send reset email");
        }
        finally {
            setForgotPasswordLoading(false);
        }
    };
    const resetForgotPasswordModal = () => {
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
        setForgotPasswordError("");
        setForgotPasswordSuccess(false);
        setForgotPasswordLoading(false);
    };
    return (_jsxs(_Fragment, { children: [_jsxs(AuthLayout, { title: "Log In", footer: _jsxs("p", { className: "text-center text-sm text-white/70", children: ["Don't have an account?", " ", _jsx("button", { onClick: () => navigate("/signup"), className: "text-blue-400 underline", children: "Sign Up" })] }), children: [_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsx("input", { type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none" }), _jsx("input", { type: showPassword ? "text" : "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none" }), _jsxs("label", { className: "text-sm flex items-center space-x-2 text-white/70", children: [_jsx("input", { type: "checkbox", checked: showPassword, onChange: (e) => setShowPassword(e.target.checked), className: "rounded" }), _jsx("span", { children: "Show password" })] }), _jsx("div", { className: "text-center", children: _jsx("button", { type: "button", onClick: () => setShowForgotPassword(true), className: "text-sm text-blue-400 underline hover:text-blue-300", children: "Forgot your password?" }) }), _jsx("button", { type: "submit", className: "w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition text-white", children: "Log In" })] }), error && (_jsx("p", { className: "text-red-400 mt-2 text-sm text-center", children: error }))] }), showForgotPassword && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "rounded-xl p-6 w-full max-w-md", style: {
                        background: "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                    }, children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-white text-lg font-semibold", children: "Reset Password" }), _jsx("button", { onClick: resetForgotPasswordModal, className: "text-gray-400 hover:text-white", children: _jsx(X, { size: 24 }) })] }), !forgotPasswordSuccess ? (_jsxs("form", { onSubmit: handleForgotPassword, className: "space-y-4", children: [_jsx("p", { className: "text-white/70 text-sm", children: "Enter your email address and we'll send you a link to reset your password." }), _jsx("input", { type: "email", placeholder: "Email", value: forgotPasswordEmail, onChange: (e) => setForgotPasswordEmail(e.target.value), className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none", required: true }), forgotPasswordError && (_jsx("p", { className: "text-red-400 text-sm", children: forgotPasswordError })), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: resetForgotPasswordModal, className: "flex-1 py-3 bg-white/10 rounded font-semibold hover:bg-white/20 transition text-white", children: "Cancel" }), _jsx("button", { type: "submit", disabled: forgotPasswordLoading, className: "flex-1 py-3 bg-blue-600 rounded font-semibold hover:bg-blue-700 transition text-white disabled:opacity-50", children: forgotPasswordLoading ? "Sending..." : "Send Reset Link" })] })] })) : (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4", children: _jsx("svg", { className: "w-6 h-6 text-white", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h4", { className: "text-white font-semibold mb-2", children: "Check your email" }), _jsxs("p", { className: "text-white/70 text-sm", children: ["If you're on our system, there's a password reset link on its way to", " ", _jsx("span", { className: "text-white", children: forgotPasswordEmail })] })] }), _jsx("button", { onClick: resetForgotPasswordModal, className: "w-full py-3 bg-blue-600 rounded font-semibold hover:bg-blue-700 transition text-white", children: "Done" })] }))] }) }))] }));
}
