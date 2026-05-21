import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { TrendingUp, ArrowUp, ArrowDown, Activity, ArrowUpRight } from "lucide-react";
import type { TFunction } from "i18next";

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type { NodeBasicInfo } from "@/contexts/NodeListContext";
import type { LiveData, Record } from "../types/LiveData";
import { useIsMobile } from "@/hooks/use-mobile";
import { getOSImage, getOSName } from "@/utils";
import { formatBytes } from "@/utils/unitHelper";
import { useTheme } from "@/contexts/ThemeContext";
import { type PingHistoryPoint, type PingStats, usePingStats } from "@/hooks/usePingStats";

import Flag from "./Flag";
import PriceTags from "./PriceTags";
import AdaptiveChart from "./AdaptiveChart";
import CircleChart from "./CircleChart";
import MiniPingChartFloat from "./MiniPingChartFloat";
import Tips from "./ui/tips";

// --- Helper Functions ---

/** Format seconds into readable uptime */
export function formatUptime(seconds: number, t: TFunction): string {
  if (!seconds || seconds < 0) return t("nodeCard.time_second", { val: 0 });
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d} ${t("nodeCard.time_day")}`);
  if (h) parts.push(`${h} ${t("nodeCard.time_hour")}`);
  if (m) parts.push(`${m} ${t("nodeCard.time_minute")}`);
  if (s || parts.length === 0) parts.push(`${s} ${t("nodeCard.time_second")}`);
  return parts.join(" ");
}

/** Compact uptime formatter: 72d 5h 25m 30s */
function formatUptimeCompact(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

export function getTrafficPercentage(totalUp: number, totalDown: number, limit: number, type: "max" | "min" | "sum" | "up" | "down") {
  if (limit === 0) return 0;
  switch (type) {
    case "max":
      return Math.max(totalUp, totalDown) / limit * 100;
    case "min":
      return Math.min(totalUp, totalDown) / limit * 100;
    case "sum":
      return (totalUp + totalDown) / limit * 100;
    case "up":
      return totalUp / limit * 100;
    case "down":
      return totalDown / limit * 100;
    default:
      return 0;
  }
}

export function getTrafficUsed(totalUp: number, totalDown: number, type: "max" | "min" | "sum" | "up" | "down") {
  switch (type) {
    case "max":
      return Math.max(totalUp, totalDown);
    case "min":
      return Math.min(totalUp, totalDown);
    case "sum":
      return totalUp + totalDown;
    case "up":
      return totalUp;
    case "down":
      return totalDown;
    default:
      return 0;
  }
}

export function formatTrafficPercentage(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  if (value >= 100) return `${value.toFixed(1)}%`;
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  if (value >= 0.01) return `${value.toFixed(3)}%`;
  return "<0.01%";
}

type QualityTone = "good" | "warn" | "bad";

const qualityToneStyles: {
  [tone in QualityTone]: { bar: string };
} = {
  good: {
    bar: "bg-emerald-500",
  },
  warn: {
    bar: "bg-amber-500",
  },
  bad: {
    bar: "bg-rose-500",
  },
};

function getLatencyTone(latency: number): QualityTone {
  if (latency <= 80) return "good";
  if (latency <= 180) return "warn";
  return "bad";
}

function getLossTone(loss: number): QualityTone {
  if (loss <= 1) return "good";
  if (loss <= 5) return "warn";
  return "bad";
}

function formatHistoryTime(time: string) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString([], {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PingHistoryStrip({
  label,
  value,
  points,
  metric,
}: {
  label: string;
  value: string;
  points: PingHistoryPoint[];
  metric: "latency" | "loss";
}) {
  return (
    <div className="min-w-0 rounded-md border border-border/45 bg-background/45 px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-mono font-semibold text-foreground/80">{value}</span>
      </div>
      <div
        className="grid h-5 gap-0.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))` }}
      >
        {points.map((point, index) => {
          const metricValue = point[metric];
          const tone =
            metricValue === null
              ? null
              : metric === "latency"
                ? getLatencyTone(metricValue)
                : getLossTone(metricValue);
          const blockClassName = tone
            ? qualityToneStyles[tone].bar
            : "bg-muted-foreground/18";
          const titleValue =
            metricValue === null
              ? "No data"
              : metric === "latency"
                ? `${Math.round(metricValue)} ms`
                : `${metricValue.toFixed(1)}%`;

          return (
            <span
              key={`${point.time}-${index}`}
              className={`min-w-0 rounded-[2px] ${blockClassName}`}
              title={`${formatHistoryTime(point.time)} ${titleValue}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PingQualityBars({ pingStats, t }: { pingStats: PingStats; t: TFunction }) {
  if (!pingStats.hasData) {
    return (
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
        <span className="text-xs text-muted-foreground/70 italic">{t("nodeCard.noPingData")}</span>
      </div>
    );
  }

  const historyPoints = pingStats.history.length > 0
    ? pingStats.history
    : [{ time: new Date().toISOString(), latency: null, loss: null }];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {pingStats.avgVolatility.toFixed(1)} {t("chart.volatility")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <PingHistoryStrip
          label={t("nodeCard.latency", { defaultValue: "Latency" })}
          value={`${Math.round(pingStats.avgLatency)} ms`}
          points={historyPoints}
          metric="latency"
        />
        <PingHistoryStrip
          label={t("chart.lossRate", { defaultValue: "Loss" })}
          value={`${pingStats.avgLoss.toFixed(1)}%`}
          points={historyPoints}
          metric="loss"
        />
      </div>
    </div>
  );
}

const COMPACT_PING_BAR_COUNT = 24;

function compactLatencyClass(latency: number | null) {
  if (latency === null) return "bg-[#252b39]";
  if (latency <= 80) return "bg-[#00b875]";
  if (latency <= 180) return "bg-[#f3a000]";
  return "bg-[#e64b73]";
}

function compactLossClass(loss: number | null) {
  if (loss === null) return "bg-[#252b39]";
  if (loss <= 1) return "bg-[#00b875]";
  if (loss <= 5) return "bg-[#f3a000]";
  return "bg-[#e64b73]";
}

function getNearestMetricValue(
  history: PingHistoryPoint[],
  index: number,
  metric: "latency" | "loss",
): number | null {
  const direct = history[index]?.[metric];
  if (typeof direct === "number") return direct;

  for (let offset = 1; offset < history.length; offset++) {
    const left = history[index - offset]?.[metric];
    if (typeof left === "number") return left;

    const right = history[index + offset]?.[metric];
    if (typeof right === "number") return right;
  }

  return null;
}

function compactMetricBars(history: PingHistoryPoint[], metric: "latency" | "loss") {
  const source = history.slice(-COMPACT_PING_BAR_COUNT);

  if (source.length === 0) {
    return Array.from({ length: COMPACT_PING_BAR_COUNT }, (_, index) => ({
      key: `empty-${metric}-${index}`,
      value: null,
      time: "",
    }));
  }

  return Array.from({ length: COMPACT_PING_BAR_COUNT }, (_, index) => {
    const sourceIndex =
      source.length === COMPACT_PING_BAR_COUNT
        ? index
        : Math.round((index / Math.max(COMPACT_PING_BAR_COUNT - 1, 1)) * (source.length - 1));
    const point = source[sourceIndex];

    return {
      key: `${metric}-${point?.time ?? "point"}-${index}`,
      value: getNearestMetricValue(source, sourceIndex, metric),
      time: point?.time ?? "",
    };
  });
}

function CompactMetricBarStrip({
  label,
  value,
  valueClassName,
  points,
  metric,
  t,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  points: ReturnType<typeof compactMetricBars>;
  metric: "latency" | "loss";
  t: TFunction;
}) {
  return (
    <div className="min-w-0 rounded-[6px] border border-[#222b3a]/85 bg-[#0d1320]/80 px-2 py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] leading-none">
        <span className="truncate text-[#8f98ac]">{label}</span>
        <span className={cn("shrink-0 font-mono font-semibold text-[#cfd6e6]", valueClassName)}>
          {value}
        </span>
      </div>
      <div
        className="grid h-[16px] gap-0.5 overflow-hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(points.length, 1)}, minmax(0, 1fr))` }}
      >
        {points.map((point) => (
          <span
            key={point.key}
            className={cn(
              "min-w-0 rounded-[2px]",
              metric === "latency"
                ? compactLatencyClass(point.value)
                : compactLossClass(point.value)
            )}
            title={
              point.value === null
                ? t("nodeCard.noPingData")
                : metric === "latency"
                  ? `${Math.round(point.value)} ms`
                  : `${point.value.toFixed(1)}%`
            }
          />
        ))}
      </div>
    </div>
  );
}

function CompactPingTimeline({ pingStats, t }: { pingStats: PingStats; t: TFunction }) {
  if (!pingStats.hasData) {
    return (
      <div className="flex h-[62px] items-center justify-between text-[12px] select-none">
        <span className="font-medium text-[#8f98ac]">Ping Stats (24h)</span>
        <span className="text-[12px] italic text-[#848da3]">{t("nodeCard.noPingData")}</span>
      </div>
    );
  }

  const latencyBars = compactMetricBars(pingStats.history, "latency");
  const lossBars = compactMetricBars(pingStats.history, "loss");

  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between gap-2 text-[12px] leading-none">
        <span className="font-medium text-[#8f98ac]">Ping Stats (24h)</span>
        <span className="shrink-0 font-mono text-[10px] font-semibold text-[#9aa3b7]">
          {pingStats.avgVolatility.toFixed(1)} Vol
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <CompactMetricBarStrip
          label="Latency"
          value={`${Math.round(pingStats.avgLatency)} ms`}
          points={latencyBars}
          metric="latency"
          t={t}
        />
        <CompactMetricBarStrip
          label="Loss"
          value={`${pingStats.avgLoss.toFixed(1)}%`}
          valueClassName={cn(
            pingStats.avgLoss > 5
              ? "text-[#e65a7a]"
              : pingStats.avgLoss > 1
                ? "text-[#e7a23a]"
                : "text-[#cfd6e6]"
          )}
          points={lossBars}
          metric="loss"
          t={t}
        />
      </div>
    </div>
  );
}

