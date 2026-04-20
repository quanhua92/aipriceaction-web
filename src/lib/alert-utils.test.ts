import { describe, expect, it } from "vitest";
import { findPriceCrossBar } from "./alert-utils";
import type { StockData } from "@/integrations/aipriceaction/src/types";

function bar(time: string, close: number): StockData {
  return {
    symbol: "TEST",
    time,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1000,
  };
}

describe("findPriceCrossBar", () => {
  describe("upward alert (creationPrice < targetPrice)", () => {
    it("triggers on first bar where close >= target", () => {
      const bars = [
        bar("2025-01-01", 50000),
        bar("2025-01-02", 55000),
        bar("2025-01-03", 62000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBe(bars[2]);
    });

    it("triggers immediately if first bar is already above target", () => {
      const bars = [bar("2025-01-01", 65000)];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBe(bars[0]);
    });

    it("does not trigger when all closes are below target", () => {
      const bars = [
        bar("2025-01-01", 50000),
        bar("2025-01-02", 55000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBeNull();
    });
  });

  describe("downward alert (creationPrice > targetPrice)", () => {
    it("triggers on first bar where close <= target", () => {
      const bars = [
        bar("2025-01-01", 48000),
        bar("2025-01-02", 42000),
        bar("2025-01-03", 38000),
      ];
      const result = findPriceCrossBar(50000, 40000, bars);
      expect(result).toBe(bars[2]);
    });

    it("triggers immediately if first bar is already below target", () => {
      const bars = [bar("2025-01-01", 35000)];
      const result = findPriceCrossBar(50000, 40000, bars);
      expect(result).toBe(bars[0]);
    });

    it("does not trigger when all closes are above target", () => {
      const bars = [
        bar("2025-01-01", 48000),
        bar("2025-01-02", 45000),
      ];
      const result = findPriceCrossBar(50000, 40000, bars);
      expect(result).toBeNull();
    });
  });

  describe("reset scenario — price already past target", () => {
    it("reset at 110, target 100: triggers when close drops to or below 100", () => {
      const bars = [
        bar("2025-01-01", 108000),
        bar("2025-01-02", 104000),
        bar("2025-01-03", 97000),
      ];
      const result = findPriceCrossBar(110000, 100000, bars);
      expect(result).toBe(bars[2]);
    });

    it("reset at 50, target 60: triggers when close rises to or above 60", () => {
      const bars = [
        bar("2025-01-01", 55000),
        bar("2025-01-02", 58000),
        bar("2025-01-03", 62000),
      ];
      const result = findPriceCrossBar(50000, 60000, bars);
      expect(result).toBe(bars[2]);
    });

    it("does not re-trigger while close stays on the same side", () => {
      const bars = [
        bar("2025-01-01", 108000),
        bar("2025-01-02", 112000),
      ];
      const result = findPriceCrossBar(110000, 100000, bars);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("never triggers when creationPrice equals targetPrice", () => {
      const bars = [bar("2025-01-01", 60000)];
      const result = findPriceCrossBar(50000, 50000, bars);
      expect(result).toBeNull();
    });

    it("returns null for empty array", () => {
      const result = findPriceCrossBar(50000, 60000, []);
      expect(result).toBeNull();
    });
  });
});
