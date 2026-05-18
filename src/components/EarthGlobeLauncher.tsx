"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useNodeList } from "@/contexts/NodeListContext";
import { useTheme } from "@/contexts/ThemeContext";
import { buildEarthGlobeData, DEFAULT_EARTH_USER_GEO } from "@/components/earth/earthData";
import { setEarthGlobeOpenState } from "@/components/earth/earthGlobeOpenState";
import { useUserGeo } from "@/components/earth/useUserGeo";

const GlobeRenderer = dynamic(() => import("@/components/earth/GlobeRenderer"), {
  ssr: false,
  loading: () => <div className="deer-earth-loading">Loading globe...</div>,
});

const DARK_GLOBE_IMAGE = "/assets/earth/earth-night.jpg";
const LIGHT_GLOBE_IMAGE = "/assets/earth/earth-day.jpg";
const BUMP_IMAGE = "/assets/earth/earth-topology.png";
const MILKY_WAY_IMAGE = "/assets/earth/milky-way.jpg";
const THEME_COLOR = "#00d8ff";
const EARTH_TEXTURES = [DARK_GLOBE_IMAGE, LIGHT_GLOBE_IMAGE, BUMP_IMAGE, MILKY_WAY_IMAGE] as const;

function preloadEarthTexture(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  void img.decode().catch(() => undefined);
}

function preloadEarthGlobeRenderer() {
  void import("@/components/earth/GlobeRenderer");
  EARTH_TEXTURES.forEach(preloadEarthTexture);
}

