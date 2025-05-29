import React, { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptProps {
  forceShow?: boolean;
}

export default function InstallPrompt({
  forceShow = false,
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

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

    // Fallback if beforeinstallprompt doesn't fire
    if (
      forceShow &&
      !isInstalled &&
      !localStorage.getItem("installPromptDismissed")
    ) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, [forceShow, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
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
  const isIOSSafari =
    isIOS && !(window as any).MSStream && !(window as any).chrome;

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-lg z-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Download size={20} className="text-white" />
            <h3 className="font-semibold text-white">Install BRUTE App</h3>
          </div>

          {isIOSSafari ? (
            <p className="text-white/90 text-sm">
              Tap the share button in Safari and select "Add to Home Screen" to
              install BRUTE
            </p>
          ) : (
            <p className="text-white/90 text-sm">
              Install BRUTE for faster access and a better experience
            </p>
          )}

          {!isIOSSafari && (
            <button
              onClick={handleInstallClick}
              className="mt-3 bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm"
            >
              Install Now
            </button>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="text-white/70 hover:text-white ml-2"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
