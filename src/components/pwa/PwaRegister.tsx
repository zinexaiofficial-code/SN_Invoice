"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("SN Invoice PWA ServiceWorker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.log("ServiceWorker registration error:", err);
          });
      });
    }
  }, []);

  return null;
}

