import { useNavigate } from "react-router-dom";
import { FormEvent, useState } from "react";

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4242/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // You can send user data here later if needed
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        alert("Something went wrong.");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Failed to create checkout session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white px-6">
      <h1 className="text-3xl font-semibold mb-8 font-poppins">Sign Up</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
          required
        />

        <button
          type="submit"
          className="w-full py-3 bg-green-600 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Redirecting..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
        Already have an account?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-blue-400 underline"
        >
          Log In
        </button>
      </p>
    </div>
  );
}
