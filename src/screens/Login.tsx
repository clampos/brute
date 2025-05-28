import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const { token } = await login(email, password);
      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (err.response?.status === 403) {
        setError("Your subscription is inactive.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <AuthLayout
      title="Log In"
      footer={
        <p className="text-center text-sm text-white/70">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => navigate("/signup")}
            className="text-blue-400 underline"
          >
            Sign Up
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
        />
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white"
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
          type="submit"
          className="w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition"
        >
          Log In
        </button>
      </form>
      {error && (
        <p className="text-red-400 mt-2 text-sm text-center">{error}</p>
      )}
    </AuthLayout>
  );
}
