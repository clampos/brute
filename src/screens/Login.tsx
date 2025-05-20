// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white px-6">
      <h1 className="text-3xl font-semibold mb-8 font-poppins">Log In</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
        />

        <button
          type="submit"
          className="w-full py-3 bg-green-600 rounded-xl font-semibold hover:bg-green-700 transition"
        >
          Log In
        </button>
      </form>

      {error && (
        <p className="text-red-400 mt-4 text-sm text-center">{error}</p>
      )}
      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
        Don&apos;t have an account?{" "}
        <button
          onClick={() =>
            (window.location.href =
              "https://buy.stripe.com/test_00w7sL5WZ0a83PL4OAbsc01")
          }
          className="text-blue-400 underline"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}
