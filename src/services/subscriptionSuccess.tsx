import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get("email");

  useEffect(() => {
    if (!email) return;

    const finalizeSubscription = async () => {
      await fetch("http://localhost:4242/webhook/success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      navigate("/login"); // or directly to /dashboard if you're issuing a token here
    };

    finalizeSubscription();
  }, [email, navigate]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#000B1A] text-white">
      <h1 className="text-2xl font-semibold mb-4">Subscription Confirmed!</h1>
      <p className="text-lg">Redirecting to your dashboard...</p>
    </div>
  );
}
