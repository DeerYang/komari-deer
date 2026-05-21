"use client";

import React from "react";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface CircleChartProps {
  value: number; // 0-100
  label: string;
  subLabel?: string;
  color?: string; // Optional override
  compact?: boolean; // Compact mode for table views
  size?: number; // Optional custom pixel size
  visualSize?: number; // Optional visual-only ring size for compact charts
}

export default function CircleChart({
  value,
  label,
  subLabel,
  color,
  compact = false,
  size,
  visualSize,
}: CircleChartProps) {
  const { themeConfig } = useTheme();

  // Clamp value
  const chartValue = Math.min(Math.max(value, 0), 100);

  // Get theme color based on selected color theme and value
  const getThemeColor = () => {
    if (color) return color; // Use override if provided

    const getColorForTheme = () => {
      switch (themeConfig.colorTheme) {
        case 'ocean':
          return chartValue >= 80 ? '#0284c7' : chartValue >= 60 ? '#06b6d4' : '#22d3ee';
        case 'sunset':
          return chartValue >= 80 ? '#ec4899' : chartValue >= 60 ? '#f97316' : '#fb923c';
        case 'forest':
          return chartValue >= 80 ? '#059669' : chartValue >= 60 ? '#10b981' : '#4ade80';
        case 'midnight':
          return chartValue >= 80 ? '#7c3aed' : chartValue >= 60 ? '#6366f1' : '#818cf8';
        case 'rose':
          return chartValue >= 80 ? '#e11d48' : chartValue >= 60 ? '#ec4899' : '#f472b6';
        default: // 'default'
          return chartValue >= 80 ? '#9333ea' : chartValue >= 60 ? '#3b82f6' : '#60a5fa';
      }
    };

    return getColorForTheme();
  };

  const fillColor = getThemeColor();

  if (compact && visualSize == null) {
    const chartSize = size ?? 58;
    const radius = 18.5;
    const strokeWidth = 4.4;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (chartValue / 100) * circumference;
    const compactFillColor =
      color ?? (chartValue >= 80 ? "#7c3aed" : chartValue >= 60 ? "#6366f1" : "#818cf8");

    return (
      <div className="flex flex-col items-center justify-center select-none">
        <div className="relative" style={{ width: chartSize, height: chartSize }}>
          <svg
            width={chartSize}
            height={chartSize}
            viewBox="0 0 50 50"
            className="h-full w-full -rotate-90 transform"
          >
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke="rgba(128, 128, 128, 0.1)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <circle
              cx="25"
              cy="25"
              r={radius}
              stroke={compactFillColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="font-extrabold leading-none tracking-tight"
              style={{ fontSize: "16px", color: "#f4f6ff" }}
            >
              {Math.round(chartValue)}%
            </span>
          </div>
        </div>

        <div className="mt-1 text-center">
          <span className="mt-1.5 block text-[12px] font-semibold tracking-tight text-[#aeb6c9]">
            {label}
          </span>
          {subLabel && (
            <span className="mt-0.5 block text-[11px] text-[#626b7e]">
              {subLabel}
            </span>
          )}
        </div>
      </div>
    );
  }

  const data = [
    {
      name: label,
      value: chartValue,
      fill: fillColor,
    },
  ];

  // Compact mode for table views
  if (compact) {
    const compactSize = size ?? 40;
    const compactVisualSize = visualSize ?? compactSize;
    const compactBarSize = visualSize ? 5 : 7;

    return (
      <div className="flex items-center justify-center">
        <div className="relative overflow-visible" style={{ height: compactSize, width: compactSize }}>
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              height: compactVisualSize,
              width: compactVisualSize,
              transform: "translate(-50%, -50%)",
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="65%"
                outerRadius="95%"
                barSize={compactBarSize}
                data={data}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background={{ fill: 'rgba(128, 128, 128, 0.1)' }}
                  dataKey="value"
                  cornerRadius={10}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          {/* Centered Percentage for compact mode */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] font-bold text-foreground">
              {Math.round(chartValue)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default mode with labels
  const chartSize = size ?? 90;

  return (
    <div className="flex flex-col items-center justify-center p-2">
      <div className="relative" style={{ height: chartSize, width: chartSize }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="95%"
            barSize={8}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: 'rgba(128, 128, 128, 0.1)' }}
              dataKey="value"
              cornerRadius={10}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Centered Percentage */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-foreground drop-shadow-sm tracking-tight">
            {Math.round(chartValue)}%
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center mt-2">
        <div className="text-xs font-semibold text-foreground/90">{label}</div>
        {subLabel && (
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subLabel}</div>
        )}
      </div>
    </div>
  );
}
