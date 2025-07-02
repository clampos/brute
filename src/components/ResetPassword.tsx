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
    } else {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const response = await fetch(
        "http://localhost:4242/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }

      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Password Reset Successful"
        footer={
          <p className="text-center text-sm text-white/70">
            Redirecting to login in 3 seconds...
          </p>
        }
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-white"
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
          <h3 className="text-white text-xl font-semibold">
            Password Updated Successfully!
          </h3>
          <p className="text-white/70">
            Your password has been reset. You can now log in with your new
            password.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition text-white"
          >
            Go to Login
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset Password"
      footer={
        <p className="text-center text-sm text-white/70">
          Remember your password?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-blue-400 underline"
          >
            Log In
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full p-3 pr-12 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 pr-12 rounded bg-white/10 placeholder-white/70 text-white border border-transparent focus:border-white/30 focus:outline-none"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="text-sm text-white/70 space-y-1">
          <p>Password requirements:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>At least 8 characters long</li>
            <li>Must match confirmation password</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full py-3 bg-green-600 rounded font-semibold hover:bg-green-700 transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Resetting Password..." : "Reset Password"}
        </button>
      </form>

      {error && (
        <p className="text-red-400 mt-4 text-sm text-center">{error}</p>
      )}
    </AuthLayout>
  );
}
