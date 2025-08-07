import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Processing your subscription...");
  const [retryCount, setRetryCount] = useState(0);
  const email = searchParams.get("email");

  useEffect(() => {
    if (!email) {
      setStatus("Error: No email provided");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    const fetchToken = async (retries = 15) => {
      try {
        setRetryCount(16 - retries);
        setStatus(`Verifying subscription... (${16 - retries}/15)`);

        const res = await fetch(
          `http://localhost:4242/auth/token?email=${encodeURIComponent(email)}`
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.log(
            `⏳ Subscription not ready yet... retries left: ${retries}`,
            errorData
          );

          if (retries > 0) {
            // Exponential backoff - start with 2s, then 4s, 6s, etc.
            const delay = Math.min(2000 + (16 - retries) * 500, 5000);
            setTimeout(() => fetchToken(retries - 1), delay);
          } else {
            setStatus(
              "Subscription verification failed. Redirecting to login..."
            );
            console.error("Failed to retrieve token after all retries");
            setTimeout(
              () => navigate("/login?error=subscription_failed"),
              3000
            );
          }
          return;
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);
        setStatus("Success! Redirecting to dashboard...");

        // Add delay before navigating
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      } catch (err) {
        console.error("Error fetching token:", err);
        setStatus("Error occurred. Redirecting to login...");
        setTimeout(() => navigate("/login?error=network_error"), 3000);
      }
    };

    // Add initial delay to allow webhook processing
    setTimeout(() => {
      fetchToken();
    }, 3000); // 3 second initial delay
  }, [navigate, searchParams, email]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000B1A] text-white text-center px-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-6"></div>
      <h1 className="text-3xl font-bold mb-4">Welcome to BRUTE! 💪</h1>
      <p className="text-lg mb-2">Subscription complete for:</p>
      <p className="text-blue-300 text-lg font-semibold mb-4">{email}</p>
      <p className="text-sm text-white/70">{status}</p>
      {retryCount > 0 && (
        <p className="text-xs text-white/50 mt-2">Attempt {retryCount} of 15</p>
      )}
    </div>
  );
}
