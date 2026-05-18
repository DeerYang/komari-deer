import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const launcherSource = readFileSync(
  new URL("../src/components/EarthGlobeLauncher.tsx", import.meta.url),
  "utf8"
);

const milkyWayImage = new URL(
  "../public/assets/earth/milky-way.jpg",
  import.meta.url
);

test("earth globe launcher does not subscribe to live status polling", () => {
  assert.equal(launcherSource.includes("useLiveData"), false);
  assert.equal(launcherSource.includes("live_data"), false);
});

test("earth globe renderer chunk is warmed after initial page render", () => {
  assert.equal(launcherSource.includes("preloadEarthGlobeRenderer"), true);
});

test("earth globe uses bundled local texture assets", () => {
  assert.equal(launcherSource.includes("upload.wikimedia.org"), false);
  assert.equal(launcherSource.includes("/assets/earth/earth-night.jpg"), true);
  assert.equal(launcherSource.includes("/assets/earth/earth-topology.png"), true);
  assert.equal(launcherSource.includes("/assets/earth/milky-way.jpg"), true);
});

test("earth globe textures are warmed before the launcher is clicked", () => {
  assert.equal(launcherSource.includes("preloadEarthTexture"), true);
  assert.equal(launcherSource.includes(".decode()"), true);
  assert.equal(launcherSource.includes("MILKY_WAY_IMAGE"), true);
});

test("earth globe keeps the original quality milky way background", () => {
  assert.ok(statSync(milkyWayImage).size > 5_000_000);
});
