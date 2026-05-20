"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface CircleChartProps {
  value: number; // 0-100
  label: string;
  subLabel?: string;
  color?: string; // Optional override
  compact?: boolean; // Compact mode
  size?: number; // Custom pixel size
}

export default function CircleChart({
  value,
  label,
  subLabel,
  color,
  compact = false,
  size,
}: CircleChartProps) {
  const { themeConfig } = useTheme();

  const chartValue = Math.min(Math.max(value, 0), 100);
  const chartSize = size ?? (compact ? 58 : 80);

  // Outer ring parameters
  const radius = compact ? 18.5 : 20;
  const strokeWidth = compact ? 4.4 : 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (chartValue / 100) * circumference;

  // Match komari-next's original value-tiered theme color mapping.
  const getThemeColor = () => {
    if (color) return color;
    switch (themeConfig.colorTheme) {
      case "ocean":
        return chartValue >= 80 ? "#0284c7" : chartValue >= 60 ? "#06b6d4" : "#22d3ee";
      case "sunset":
        return chartValue >= 80 ? "#ec4899" : chartValue >= 60 ? "#f97316" : "#fb923c";
      case "forest":
        return chartValue >= 80 ? "#059669" : chartValue >= 60 ? "#10b981" : "#4ade80";
      case "midnight":
        return chartValue >= 80 ? "#7c3aed" : chartValue >= 60 ? "#6366f1" : "#818cf8";
      case "rose":
        return chartValue >= 80 ? "#e11d48" : chartValue >= 60 ? "#ec4899" : "#f472b6";
      default:
        return chartValue >= 80 ? "#9333ea" : chartValue >= 60 ? "#3b82f6" : "#60a5fa";
    }
  };

  const fillColor = getThemeColor();

  return (
    <div className="flex flex-col items-center justify-center select-none">
      {/* SVG Circular Ring */}
      <div className="relative" style={{ width: chartSize, height: chartSize }}>
        <svg
          width={chartSize}
          height={chartSize}
          viewBox="0 0 50 50"
          className="transform -rotate-90 w-full h-full"
        >
          {/* Background circle path */}
          <circle
            cx="25"
            cy="25"
            r={radius}
            stroke="rgba(128, 128, 128, 0.1)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Active progress circle path */}
          <circle
            cx="25"
            cy="25"
            r={radius}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="font-extrabold leading-none tracking-tight"
            style={{
              fontSize: compact ? "16px" : "15px",
              color: compact ? "#f4f6ff" : undefined,
            }}
          >
            {Math.round(chartValue)}%
          </span>
        </div>
      </div>

      {/* Label under the circle */}
      <div className="text-center mt-1">
        <span
          className={cn(
            "font-semibold block tracking-tight",
            compact ? "text-[#aeb6c9] text-[12px] mt-1.5" : "text-slate-400 text-xs mt-1"
          )}
        >
          {label}
        </span>
        {subLabel && (
          <span
            className={cn(
              "block mt-0.5",
              compact ? "text-[11px] text-[#626b7e]" : "text-[10px] text-muted-foreground/60"
            )}
          >
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}
