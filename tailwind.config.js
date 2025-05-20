export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial":
          "radial-gradient(circle at center, #0F172A 0%, #1E293B 100%)",
      },
      keyframes: {
        "fade-in-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        float: {
          "0%": { transform: "translateY(0)", opacity: "0.5" },
          "100%": { transform: "translateY(-100vh)", opacity: "0" },
        },
        drift: {
          "0%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(10px)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-down": "fade-in-down 0.6s ease-out",
        float: "float 15s linear infinite",
        drift: "drift 10s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
