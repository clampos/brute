import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
export default function Signup() {
    const [firstName, setFirstName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [referralCode, setReferralCode] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const handleSignup = async () => {
        setError("");
        // Required fields
        if (!firstName || !surname || !email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }
        // Password match
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        // Password strength validation
        const validatePassword = (password) => {
            const minLength = 8;
            const hasUpperCase = /[A-Z]/.test(password);
            const hasLowerCase = /[a-z]/.test(password);
            const hasNumbers = /\d/.test(password);
            if (password.length < minLength) {
                return "Password must be at least 8 characters long.";
            }
            if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
                return "Password must contain uppercase, lowercase, and numbers.";
            }
            return null;
        };
        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("http://localhost:4242/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    surname,
                    referralCode,
                }),
            });
            const data = await res.json();
            if (res.ok && data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            }
            else {
                setError(data.error || "Signup failed.");
            }
        }
        catch (err) {
            console.error(err);
            setError("Signup error. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(AuthLayout, { title: "Sign Up", footer: _jsxs("p", { className: "text-center text-sm text-white/70", children: ["Already have an account?", " ", _jsx(Link, { to: "/login", className: "text-blue-400 underline", children: "Log In" })] }), children: _jsxs("div", { className: "space-y-6", children: [_jsx("input", { type: "text", placeholder: "First Name", className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white", value: firstName, onChange: (e) => setFirstName(e.target.value) }), _jsx("input", { type: "text", placeholder: "Surname", className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white", value: surname, onChange: (e) => setSurname(e.target.value) }), _jsx("input", { type: "email", placeholder: "Email", className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white", value: email, onChange: (e) => setEmail(e.target.value) }), _jsx("input", { type: showPassword ? "text" : "password", placeholder: "Password", className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white", value: password, onChange: (e) => setPassword(e.target.value) }), _jsx("input", { type: showPassword ? "text" : "password", placeholder: "Confirm Password", className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value) }), _jsxs("label", { className: "text-sm flex items-center space-x-2", children: [_jsx("input", { type: "checkbox", checked: showPassword, onChange: (e) => setShowPassword(e.target.checked) }), _jsx("span", { children: "Show password" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx("input", { type: "text", placeholder: "Referral Code (Optional)", className: "w-full p-3 rounded bg-white/10 placeholder-white/70 text-white", value: referralCode, onChange: (e) => setReferralCode(e.target.value) }), _jsx("p", { className: "text-sm text-white/60", children: "Have a referral code? Enter it here to get a month free!" })] }), _jsx("button", { className: "w-full bg-blue-600 py-3 rounded font-semibold hover:bg-blue-700 transition", onClick: handleSignup, disabled: loading, children: loading ? "Redirecting..." : "Continue to Payment" }), error && (_jsx("p", { className: "text-red-400 mt-2 text-sm text-center", children: error }))] }) }));
}
