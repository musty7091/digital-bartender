import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Ana ekrana ekle" davranışını yönetir. Tarayıcı install prompt'unu
 * yakalayıp elimizde tutar, kullanıcı istediğinde tetikleriz.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(
    () =>
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari standalone flag
      (navigator as Navigator & { standalone?: boolean }).standalone === true
  );

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return {
    canInstall: !isInstalled && deferredPrompt !== null,
    promptInstall,
    dismiss: () => setDeferredPrompt(null),
  };
}

/**
 * Service worker kaydını yapar; yeni sürüm ya da offline-hazır
 * durumlarını dışarıya bildirir.
 */
export function usePwaUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(
    null
  );

  useEffect(() => {
    updateSWRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
      },
    });
  }, []);

  return {
    needRefresh,
    offlineReady,
    applyUpdate: () => updateSWRef.current?.(true),
    dismissOfflineReady: () => setOfflineReady(false),
  };
}
