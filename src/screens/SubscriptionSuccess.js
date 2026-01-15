import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
export default function SubscriptionSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("Processing your subscription...");
    const [retryCount, setRetryCount] = useState(0);
    const [debugInfo, setDebugInfo] = useState("");
    const email = searchParams.get("email");
    useEffect(() => {
        if (!email) {
            setStatus("Error: No email provided");
            setTimeout(() => navigate("/login"), 3000);
            return;
        }
        const fetchToken = async (retries = 20) => {
            try {
                const attemptNumber = 21 - retries;
                setRetryCount(attemptNumber);
                setStatus(`Verifying subscription... (${attemptNumber}/20)`);
                console.log(`🔄 Attempt ${attemptNumber}/20: Fetching token for ${email}`);
                const res = await fetch(`http://localhost:4242/auth/token?email=${encodeURIComponent(email)}`);
                const responseData = await res.json();
                console.log(`📊 Response status: ${res.status}`, responseData);
                if (!res.ok) {
                    console.log(`⏳ Subscription not ready yet... retries left: ${retries}`, responseData);
                    // Update status with more informative message
                    if (res.status === 404) {
                        setStatus(`Waiting for account creation... (${attemptNumber}/20)`);
                        setDebugInfo("User account is being created in the database...");
                    }
                    else if (res.status === 403) {
                        setStatus(`Waiting for webhook to process... (${attemptNumber}/20)`);
                        setDebugInfo(responseData.debug?.message ||
                            "Stripe webhook is processing your subscription...");
                    }
                    else {
                        setStatus(`Processing... (${attemptNumber}/20)`);
                        setDebugInfo(responseData.debug?.message || "Verifying subscription status...");
                    }
                    if (retries > 0) {
                        // Progressive backoff: start with 3s, increase gradually
                        const delay = Math.min(3000 + attemptNumber * 500, 6000);
                        console.log(`⏰ Waiting ${delay}ms before next attempt...`);
                        setTimeout(() => fetchToken(retries - 1), delay);
                    }
                    else {
                        setStatus("Subscription verification took longer than expected. Please try logging in.");
                        setDebugInfo("If you continue to have issues, please contact support at info@brutegym.com");
                        console.error("❌ Failed to retrieve token after all retries");
                        setTimeout(() => navigate("/login?error=subscription_timeout"), 5000);
                    }
                    return;
                }
                // Success! Token retrieved
                console.log(`✅ Token retrieved successfully on attempt ${attemptNumber}`);
                localStorage.setItem("token", responseData.token);
                setStatus("Success! Redirecting to dashboard...");
                setDebugInfo("Your subscription is now active!");
                // Add delay before navigating
                setTimeout(() => {
                    navigate("/dashboard");
                }, 2000);
            }
            catch (err) {
                console.error("❌ Error fetching token:", err);
                setStatus("Network error. Please check your connection.");
                setDebugInfo("Failed to connect to server. Retrying...");
                if (retries > 0) {
                    setTimeout(() => fetchToken(retries - 1), 3000);
                }
                else {
                    setStatus("Error occurred. Redirecting to login...");
                    setTimeout(() => navigate("/login?error=network_error"), 3000);
                }
            }
        };
        // Add initial delay to allow webhook processing
        console.log("⏰ Initial 3-second delay to allow webhook to process...");
        setTimeout(() => {
            fetchToken();
        }, 3000);
    }, [navigate, searchParams, email]);
    return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center bg-[#000B1A] text-white text-center px-6", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-6" }), _jsx("h1", { className: "text-3xl font-bold mb-4", children: "Welcome to BRUTE! \uD83D\uDCAA" }), _jsx("p", { className: "text-lg mb-2", children: "Subscription complete for:" }), _jsx("p", { className: "text-blue-300 text-lg font-semibold mb-4", children: email }), _jsx("p", { className: "text-sm text-white/70 mb-2", children: status }), retryCount > 0 && (_jsxs("div", { className: "mt-2", children: [_jsxs("p", { className: "text-xs text-white/50", children: ["Attempt ", retryCount, " of 20"] }), debugInfo && (_jsx("p", { className: "text-xs text-white/40 mt-2 max-w-md", children: debugInfo }))] })), retryCount > 10 && (_jsx("div", { className: "mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg max-w-md", children: _jsx("p", { className: "text-xs text-blue-300", children: "Taking longer than usual? This can happen if Stripe's webhook is delayed. Your subscription is likely being processed - please wait a bit longer." }) }))] }));
}
