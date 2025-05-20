import { useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

// Bubbles background on splash screens
function BubblesBackground() {
  const bubbleCount = 25;
  const bubbleColors = ["#8ecae6", "#bde0fe", "#a2d2ff", "#d0f4ff"];

  const bubbles = Array.from({ length: bubbleCount }, (_, i) => {
    const size = Math.random() * 6 + 4; // 4px to 10px
    const left = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = 10 + Math.random() * 10;

    return (
      <div
        key={i}
        className="absolute rounded-full opacity-30 animate-float animate-drift"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${left}%`,
          bottom: `-20px`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          backgroundColor:
            bubbleColors[Math.floor(Math.random() * bubbleColors.length)],
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none">
      {bubbles}
    </div>
  );
}

// Rendering for three onboarding screens
export default function Onboarding() {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const screens = [
    // Splash Screen
    <div
      key="splash"
      className="flex items-center justify-center h-full relative"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
      }}
    >
      <img
        src={logo}
        alt="App Logo"
        style={{ width: 225.49, height: 108 }}
        className="object-contain"
      />
    </div>,

    // Second Screen
    <div
      key="second"
      className="flex justify-center relative"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
        height: "100vh",
      }}
    >
      <div
        style={{
          width: 242,
          height: 392,
          marginTop: 237,
          marginLeft: 52,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <p
          className="font-poppins font-semibold text-white"
          style={{ fontSize: 40, lineHeight: "48px", letterSpacing: 0 }}
        >
          The BRUTE App is here to take your gains to the next level.
        </p>
      </div>
    </div>,

    // Final Screen
    <div
      key="final"
      className="flex flex-col items-center justify-end h-full pb-24 px-6 text-white relative"
      style={{
        background:
          "radial-gradient(circle at center, #001F3F 0%, #000B1A 80%)",
        height: "100vh",
      }}
    >
      <div className="mb-8 text-center font-poppins font-semibold text-3xl leading-[36px] space-y-0">
        <p>Track.</p>
        <p>Progress.</p>
        <p>Grow.</p>
      </div>

      <div className="w-full max-w-xs space-y-4 z-10">
        <button
          onClick={() => navigate("/login")}
          className="w-full bg-blue-500 font-semibold py-3 rounded-xl shadow-lg"
        >
          Log In
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="w-full bg-blue-500 font-semibold py-3 rounded-xl shadow-lg"
        >
          Sign Up
        </button>
      </div>

      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
        By continuing you agree to BRUTE's Terms of Services & Privacy Policy.
      </p>
    </div>,
  ];

  // UX feature to swipe across onboarding screens
  const handlers = useSwipeable({
    onSwipedLeft: () =>
      setPage((prev) => Math.min(prev + 1, screens.length - 1)),
    onSwipedRight: () => setPage((prev) => Math.max(prev - 1, 0)),
    trackMouse: true,
  });

  // UX feature to toggle screens using left and right keys
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        setPage((prev) => Math.min(prev + 1, screens.length - 1));
      } else if (e.key === "ArrowLeft") {
        setPage((prev) => Math.max(prev - 1, 0));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [screens.length]);

  useEffect(() => {
    console.log("Onboarding mounted");
    return () => console.log("Onboarding unmounted");
  }, []);

  // UX feature - dots at bottom of screen
  const dots = (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-4 z-10">
      {screens.map((_, i) => (
        <button
          key={i}
          onClick={() => setPage(i)}
          aria-label={`Go to page ${i + 1}`}
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            page === i ? "bg-white" : "bg-white/30"
          }`}
        />
      ))}
    </div>
  );

  // Full rendering including bubbles and UX features
  return (
    <div
      {...handlers}
      className="w-full h-screen font-poppins overflow-hidden relative select-none"
    >
      <BubblesBackground />
      {screens[page]}
      {dots}
    </div>
  );
}
