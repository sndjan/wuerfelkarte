"use client";

import { Maximize, Minimize } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export function FullscreenToggle() {
  const [supported, setSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setSupported(
      typeof document !== "undefined" &&
        document.fullscreenEnabled === true &&
        typeof document.documentElement.requestFullscreen === "function",
    );

    const onChange = () => setIsFullscreen(document.fullscreenElement !== null);
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={isFullscreen ? "Vollbild beenden" : "Vollbild aktivieren"}
      onClick={toggle}
      className="rounded-full bg-white"
    >
      {isFullscreen ? <Minimize /> : <Maximize />}
    </Button>
  );
}
