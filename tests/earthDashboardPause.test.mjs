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

test("earth globe publishes open state while the modal is active", () => {
  assert.equal(launcherSource.includes("setEarthGlobeOpenState(open)"), true);
});

test("dashboard keeps background content mounted while earth globe is open", () => {
  const pauseCheckIndex = dashboardSource.indexOf("if (isEarthGlobeOpen)");
  const nodeMapIndex = dashboardSource.indexOf("<NodeMapView");
  const nodeDisplayIndex = dashboardSource.indexOf("<NodeDisplay");

  assert.ok(nodeMapIndex > -1);
  assert.ok(nodeDisplayIndex > -1);
  assert.equal(pauseCheckIndex, -1);
});
