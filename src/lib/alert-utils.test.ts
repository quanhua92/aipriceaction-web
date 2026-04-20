import { describe, expect, it } from "vitest";
import { findPriceCrossBar } from "./alert-utils";
import type { StockData } from "@/integrations/aipriceaction/src/types";

function bar(time: string, low: number, high: number): StockData {
  return {
    symbol: "TEST",
    time,
    open: low,
    high,
    low,
    close: high,
    volume: 1000,
  };
}

describe("findPriceCrossBar", () => {
  describe("upward alert (creationPrice < targetPrice)", () => {
    it("triggers when price crosses from below to above target", () => {
      const bars = [
        bar("2025-01-01", 50000, 55000),
        bar("2025-01-02", 58000, 62000), // crosses above 60000
        bar("2025-01-03", 61000, 65000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBe(bars[1]);
    });

    it("does not trigger when bars are below target", () => {
      const bars = [
        bar("2025-01-01", 50000, 55000),
        bar("2025-01-02", 52000, 58000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBeNull();
    });

    it("does not trigger when bars are entirely above target (no cross)", () => {
      const bars = [
        bar("2025-01-01", 61000, 65000),
        bar("2025-01-02", 62000, 66000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBeNull();
    });

    it("does not trigger when bar touches target but doesn't cross (low == target)", () => {
      const bars = [
        bar("2025-01-01", 60000, 62000), // low equals target, no "below" to cross from
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBeNull();
    });
  });

  describe("downward alert (creationPrice > targetPrice)", () => {
    it("triggers when price crosses from above to below target", () => {
      const bars = [
        bar("2025-01-01", 42000, 45000),
        bar("2025-01-02", 38000, 41000), // crosses below 40000
      ];
      const result = findPriceCrossBar(50000, 40000, bars);
      expect(result).toBe(bars[1]);
    });

    it("does not trigger when bars are above target", () => {
      const bars = [
        bar("2025-01-01", 42000, 45000),
        bar("2025-01-02", 43000, 46000),
      ];
      const result = findPriceCrossBar(50000, 40000, bars);
      expect(result).toBeNull();
    });

    it("does not trigger when bars are entirely below target (no cross)", () => {
      const bars = [
        bar("2025-01-01", 38000, 39000),
        bar("2025-01-02", 37000, 38500),
      ];
      const result = findPriceCrossBar(50000, 40000, bars);
      expect(result).toBeNull();
    });
  });

  describe("reset scenario — price already past target", () => {
    it("upward alert reset at 110k with target 100k: does not re-trigger while price stays above", () => {
      const bars = [
        bar("2025-01-01", 105000, 115000),
        bar("2025-01-02", 108000, 112000),
      ];
      const result = findPriceCrossBar(110000, 100000, bars);
      // creationPrice (110k) > targetPrice (100k) → this is actually a downward alert direction
      // bars don't cross from above to below
      expect(result).toBeNull();
    });

    it("upward alert reset at 110k with target 100k: triggers only after price drops below then rises back", () => {
      const bars = [
        bar("2025-01-01", 105000, 115000),
        bar("2025-01-02", 95000, 98000),  // drops below 100k
        bar("2025-01-03", 97000, 102000), // rises back above 100k
      ];
      const result = findPriceCrossBar(110000, 100000, bars);
      expect(result).toBe(bars[2]);
    });

    it("downward alert reset at 50k with target 60k: does not re-trigger while price stays below", () => {
      const bars = [
        bar("2025-01-01", 55000, 59000),
        bar("2025-01-02", 52000, 56000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      // creationPrice (50k) < targetPrice (60k) → upward alert direction
      // bars don't cross from below to above
      expect(result).toBeNull();
    });

    it("downward alert reset at 50k with target 60k: triggers only after price rises above then drops back", () => {
      const bars = [
        bar("2025-01-01", 55000, 59000),
        bar("2025-01-02", 61000, 65000),  // rises above 60k
        bar("2025-01-03", 58000, 62000),  // drops back below 60k
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBe(bars[2]);
    });
  });

  describe("edge case — creationPrice equals targetPrice", () => {
    it("never triggers when creation price equals target", () => {
      const bars = [
        bar("2025-01-01", 50000, 60000),
        bar("2025-01-02", 40000, 70000),
      ];
      const result = findPriceCrossBar(50000, 50000, bars);
      expect(result).toBeNull();
    });
  });

  describe("empty bars", () => {
    it("returns null for empty array", () => {
      const result = findPriceCrossBar(50000, 60000, []);
      expect(result).toBeNull();
    });
  });
});
