import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    const email = searchParams.get("email");
    if (!email) return;

    const fetchToken = async (retries = 10) => {
      try {
        const res = await fetch(
          `http://localhost:4242/auth/token?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) {
          if (retries > 0) {
            console.log(
              `⏳ Waiting for subscription... retries left: ${retries}`
            );
            setTimeout(() => fetchToken(retries - 1), 1000);
          } else {
            throw new Error("Failed to retrieve token after retries");
          }
          return;
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);

        // ✅ Add delay before navigating
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000); // 2 seconds
      } catch (err) {
        console.error("Error fetching token:", err);
        navigate("/login");
      }
    };

    fetchToken();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000B1A] text-white text-center px-6">
      <h1 className="text-3xl font-bold mb-4">Welcome to BRUTE! 💪</h1>
      <p className="text-lg">Subscription complete for:</p>
      <p className="text-blue-300 text-lg mt-1 font-semibold">{email}</p>
      <p className="mt-4 text-sm text-white/70">
        Redirecting you to your dashboard...
      </p>
    </div>
  );
}
