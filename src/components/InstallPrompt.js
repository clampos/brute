import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
export default function InstallPrompt({ forceShow = false, }) {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    useEffect(() => {
        const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
        const isIOSStandalone = window.navigator.standalone === true;
        if (isStandalone || isIOSStandalone) {
            setIsInstalled(true);
            return;
        }
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!localStorage.getItem("installPromptDismissed")) {
                setShowPrompt(true);
            }
        };
        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        });
        // Show prompt immediately if forced and not installed & not dismissed
        if (forceShow &&
            !isInstalled &&
            !localStorage.getItem("installPromptDismissed")) {
            setShowPrompt(true);
        }
        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, [forceShow, isInstalled]);
    const handleInstallClick = async () => {
        if (!deferredPrompt)
            return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            console.log("User accepted the install prompt");
        }
        else {
            console.log("User dismissed the install prompt");
        }
        setDeferredPrompt(null);
        setShowPrompt(false);
    };
    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem("installPromptDismissed", "true");
    };
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSSafari = isIOS && !window.MSStream && !window.chrome;
    if (isInstalled || !showPrompt)
        return null;
    return (_jsx("div", { className: "fixed bottom-20 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg z-50", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center space-x-2 mb-2", children: [_jsx(Download, { size: 20, className: "text-white" }), _jsx("h3", { className: "font-semibold text-white", children: "Install BRUTE App" })] }), isIOSSafari ? (_jsx("p", { className: "text-white/90 text-sm", children: "Tap the share button in Safari and select \"Add to Home Screen\" to install BRUTE" })) : (_jsx("p", { className: "text-white/90 text-sm", children: "Install BRUTE for faster access and a better experience" })), !isIOSSafari && (_jsx(_Fragment, { children: deferredPrompt ? (_jsx("button", { onClick: handleInstallClick, className: "mt-3 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm", children: "Install Now" })) : (_jsx("p", { className: "text-white/90 text-sm mt-3", children: "You can install this app from your browser's address bar." })) }))] }), _jsx("button", { onClick: handleDismiss, className: "text-white/70 hover:text-white ml-2", children: _jsx(X, { size: 20 }) })] }) }));
}
