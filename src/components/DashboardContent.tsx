"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Globe, Activity, ArrowUpRight, Zap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import NodeDisplay from "@/components/NodeDisplay";
import { formatBytes } from "@/utils/unitHelper";
import { useLiveData } from "@/contexts/LiveDataContext";
import { useNodeList } from "@/contexts/NodeListContext";
import { usePublicInfo } from "@/contexts/PublicInfoContext";
import { useTheme, type CardLayout } from "@/contexts/ThemeContext";
import Loading from "@/components/loading";
import { CurrentTimeCard } from "@/components/CurrentTimeCard";
import { Callouts } from "@/components/DashboardCallouts";
import { NodeMapView } from "@/components/NodeMapView";
import { useStatusCardsVisibility } from "@/hooks/useStatusCardsVisibility";
import { useEarthGlobeOpen } from "@/components/earth/earthGlobeOpenState";

const MemoNodeMapView = React.memo(NodeMapView);
const MemoNodeDisplay = React.memo(NodeDisplay);

function useStableValueWhile<T>(paused: boolean, value: T) {
  const stableValueRef = useRef(value);

  if (!paused) {
    stableValueRef.current = value;
  }

  return paused ? stableValueRef.current : value;
}

// Intelligent speed formatting function
const formatSpeed = (bytes: number): string => {
  if (bytes === 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  // Adaptive decimal places
  let decimals = 2;
  if (i >= 3) decimals = 1; // GB and above: 1 decimal
  if (i <= 1) decimals = 0; // B and KB: no decimals
  if (size >= 100) decimals = 0; // 100+ of any unit: no decimals

  return `${size.toFixed(decimals)} ${units[i]}`;
};

function DashboardGauge({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="ds-mini-gauge">
      <div className="ds-mini-gauge-arc">
        <div className="ds-mini-gauge-fill" style={{ ["--pct" as string]: `${pct}%` }} />
        <div className="ds-mini-gauge-center">
          <div className="ds-mini-gauge-value">{Math.round(value)}</div>
          {label ? <div className="ds-mini-gauge-label">{label}</div> : null}
        </div>
      </div>
    </div>
  );
}

const getDashboardSpeedGaugeMetric = (bytes: number) => {
  const text = formatSpeed(bytes);
  const match = text.match(/^([\d.]+)\s*(.+)$/);

  if (!match) {
    return {
      value: 0,
      unit: "B",
    };
  }

  return {
    value: Number(match[1]) || 0,
    unit: match[2].replace("/s", ""),
  };
};

const SpeedStatusValue = ({
  up,
  down,
  upBytes,
  downBytes,
}: {
  up: string;
  down: string;
  upBytes: number;
  downBytes: number;
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-base font-bold">
        <span className="text-green-400">↑</span>
        <span className="text-white">{up}/s</span>
      </div>
      <div className="flex items-center gap-1.5 text-base font-bold">
        <span className="text-blue-400">↓</span>
        <span className="text-white">{down}/s</span>
      </div>
    </div>
  );
};

const renderSpeedStatusValue = ({
  up,
  down,
}: {
  up: number;
  down: number;
}) => (
  <SpeedStatusValue
    up={formatSpeed(up)}
    down={formatSpeed(down)}
    upBytes={up}
    downBytes={down}
  />
);

export default function DashboardContent() {
  const [t] = useTranslation();
  const isEarthGlobeOpen = useEarthGlobeOpen();
  const { live_data } = useLiveData();
  const { publicInfo } = usePublicInfo();
  const { themeConfig } = useTheme();
  
  // Sync document title with backend-set custom title
  useEffect(() => {
    if (publicInfo?.sitename) {
      document.title = publicInfo.sitename;
    }
  }, [publicInfo?.sitename]);
  
  //#region 节点数据
  const { nodeList, isLoading, error, refresh } = useNodeList();
  const displayedLiveData = useStableValueWhile(isEarthGlobeOpen, live_data);
  const displayedNodeList = useStableValueWhile(isEarthGlobeOpen, nodeList);

  const renderTrafficPair = (up: string, down: string) => {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-base font-bold">
          <span className="text-green-400">↑</span>
          <span className="text-white">{up}</span>
        </div>
        <div className="flex items-center gap-1.5 text-base font-bold">
          <span className="text-blue-400">↓</span>
          <span className="text-white">{down}</span>
        </div>
      </div>
    );
  };

  const [statusCardsVisibility] = useStatusCardsVisibility();

  // Status cards configuration
  const statusCards = [
    {
      key: "currentTime",
      title: t("current_time"),
      icon: <Clock className="h-4 w-4" />,
      renderValue: () => <CurrentTimeCard />,
      visible: statusCardsVisibility.currentTime,
    },
    {
      key: "currentOnline",
      title: t("current_online"),
      icon: <Activity className="h-4 w-4" />,
      getValue: () =>
        `${displayedLiveData?.data?.online.length ?? 0} / ${displayedNodeList?.length ?? 0}`,
      visible: statusCardsVisibility.currentOnline,
    },
    {
      key: "regionOverview",
      title: t("region_overview"),
      icon: <Globe className="h-4 w-4" />,
      getValue: () =>
        displayedNodeList
          ? Object.entries(
              displayedNodeList.reduce((acc, item) => {
                if (displayedLiveData?.data.online.includes(item.uuid)) {
                  acc[item.region] = (acc[item.region] || 0) + 1;
                }
                return acc;
              }, {} as Record<string, number>)
            ).length
          : 0,
      visible: statusCardsVisibility.regionOverview,
    },
    {
      key: "trafficOverview",
      title: t("traffic_overview"),
      icon: <ArrowUpRight className="h-4 w-4" />,
      renderValue: () => {
        const data = displayedLiveData?.data?.data;
        const online = displayedLiveData?.data?.online;
        if (!data || !online) return renderTrafficPair("0 B", "0 B");
        const onlineSet = new Set(online);
        const values = Object.entries(data)
          .filter(([uuid]) => onlineSet.has(uuid))
          .map(([, node]) => node);
        const up = values.reduce(
          (acc, node) => acc + (node.network.totalUp || 0),
          0
        );
        const down = values.reduce(
          (acc, node) => acc + (node.network.totalDown || 0),
          0
        );
        return renderTrafficPair(formatBytes(up), formatBytes(down));
      },
      visible: statusCardsVisibility.trafficOverview,
    },
    {
      key: "networkSpeed",
      title: t("network_speed"),
      icon: <Zap className="h-4 w-4" />,
      renderValue: () => {
        const data = displayedLiveData?.data?.data;
        const online = displayedLiveData?.data?.online;
        if (!data || !online) {
          return renderSpeedStatusValue({ up: 0, down: 0 });
        }
        const onlineSet = new Set(online);
        const values = Object.entries(data)
          .filter(([uuid]) => onlineSet.has(uuid))
          .map(([, node]) => node);
        const up = values.reduce(
          (acc, node) => acc + (node.network.up || 0),
          0
        );
        const down = values.reduce(
          (acc, node) => acc + (node.network.down || 0),
          0
        );
        return renderSpeedStatusValue({ up, down });
      },
      visible: statusCardsVisibility.networkSpeed,
    },
  ];

  useEffect(() => {
    if (isEarthGlobeOpen) return undefined;

    const interval = setInterval(() => {
      refresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [isEarthGlobeOpen, refresh]);

  if (isLoading) {
    return <Loading />;
  }
  if (error) {
    return <div>{t("common.error", { defaultValue: "Error" })}: {error}</div>;
  }
  //#endregion

  return (
    <div className="container mx-auto px-4 space-y-4">
      <Callouts />

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-2xl font-bold tracking-tight">{t("common.dashboard", { defaultValue: "Dashboard" })}</h2>
        </div>

        <div className={`grid ${
          themeConfig.cardLayout === 'classic' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4' :
          themeConfig.cardLayout === 'modern' ? 'grid-cols-1 gap-3 md:grid-cols-2 md:auto-rows-[96px] xl:grid-cols-3' :
          themeConfig.cardLayout === 'minimal' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3' :
          themeConfig.cardLayout === 'detailed' ? 'grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4' :
          themeConfig.cardLayout === 'compact' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4' :
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4'
        }`}>
          {statusCards
            .filter((card) => card.visible)
            .map((card) => (
              <TopCard
                key={card.key}
                title={card.title}
                value={card.renderValue ? card.renderValue() : card.getValue?.()}
                icon={card.icon}
                layout={themeConfig.cardLayout}
                structuredValue={card.structuredValue}
              />
            ))}
        </div>

        {statusCardsVisibility.mapView && (
          <MemoNodeMapView
            nodes={displayedNodeList ?? []}
            liveData={displayedLiveData?.data ?? { online: [], data: {} }}
            mapOnly
          />
        )}
      </div>

      <Suspense fallback={<div className="p-4">{t("nodes.loading", { defaultValue: "Loading nodes..." })}</div>}>
        <MemoNodeDisplay
          nodes={displayedNodeList ?? []}
          liveData={displayedLiveData?.data ?? { online: [], data: {} }}
        />
      </Suspense>
    </div>
  );
}

type TopCardProps = {
  title: string;
  value: string | number | React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  layout?: CardLayout;
  structuredValue?: boolean;
};

const TopCard: React.FC<TopCardProps> = ({
  title,
  value,
  description,
  icon,
  layout = 'classic',
  structuredValue = false,
}) => {
  // Universal modern design - works for all layouts
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.07] to-white/[0.02] backdrop-blur-xl transition-all duration-500 hover:border-white/[0.15] hover:shadow-[0_8px_32px_rgba(94,109,255,0.15)] hover:scale-[1.02]">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Glow effect on hover */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-5">
        {/* Header with icon and title */}
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-lg shadow-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:shadow-primary/20">
            {icon}
          </div>
          <span className="text-sm font-bold uppercase tracking-wider text-white/50 transition-colors duration-300 group-hover:text-primary/80">
            {title}
          </span>
        </div>

        {/* Value display */}
        <div className={structuredValue ? "min-w-0" : "text-3xl font-black tracking-tight text-white transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]"}>
          {value}
        </div>

        {description && (
          <p className="mt-2 text-xs text-white/40">
            {description}
          </p>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-primary via-primary/50 to-transparent transition-all duration-500 group-hover:w-full" />
    </div>
  );
};
