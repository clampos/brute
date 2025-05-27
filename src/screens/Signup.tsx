import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    const validatePassword = (password: string) => {
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
        body: JSON.stringify({ email, password, firstName, surname }),
      });

      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || "Signup failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Signup error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white px-6">
      <div className="w-full max-w-md px-4 space-y-6">
        <h1 className="text-3xl font-semibold mb-8 font-poppins">Sign Up</h1>
        <input
          type="text"
          placeholder="First Name"
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Surname"
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm Password"
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <label className="text-sm flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          <span>Show password</span>
        </label>
        <button
          className="w-full bg-blue-600 py-3 rounded font-semibold hover:bg-blue-700 transition"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Continue to Payment"}
        </button>

        {error && (
          <p className="text-red-400 mt-2 text-sm text-center">{error}</p>
        )}

        <p className="text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
