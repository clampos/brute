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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordLoading(true);

    try {
      const response = await fetch(
        "http://localhost:4242/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: forgotPasswordEmail }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send reset email");
      }

      setForgotPasswordSuccess(true);
    } catch (err: any) {
      setForgotPasswordError(err.message || "Failed to send reset email");
    } finally {
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

  return (
    <>
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
            className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none"
          />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none"
          />
          <label className="text-sm flex items-center space-x-2 text-white/70">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="rounded"
            />
            <span>Show password</span>
          </label>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-400 underline hover:text-blue-300"
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition text-white"
          >
            Log In
          </button>
        </form>
        {error && (
          <p className="text-red-400 mt-2 text-sm text-center">{error}</p>
        )}
      </AuthLayout>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            className="rounded-xl p-6 w-full max-w-md"
            style={{
              background:
                "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white text-lg font-semibold">
                Reset Password
              </h3>
              <button
                onClick={resetForgotPasswordModal}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            {!forgotPasswordSuccess ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-white/70 text-sm">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </p>

                <input
                  type="email"
                  placeholder="Email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="w-full p-3 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none"
                  required
                />

                {forgotPasswordError && (
                  <p className="text-red-400 text-sm">{forgotPasswordError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetForgotPasswordModal}
                    className="flex-1 py-3 bg-white/10 rounded font-semibold hover:bg-white/20 transition text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 py-3 bg-blue-600 rounded font-semibold hover:bg-blue-700 transition text-white disabled:opacity-50"
                  >
                    {forgotPasswordLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h4 className="text-white font-semibold mb-2">
                    Check your email
                  </h4>
                  <p className="text-white/70 text-sm">
                    We've sent a password reset link to{" "}
                    <span className="text-white">{forgotPasswordEmail}</span>
                  </p>
                </div>

                <button
                  onClick={resetForgotPasswordModal}
                  className="w-full py-3 bg-blue-600 rounded font-semibold hover:bg-blue-700 transition text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
