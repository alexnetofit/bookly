"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    if (standalone) return;

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if user dismissed the banner before
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // Show again after 7 days
    if (daysSinceDismissed < 7) return;

    // For iOS, show banner after a delay
    if (iOS) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Android/Desktop, listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("Service worker registration failed:", err);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", new Date().toISOString());
  };

  // Don't show if already installed or banner not ready
  if (isStandalone || !showBanner) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border rounded-2xl shadow-xl p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B7355] to-[#A08468] flex items-center justify-center text-white shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-foreground text-sm">
              Instale o Babel
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? "Toque em Compartilhar e depois em \"Adicionar à Tela Inicial\""
                : "Tenha acesso rápido direto da sua tela inicial"}
            </p>
          </div>
        </div>

        {!isIOS && deferredPrompt && (
          <Button
            onClick={handleInstall}
            className="w-full mt-3 bg-[#8B7355] hover:bg-[#7A6548] text-white"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Instalar App
          </Button>
        )}

        {isIOS && (
          <div className="mt-3 p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Toque em{" "}
              <span className="inline-flex items-center justify-center w-5 h-5 bg-primary/10 rounded text-primary text-xs font-medium">
                ⬆
              </span>{" "}
              e depois em <strong>&quot;Adicionar à Tela Inicial&quot;</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