function EarthIcon() {
  return (
    <svg className="deer-earth-launcher-icon" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="deer-earth-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="50%" stopColor="#0080ff" />
          <stop offset="100%" stopColor="#00ffff" />
        </linearGradient>
        <filter id="deer-earth-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#deer-earth-grad)" strokeWidth="2" filter="url(#deer-earth-glow)" opacity="0.8" />
      <circle cx="50" cy="50" r="40" fill="rgba(0,20,40,0.6)" stroke="url(#deer-earth-grad)" strokeWidth="1.5" />
      <g fill="rgba(0,255,255,0.15)" stroke="url(#deer-earth-grad)" strokeWidth="1.5" filter="url(#deer-earth-glow)">
        <path d="M20,30 Q25,25 30,28 L35,25 Q40,22 42,28 L40,35 Q35,40 30,38 L25,35 Z" />
        <path d="M30,50 Q35,48 38,52 L36,62 Q32,68 28,65 L26,55 Z" />
        <path d="M50,40 Q55,38 60,42 L58,55 Q52,62 48,58 L46,48 Z" />
        <path d="M60,25 Q70,22 78,28 L80,38 Q75,45 68,42 L62,35 Z" />
        <path d="M72,55 Q78,52 82,56 L80,62 Q75,65 72,60 Z" />
      </g>
      <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="url(#deer-earth-grad)" strokeWidth="0.5" opacity="0.4" />
      <line x1="50" y1="10" x2="50" y2="90" stroke="url(#deer-earth-grad)" strokeWidth="0.5" opacity="0.4" />
      <circle cx="50" cy="50" r="3" fill="#00ffff" filter="url(#deer-earth-glow)">
        <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="35" fill="none" stroke="url(#deer-earth-grad)" strokeWidth="0.8" strokeDasharray="4,8" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="20s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export default function EarthGlobeLauncher() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { nodeList } = useNodeList();
  const { appearance, themeConfig } = useTheme();
  const { geo } = useUserGeo();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const isHome = pathname === "/" || pathname === "";

  useEffect(() => {
    const syncTheme = () => {
      const classIsDark = document.documentElement.classList.contains("dark");
      const systemIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(appearance === "dark" || (appearance === "system" ? systemIsDark : classIsDark));
    };

    syncTheme();
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", syncTheme);
    return () => query.removeEventListener("change", syncTheme);
  }, [appearance, themeConfig.colorTheme]);

  useEffect(() => {
    if (!isHome && open) {
      setOpen(false);
      setClosing(false);
      setGlobeReady(false);
    }
  }, [isHome, open]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setEarthGlobeOpenState(open);
    return () => setEarthGlobeOpenState(false);
  }, [open]);

  useEffect(() => {
    if (!isHome) return undefined;
    const timer = window.setTimeout(preloadEarthGlobeRenderer, 1200);
    return () => window.clearTimeout(timer);
  }, [isHome]);

  const earthData = useMemo(
    () =>
      buildEarthGlobeData({
        nodes: nodeList ?? [],
        userGeo: geo,
      }),
    [geo, nodeList]
  );

  const bgConfig = useMemo(
    () => ({
      bg: "rgba(0, 0, 0, 0)",
      bgImage: isDark ? MILKY_WAY_IMAGE : null,
      globeImage: isDark ? DARK_GLOBE_IMAGE : LIGHT_GLOBE_IMAGE,
      bumpImage: BUMP_IMAGE,
      atmosphere: THEME_COLOR,
    }),
    [isDark]
  );

  const closeModal = useCallback(() => {
    setClosing(true);
  }, []);

  const handleAnimationEnd = useCallback(() => {
    if (!closing) return;
    setOpen(false);
    setClosing(false);
    setGlobeReady(false);
  }, [closing]);

  if (!isHome) return null;

  return (
    <>
      <button
        type="button"
        className={`deer-earth-launcher${open ? " is-hidden" : ""}`}
        title={t("common.map", { defaultValue: "Global Map" })}
        aria-label={t("common.map", { defaultValue: "Global Map" })}
        onClick={() => {
          setOpen(true);
          setGlobeReady(false);
        }}
      >
        <EarthIcon />
        <span className="deer-earth-particle-container" aria-hidden="true">
          <span className="deer-earth-particle" style={{ "--x": "0.1", "--y": "0.5" } as CSSProperties} />
          <span className="deer-earth-particle" style={{ "--x": "0.9", "--y": "0.5" } as CSSProperties} />
          <span className="deer-earth-particle" style={{ "--x": "0.5", "--y": "0.1" } as CSSProperties} />
          <span className="deer-earth-particle" style={{ "--x": "0.5", "--y": "0.9" } as CSSProperties} />
          <span className="deer-earth-particle" style={{ "--x": "0.2", "--y": "0.2" } as CSSProperties} />
          <span className="deer-earth-particle" style={{ "--x": "0.8", "--y": "0.8" } as CSSProperties} />
        </span>
        <span className="deer-earth-ripple-ring" aria-hidden="true" />
        <span className="deer-earth-pulse-ring" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className={`deer-earth-modal-overlay${closing ? " is-closing" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={t("mapView.title", { defaultValue: "Global Distribution" })}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
          onAnimationEnd={handleAnimationEnd}
        >
          <div className={`deer-earth-modal-content${closing ? " is-closing" : ""}`}>
            <div className="deer-earth-counter">
              <span>{t("mapView.stats.nodes", { defaultValue: "Nodes" })}</span>
              <strong>{earthData.totalCount}</strong>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="deer-earth-close"
              onClick={closeModal}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">{t("common.close", { defaultValue: "Close" })}</span>
            </Button>

            <div className={`deer-earth-render-area${globeReady ? " is-ready" : ""}`}>
              <GlobeRenderer
                pointsData={earthData.pointsData}
                arcsData={earthData.arcsData}
                bgConfig={bgConfig}
                themeColor={THEME_COLOR}
                userLat={geo.lat || DEFAULT_EARTH_USER_GEO.lat}
                userLng={geo.lng || DEFAULT_EARTH_USER_GEO.lng}
                logoUrl="/assets/logo.png"
                logoShape="circle"
                onReady={() => window.setTimeout(() => setGlobeReady(true), 120)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
