import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const launcherSource = readFileSync(
  new URL("../src/components/EarthGlobeLauncher.tsx", import.meta.url),
  "utf8"
);

const dashboardSource = readFileSync(
  new URL("../src/components/DashboardContent.tsx", import.meta.url),
  "utf8"
);

const liveDataSource = readFileSync(
  new URL("../src/contexts/LiveDataContext.tsx", import.meta.url),
  "utf8"
);

const currentTimeSource = readFileSync(
  new URL("../src/components/CurrentTimeCard.tsx", import.meta.url),
  "utf8"
);

test("earth globe publishes open state while the modal is active", () => {
  assert.equal(launcherSource.includes("setEarthGlobeOpenState(open)"), true);
});

test("dashboard keeps background content mounted while earth globe is open", () => {
  const blankReturnIndex = dashboardSource.indexOf('aria-hidden="true"');
  const nodeMapIndex = dashboardSource.indexOf("<MemoNodeMapView");
  const nodeDisplayIndex = dashboardSource.indexOf("<MemoNodeDisplay");

  assert.ok(nodeMapIndex > -1);
  assert.ok(nodeDisplayIndex > -1);
  assert.equal(blankReturnIndex, -1);
});

test("dashboard pauses background refresh without unmounting content", () => {
  const earthOpenIndex = dashboardSource.indexOf("const isEarthGlobeOpen = useEarthGlobeOpen()");
  const refreshPauseIndex = dashboardSource.indexOf("if (isEarthGlobeOpen) return undefined;");
  const intervalIndex = dashboardSource.indexOf("setInterval(() =>");

  assert.ok(earthOpenIndex > -1);
  assert.ok(refreshPauseIndex > -1);
  assert.ok(intervalIndex > -1);
  assert.ok(refreshPauseIndex < intervalIndex);
});

test("dashboard freezes heavy background props while earth globe is open", () => {
  assert.equal(dashboardSource.includes("useStableValueWhile"), true);
  assert.equal(dashboardSource.includes("MemoNodeMapView"), true);
  assert.equal(dashboardSource.includes("MemoNodeDisplay"), true);
  assert.equal(dashboardSource.includes("displayedLiveData"), true);
  assert.equal(dashboardSource.includes("displayedNodeList"), true);
});

test("live data polling is paused while earth globe is open", () => {
  assert.equal(liveDataSource.includes("EARTH_GLOBE_OPEN_EVENT"), true);
  assert.equal(liveDataSource.includes("getEarthGlobeOpenState"), true);
  assert.equal(liveDataSource.includes("window.addEventListener(EARTH_GLOBE_OPEN_EVENT"), true);
  assert.equal(liveDataSource.includes("if (paused || stopped) return;"), true);
});

test("dashboard clock stops ticking while earth globe is open", () => {
  assert.equal(currentTimeSource.includes("useEarthGlobeOpen"), true);
  assert.equal(currentTimeSource.includes("if (isEarthGlobeOpen) return undefined;"), true);
});
