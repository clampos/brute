import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-[#001F3F] to-[#000B1A] text-white px-6">
      <h1 className="text-3xl font-semibold mb-8 font-poppins">Log In</h1>

      <form className="w-full max-w-sm space-y-6">
        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-md bg-white/10 placeholder-white/70 text-white focus:outline-none"
        />

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 rounded-xl font-semibold hover:bg-blue-700 transition"
        >
          Log In
        </button>
      </form>

      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
        Don&apos;t have an account?{" "}
        <button
            onClick={() =>
    window.location.href = "https://buy.stripe.com/test_00w7sL5WZ0a83PL4OAbsc01"
  }
          className="text-blue-400 underline"
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}
