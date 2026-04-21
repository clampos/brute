import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
            console.log("SW registered: ", registration);
        })
            .catch((registrationError) => {
            console.log("SW registration failed: ", registrationError);
        });
    });
}
else if ("serviceWorker" in navigator) {
    // Prevent stale local caches from blanking the app during development.
    navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
    })
        .catch(() => {
        // ignore
    });
}
