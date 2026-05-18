import test from "node:test";
import assert from "node:assert/strict";

import { getEarthCountryPolygons } from "../src/components/earth/earthCountryPolygons.ts";

test("earth country polygons are resolved from cached local topology", () => {
  const first = getEarthCountryPolygons(["US", "SG", "HK", "NOPE"]);
  const second = getEarthCountryPolygons(["US", "SG", "HK", "NOPE"]);

  assert.equal(first, second);
  assert.deepEqual(
    first.map((polygon) => polygon.code).sort(),
    ["HK", "SG", "US"],
  );
  assert.ok(first.every((polygon) => polygon.geometry));
  assert.deepEqual(
    first
      .filter((polygon) => polygon.synthetic)
      .map((polygon) => polygon.code)
      .sort(),
    ["HK", "SG"],
  );
});