// --- Components ---

interface NodeProps {
  basic: NodeBasicInfo;
  live: Record | undefined;
  online: boolean;
}

const Node = ({ basic, live, online }: NodeProps) => {
  const [t] = useTranslation();
  const isMobile = useIsMobile();
  const { themeConfig } = useTheme();
  const pingStats = usePingStats(basic.uuid, 24);

  const defaultLive = {
    cpu: { usage: 0 },
    ram: { used: 0 },
    disk: { used: 0 },
    network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
    uptime: 0,
  } as Record;

  const liveData = live || defaultLive;

  // Calculate percentages
  const memoryUsagePercent = basic.mem_total
    ? (liveData.ram.used / basic.mem_total) * 100
    : 0;
  const diskUsagePercent = basic.disk_total
    ? (liveData.disk.used / basic.disk_total) * 100
    : 0;

  // Format network data
  const uploadSpeed = formatBytes(liveData.network.up);
  const downloadSpeed = formatBytes(liveData.network.down);
  const totalUpload = formatBytes(liveData.network.totalUp);
  const totalDownload = formatBytes(liveData.network.totalDown);
  const trafficLimitType = basic.traffic_limit_type ?? "sum";
  const trafficUsed = getTrafficUsed(
    liveData.network.totalUp,
    liveData.network.totalDown,
    trafficLimitType
  );
  const trafficPercentage = getTrafficPercentage(
    liveData.network.totalUp,
    liveData.network.totalDown,
    basic.traffic_limit,
    trafficLimitType
  );

  // Layout-specific styles
  const cardStyles = {
    classic: "w-full transition-all duration-200 hover:shadow-lg hover:border-primary/50 overflow-hidden group border",
    modern: "w-full transition-all duration-200 hover:shadow-lg overflow-hidden group border-none bg-gradient-to-br from-card to-card/50 shadow-sm",
    minimal: "w-full transition-all duration-200 hover:shadow-md overflow-hidden group bg-gradient-to-br from-muted/40 to-muted/20 rounded-xl border border-border/50",
    detailed: "w-full transition-all duration-200 hover:shadow-xl overflow-hidden group border-2 shadow-md hover:border-primary/30",
    compact: "w-full bg-[#0c101d] border border-[#1e293b]/60 hover:border-primary/50 transition-all duration-300 overflow-hidden group rounded-[14px] shadow-lg shadow-black/25",
  };

  const headerStyles = {
    classic: "pb-2 pt-4 px-4 space-y-0",
    modern: "pb-3 pt-3 px-4 space-y-0 bg-primary/5 border-b border-primary/10",
    minimal: "pb-2 pt-4 px-4 space-y-0",
    detailed: "pb-3 pt-5 px-5 space-y-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b-2",
    compact: "pb-2 pt-4 px-4 space-y-0",
  };

  const contentStyles = {
    classic: "p-4 pt-4",
    modern: "p-4 pt-4 bg-gradient-to-b from-background/50 to-transparent",
    minimal: "p-4 pt-3",
    detailed: "p-5 pt-4 bg-gradient-to-b from-background to-muted/10",
    compact: "px-4 pb-4 pt-2",
  };

  const footerStyles = {
    classic: "pb-3 pt-0 px-4 flex justify-between items-center",
    modern: "pb-3 pt-0 px-4 flex justify-between items-center bg-muted/20 border-t",
    minimal: "pb-3 pt-0 px-4 flex justify-between items-center",
    detailed: "pb-4 pt-0 px-5 flex justify-between items-center bg-muted/30 border-t-2",
    compact: "px-4 pb-4 pt-0.5 flex justify-between items-center",
  };

  if ((themeConfig.cardLayout as string) === 'compact') {
    return (
      <div
        id={basic.uuid}
        className="group relative flex min-h-[404px] w-full overflow-hidden rounded-[14px] border border-[#273044] bg-[linear-gradient(180deg,rgba(17,22,34,0.98),rgba(12,16,28,0.99))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_32px_rgba(0,0,0,0.34)] transition-all duration-300 hover:border-[#5e6dff]/45"
      >
        {/* Offline overlay with red dot and text */}
        {!online && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.05) 15px, rgba(255,255,255,0.05) 30px)'
              }}
            />
            <div className="relative z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-md">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-semibold text-sm tracking-wide">
                {t("nodeCard.offline")}
              </span>
            </div>
          </div>
        )}
        <div className="relative flex min-h-0 w-full flex-col">
          {/* Header */}
          <div className="flex min-h-[56px] justify-between items-center">
            <div className="flex flex-1 min-w-0 items-center gap-3 overflow-hidden">
              <div className="flex-shrink-0">
                <Flag flag={basic.region} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex flex-row min-w-0 items-center gap-1.5">
                  <Link
                    href={`/instance/${basic.uuid}`}
                    className="group-hover:text-primary transition-colors overflow-hidden flex-1 min-w-0"
                  >
                    <h3 className="font-bold truncate tracking-tight text-base">
                      {basic.name}
                    </h3>
                  </Link>
                  {live?.message && <Tips color="#CE282E">{live.message}</Tips>}
                  <MiniPingChartFloat
                    uuid={basic.uuid}
                    hours={24}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-primary flex-shrink-0"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                </div>
                <div className="flex items-center text-[11px] text-muted-foreground/80 gap-2 mt-0.5">
                  <span className="flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 rounded">
                    <img src={getOSImage(basic.os)} alt={basic.os} className="w-3 h-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">{getOSName(basic.os)}</span>
                  </span>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      online ? "bg-green-500" : "bg-red-500"
                    )}
                    title={online ? t("nodeCard.online") : t("nodeCard.offline")}
                  />
                  <span className="flex-1" />
                  <span className="opacity-40">•</span>
                  <span className="whitespace-nowrap font-mono">{formatUptimeCompact(liveData.uptime)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="-mx-4 mt-3 h-px bg-[#273044]/80" />
          <div className="h-4" />

          {/* Resources Grid */}
          <div className="grid grid-cols-3 items-start justify-items-center gap-3">
            <CircleChart
              value={liveData.cpu.usage}
              label="CPU"
              subLabel={`${liveData.cpu.usage.toFixed(1)}%`}
              compact
              size={76}
            />
            <CircleChart
              value={memoryUsagePercent}
              label="RAM"
              subLabel={formatBytes(liveData.ram.used)}
              compact
              size={76}
            />
            <CircleChart
              value={diskUsagePercent}
              label="Disk"
              subLabel={formatBytes(liveData.disk.used)}
              compact
              size={76}
            />
          </div>

          <div className="h-4" />

          {/* Network speeds and traffic */}
          <div className="space-y-2.5 text-[13px] select-none">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 font-semibold text-[#a6aec1]">
                <Activity className="h-3.5 w-3.5 text-[#8a93a8]" />
                Net
              </span>
              <div className="flex min-w-0 items-center gap-4 font-mono text-[12px] font-extrabold tabular-nums">
                <span className="whitespace-nowrap text-[#00df7c]">
                  ↑ {uploadSpeed}/s
                </span>
                <span className="whitespace-nowrap text-[#5ca9ff]">
                  ↓ {downloadSpeed}/s
                </span>
              </div>
            </div>
            <div className="flex min-w-0 items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 font-semibold text-[#a6aec1]">
                <Activity className="h-3.5 w-3.5 text-[#8a93a8]" />
                Traffic
              </span>
              <div className="flex min-w-0 items-center gap-4 font-mono text-[12px] font-semibold text-[#aeb6c9] tabular-nums">
                <span className="whitespace-nowrap">↑ {totalUpload}</span>
                <span className="whitespace-nowrap">↓ {totalDownload}</span>
              </div>
            </div>
          </div>

          <div className="h-4" />

          {/* Ping/Loss stats & quality bars */}
          <CompactPingTimeline pingStats={pingStats} t={t} />

          {basic.traffic_limit > 0 && (
            <div className="mt-2.5 space-y-1.5 select-none">
              <div className="flex items-center justify-between gap-2 text-[11px] leading-none text-[#9aa3b7]">
                <span className="font-medium tracking-tight">{trafficLimitType.toUpperCase()} Limit</span>
                <span className="shrink-0 font-mono font-semibold text-[#aeb6c9]">
                  {formatBytes(trafficUsed)} / {formatBytes(basic.traffic_limit)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#202838]/85">
                <div
                  className={cn(
                    "h-full rounded-full",
                    trafficPercentage >= 90
                      ? "bg-[#d95473]/80"
                      : trafficPercentage >= 75
                        ? "bg-[#d59a25]/80"
                        : "bg-[#6572ff]/75"
                  )}
                  style={{ width: `${Math.min(trafficPercentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-end font-mono text-[10px] font-semibold leading-none text-[#9aa3b7]">
                <span>{formatTrafficPercentage(trafficPercentage)}</span>
              </div>
            </div>
          )}

          <div className="mt-auto pt-2.5">
            <div className="pt-3">
              {(basic.price || basic.ipv4 || basic.ipv6) && (
                <PriceTags
                  price={basic.price}
                  billing_cycle={basic.billing_cycle}
                  expired_at={basic.expired_at}
                  currency={basic.currency}
                  tags={basic.tags}
                  ip4={basic.ipv4}
                  ip6={basic.ipv6}
                  compact={true}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card
      id={basic.uuid}
      className={cn(cardStyles[themeConfig.cardLayout] || cardStyles.classic, "relative")}
    >
      {/* Offline overlay with red dot and text */}
      {!online && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div
            className="absolute inset-0 opacity-10 rounded-lg"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.05) 15px, rgba(255,255,255,0.05) 30px)'
            }}
          />
          <div className="relative z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-semibold text-sm tracking-wide">
              {t("nodeCard.offline")}
            </span>
          </div>
        </div>
      )}

      {/* Header: Identity & Status */}
      <CardHeader className={headerStyles[themeConfig.cardLayout] || headerStyles.classic}>
        {(themeConfig.cardLayout as string) === 'compact' ? (
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex-shrink-0 select-none">
                <Flag flag={basic.region} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center min-w-0">
                  <Link href={`/instance/${basic.uuid}`} className="hover:text-primary transition-colors overflow-hidden flex items-center gap-0.5 min-w-0">
                    <span className="font-bold text-white text-[13px] tracking-tight truncate">
                      {basic.name}
                    </span>
                    <ArrowUpRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  </Link>
                </div>
                <div className="flex items-center text-[10.5px] text-slate-400 gap-1.5 mt-0.5 font-medium select-none">
                  <img
                    src={getOSImage(basic.os)}
                    alt={basic.os}
                    className="w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span>{getOSName(basic.os)}</span>
                  <span className="text-slate-600">•</span>
                  <span>{formatUptimeCompact(liveData.uptime)}</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 ml-2">
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] leading-none border select-none",
                online
                  ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-950/20 text-rose-400 border-rose-500/20"
              )}>
                {online ? t("nodeCard.online") : t("nodeCard.offline")}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="flex flex-1 min-w-0 items-center gap-3 overflow-hidden">
              {/* Flag position changes based on layout */}
              {themeConfig.cardLayout !== 'detailed' && (
                <div className="flex-shrink-0">
                  <Flag flag={basic.region} />
                </div>
              )}
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex flex-row min-w-0 items-center gap-2">
                  <Link href={`/instance/${basic.uuid}`} className="group-hover:text-primary transition-colors overflow-hidden flex-1">
                    <h3 className={`font-bold truncate tracking-tight ${
                      themeConfig.cardLayout === 'detailed' ? 'text-lg' : 'text-base'
                    }`}>{basic.name}</h3>
                  </Link>
                  {live?.message && <Tips color="#CE282E">{live.message}</Tips>}
                  <MiniPingChartFloat
                    uuid={basic.uuid}
                    hours={24}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
                <div className="flex items-center text-[11px] text-muted-foreground/80 gap-2 mt-1">
                  <span className="flex items-center gap-1.5 bg-muted/50 px-1.5 py-0.5 rounded">
                    <img src={getOSImage(basic.os)} alt={basic.os} className="flex-shrink-0 w-3 h-3" />
                    <span className="whitespace-nowrap">{getOSName(basic.os)}</span>
                  </span>
                  {themeConfig.cardLayout === 'detailed' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded text-primary">
                      <Flag flag={basic.region} />
                    </span>
                  )}
                  <span className="opacity-40">•</span>
                  <span className="whitespace-nowrap font-mono">
                    {formatUptimeCompact(liveData.uptime)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              <Badge variant={online ? "default" : "destructive"} className={online ? "bg-green-600 hover:bg-green-700" : ""}>
                {online ? t("nodeCard.online") : t("nodeCard.offline")}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      {themeConfig.cardLayout !== 'minimal' && (themeConfig.cardLayout as string) !== 'compact' && <Separator className="opacity-50" />}

      {/* Main Content: Metrics */}
      <CardContent className={contentStyles[themeConfig.cardLayout] || contentStyles.classic}>
        {(themeConfig.cardLayout as string) === 'compact' ? (
          <div className="space-y-3.5">
            {/* Compact Metrics Row */}
            <div className="grid grid-cols-3 gap-2">
              <AdaptiveChart value={liveData.cpu.usage} label="CPU" subLabel={`${liveData.cpu.usage.toFixed(0)}%`} size={46} />
              <AdaptiveChart value={memoryUsagePercent} label="RAM" subLabel={formatBytes(liveData.ram.used)} size={46} />
              <AdaptiveChart value={diskUsagePercent} label="Disk" subLabel={formatBytes(liveData.disk.used)} size={46} />
            </div>

            {/* Network Speed & Traffic */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Net</span>
                <div className="flex gap-3 font-mono text-[11px] font-semibold select-none">
                  <span className="flex items-center text-emerald-400">
                    ↑ {uploadSpeed}/s
                  </span>
                  <span className="flex items-center text-blue-400">
                    ↓ {downloadSpeed}/s
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-500 font-medium">
                <span className="text-slate-400">Traffic</span>
                <div className="flex gap-3 font-mono text-[11px] select-none">
                  <span className="flex items-center">
                    ↑ {totalUpload}
                  </span>
                  <span className="flex items-center">
                    ↓ {totalDownload}
                  </span>
                </div>
              </div>
            </div>

            {/* Ping stats & Single Quality Strip */}
            {pingStats.hasData ? (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs select-none">
                  <div>
                    <span className="text-slate-400 font-medium">Ping</span>
                    <span className="font-mono text-white font-semibold ml-1">{Math.round(pingStats.avgLatency)} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Loss</span>
                    <span className={cn(
                      "font-mono font-semibold ml-1",
                      pingStats.avgLoss > 5 ? "text-rose-400" : pingStats.avgLoss > 1 ? "text-amber-400" : "text-slate-300"
                    )}>
                      {pingStats.avgLoss.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  className="grid h-2.5 gap-[1.5px] select-none"
                  style={{ gridTemplateColumns: `repeat(${pingStats.history.length || 28}, minmax(0, 1fr))` }}
                >
                  {(pingStats.history.length > 0 ? pingStats.history : Array.from({ length: 28 }, (_, i) => ({ time: new Date().toISOString(), latency: null, loss: null }))).map((point, index) => {
                    const latency = point.latency;

                    let barColor = "bg-[#1e293b]/70"; // default grey for no data
                    if (point.loss !== null || point.latency !== null) {
                      if (point.loss !== null && point.loss > 5) {
                        barColor = "bg-rose-500";
                      } else if (point.loss !== null && point.loss > 1) {
                        barColor = "bg-amber-500";
                      } else if (latency !== null) {
                        if (latency > 180) {
                          barColor = "bg-rose-500";
                        } else if (latency > 80) {
                          barColor = "bg-amber-500";
                        } else {
                          barColor = "bg-emerald-500";
                        }
                      } else {
                        barColor = "bg-emerald-500";
                      }
                    }

                    const titleValue =
                      point.latency === null
                        ? "No data"
                        : `${Math.round(point.latency)} ms, Loss: ${point.loss?.toFixed(1)}%`;

                    return (
                      <span
                        key={`${point.time}-${index}`}
                        className={cn("min-w-0 h-full rounded-[1px] transition-colors", barColor)}
                        title={titleValue}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center text-xs select-none">
                <span className="text-slate-400 font-medium">Ping</span>
                <span className="text-[10px] text-slate-500 italic">{t("nodeCard.noPingData")}</span>
              </div>
            )}

            {/* Traffic Limit (if configured) */}
            {basic.traffic_limit > 0 && (
              <div className="pt-0.5 select-none">
                <div className="flex justify-between text-[9px] mb-1 text-slate-400 font-medium">
                  <span>{trafficLimitType.toUpperCase()} Limit</span>
                  <span className="font-mono text-slate-300">{formatBytes(trafficUsed)} / {formatBytes(basic.traffic_limit)}</span>
                </div>
                <div className="h-1 w-full bg-[#1e293b]/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded-full"
                    style={{ width: `${Math.min(trafficPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Charts Grid - layout affects arrangement */}
            <div className={`grid mb-4 ${
              themeConfig.cardLayout === 'minimal' ? 'grid-cols-3 gap-3' :
              themeConfig.cardLayout === 'detailed' ? 'grid-cols-3 gap-4' :
              themeConfig.cardLayout === 'modern' ? 'grid-cols-3 gap-2' :
              'grid-cols-3 gap-2'
            }`}>
              <AdaptiveChart
                value={liveData.cpu.usage}
                label="CPU"
                subLabel={`${liveData.cpu.usage.toFixed(1)}%`}
              />
              <AdaptiveChart
                value={memoryUsagePercent}
                label="RAM"
                subLabel={formatBytes(liveData.ram.used)}
              />
              <AdaptiveChart
                value={diskUsagePercent}
                label="Disk"
                subLabel={formatBytes(liveData.disk.used)}
              />
            </div>

            {/* Network Stats */}
            <div className={`rounded-lg p-3 space-y-2 text-sm ${
              themeConfig.cardLayout === 'modern' ? 'bg-primary/5 border border-primary/10' :
              themeConfig.cardLayout === 'minimal' ? 'bg-background/50 border border-border/30' :
              themeConfig.cardLayout === 'detailed' ? 'bg-muted/40 border-2 border-muted' :
              'bg-muted/30'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> {t("nodeCard.networkSpeed")}
                </span>
                <div className="flex gap-3 font-mono text-xs">
                  <span className="flex items-center text-green-600 dark:text-green-400">
                    <ArrowUp className="h-3 w-3 mr-0.5" /> {uploadSpeed}/s
                  </span>
                  <span className="flex items-center text-blue-600 dark:text-blue-400">
                    <ArrowDown className="h-3 w-3 mr-0.5" /> {downloadSpeed}/s
                  </span>
                </div>
              </div>

              <Separator className="opacity-30" />

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  {t("nodeCard.totalTraffic")}
                </span>
                <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <ArrowUp className="h-3 w-3 mr-0.5" /> {totalUpload}
                  </span>
                  <span className="flex items-center">
                    <ArrowDown className="h-3 w-3 mr-0.5" /> {totalDownload}
                  </span>
                </div>
              </div>

              <Separator className="opacity-30" />

              {/* Ping Statistics */}
              {themeConfig.cardDesign === "quality-bars" ? (
                <PingQualityBars pingStats={pingStats} t={t} />
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t("nodeCard.pingStats")}</span>
                  {pingStats.hasData ? (
                    <div className="flex gap-3 font-mono text-xs text-muted-foreground">
                      <span>{pingStats.avgLoss.toFixed(1)}% {t("chart.lossRate")}</span>
                      <span>{pingStats.avgVolatility.toFixed(1)} {t("chart.volatility")}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/70 italic">{t("nodeCard.noPingData")}</span>
                  )}
                </div>
              )}

              {/* Traffic Limit Progress (if exists) */}
              {basic.traffic_limit > 0 && (
                <div className="mt-2 pt-1">
                  <div className="flex justify-between text-[10px] mb-1 text-muted-foreground">
                    <span>{trafficLimitType.toUpperCase()} Limit</span>
                    <span className="font-mono">
                      {formatBytes(trafficUsed)} / {formatBytes(basic.traffic_limit)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded-full"
                      style={{ width: `${Math.min(trafficPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-end text-[10px] font-mono text-muted-foreground">
                    <span>{formatTrafficPercentage(trafficPercentage)}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Footer: Price & Extra Info */}
      {(basic.price || basic.ipv4 || basic.ipv6) && (
        <CardFooter className={footerStyles[themeConfig.cardLayout] || footerStyles.classic}>
           <PriceTags
              hidden={false}
              price={basic.price}
              billing_cycle={basic.billing_cycle}
              expired_at={basic.expired_at}
              currency={basic.currency}
              tags={basic.tags}
              ip4={basic.ipv4}
              ip6={basic.ipv6}
              compact={(themeConfig.cardLayout as string) === 'compact'}
           />
        </CardFooter>
      )}
    </Card>
  );
};

export default Node;

// --- NodeGrid Component ---

type NodeGridProps = {
  nodes: NodeBasicInfo[];
  liveData: LiveData;
};

export const NodeGrid = ({ nodes, liveData }: NodeGridProps) => {
  const { themeConfig } = useTheme();
  // Ensure liveData is valid
  const onlineNodes = liveData && liveData.online ? liveData.online : [];

  // Sort nodes: Online first, then by weight
  const sortedNodes = [...nodes].sort((a, b) => {
    const aOnline = onlineNodes.includes(a.uuid);
    const bOnline = onlineNodes.includes(b.uuid);

    // If one is online and the other is offline, online comes first
    if (aOnline !== bOnline) {
      return aOnline ? -1 : 1;
    }

    // Otherwise sort by weight (ascending - though typical logic is often descending for weight, keeping original logic here: a.weight - b.weight)
    return a.weight - b.weight;
  });

  const isCompact = (themeConfig.cardLayout as string) === 'compact';

  return (
    <div
      className={`grid box-border w-full ${isCompact ? 'gap-4 py-3' : 'gap-6 py-4'}`}
      style={{
        gridTemplateColumns: isCompact
          ? "repeat(auto-fill, minmax(284px, 1fr))"
          : "repeat(auto-fill, minmax(320px, 1fr))",
      }}
    >
      {sortedNodes.map((node) => {
        const isOnline = onlineNodes.includes(node.uuid);
        const nodeData =
          liveData && liveData.data ? liveData.data[node.uuid] : undefined;

        return (
          <Node
            key={node.uuid}
            basic={node}
            live={nodeData}
            online={isOnline}
          />
        );
      })}
    </div>
  );
};
