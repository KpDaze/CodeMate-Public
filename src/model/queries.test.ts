import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoDocument } from "./demo-document.ts";
import { formatMeasure } from "./labels.ts";
import { layerRows, orderLabel, positionLabel } from "./queries.ts";

describe("demo document", () => {
  it("lists every piece in visual order", () => {
    const ids = layerRows(demoDocument).map((row) => row.id);
    assert.deepEqual(ids, [
      "welcome",
      "greeting",
      "introduction",
      "cover",
      "today",
      "waiting",
      "open",
      "continue",
      "extra",
      "extra2",
    ]);
  });

  it("describes order and position from the model, not from a framework", () => {
    assert.equal(orderLabel(demoDocument, "welcome"), null);
    assert.equal(positionLabel(demoDocument, "welcome"), "The whole design");
    assert.equal(orderLabel(demoDocument, "greeting"), "1 of 7");
    assert.equal(positionLabel(demoDocument, "greeting"), "Inside Welcome");
    assert.equal(orderLabel(demoDocument, "open"), "2 of 2");
    assert.equal(positionLabel(demoDocument, "waiting"), "Inside Today");
    assert.equal(orderLabel(demoDocument, "continue"), "5 of 7");
  });

  it("says width and height in plain language", () => {
    assert.equal(formatMeasure(demoDocument.elements.welcome.width, "width"), "Full width");
    assert.equal(formatMeasure(demoDocument.elements.welcome.height, "height"), "Fits content");
    assert.equal(formatMeasure(demoDocument.elements.cover.width, "width"), "Full width");
    assert.equal(formatMeasure(demoDocument.elements.cover.height, "height"), "220");
    assert.equal(formatMeasure(demoDocument.elements.greeting.width, "width"), "Fits content");
    assert.equal(formatMeasure(demoDocument.elements.continue.width, "width"), "Full width");
  });
});
