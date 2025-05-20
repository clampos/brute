import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4242/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Signup failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Signup error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white px-6">
      <div className="w-full max-w-md px-4 space-y-6">
        <h1 className="text-3xl font-semibold mb-8 font-poppins">Sign Up</h1>
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-white/10"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-white/10"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-blue-600 py-3 rounded font-semibold"
          onClick={handleSignup}
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Continue to Payment"}
        </button>
        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
