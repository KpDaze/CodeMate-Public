import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exactHex, hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "./color.ts";
import { reorderRelative, reorderToIndex, resizeFromEdge } from "./edit.ts";

describe("editing helpers", () => {
  it("keeps an exact hex value, including capitals", () => {
    assert.equal(exactHex("  #42A5A0 "), "#42A5A0");
    assert.equal(exactHex("#42a5a0"), "#42a5a0");
    assert.equal(exactHex("#42A5A"), null);
    assert.equal(exactHex("42A5A0"), null);
  });

  it("turns #42A5A0 into that exact colour and back", () => {
    const rgb = hexToRgb("#42A5A0");
    assert.deepEqual(rgb, { r: 66, g: 165, b: 160 });
    const hsv = rgbToHsv(66, 165, 160);
    assert.deepEqual(hsvToRgb(hsv.h, hsv.s, hsv.v), { r: 66, g: 165, b: 160 });
    assert.equal(rgbToHex(66, 165, 160), "#42a5a0");
  });

  it("reorders a piece among its neighbours without removing the others", () => {
    const start = ["greeting", "introduction", "cover", "today", "continue"];
    assert.deepEqual(reorderRelative(start, "greeting", "introduction", "after"), [
      "introduction",
      "greeting",
      "cover",
      "today",
      "continue",
    ]);
    assert.deepEqual(reorderToIndex(start, "continue", 0), [
      "continue",
      "greeting",
      "introduction",
      "cover",
      "today",
    ]);
    assert.deepEqual(reorderRelative(start, "greeting", "greeting", "before"), start);
  });

  it("resizes edges without treating that as a free move", () => {
    const start = { width: 100, height: 80, placeX: 50, spaceBefore: 20, parentWidth: 300 };
    const east = resizeFromEdge("e", 40, 0, start);
    assert.equal(east.width, 140);
    assert.equal(east.height, 80);
    assert.equal(east.spaceBefore, 20);
    assert.ok(Math.abs(east.placeX - 62.5) < 0.01);

    const west = resizeFromEdge("w", -40, 0, start);
    assert.equal(west.width, 140);
    assert.ok(Math.abs(west.placeX - 37.5) < 0.01);

    const south = resizeFromEdge("s", 0, 30, start);
    assert.equal(south.height, 110);
    assert.equal(south.spaceBefore, 20);

    const north = resizeFromEdge("n", 0, 30, start);
    assert.equal(north.height, 50);
    assert.equal(north.spaceBefore, 50);

    const pulledUp = resizeFromEdge("n", 0, -30, { ...start, spaceBefore: 0 });
    assert.equal(pulledUp.height, 110);
    assert.equal(pulledUp.spaceBefore, -30);
    assert.equal(pulledUp.spaceBefore + pulledUp.height, start.height);
  });
});
