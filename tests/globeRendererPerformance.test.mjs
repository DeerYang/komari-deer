import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rendererSource = readFileSync(
  new URL("../src/components/earth/GlobeRenderer.tsx", import.meta.url),
  "utf8"
);

test("earth globe renderer does not force preserveDrawingBuffer", () => {
  assert.equal(rendererSource.includes("preserveDrawingBuffer"), false);
});

test("earth globe renderer uses purcarte-plus constructor initialization", () => {
  assert.equal(rendererSource.includes("new (Globe as any)"), true);
  assert.equal(rendererSource.includes("(Globe as any)()(canvas)"), false);
});
