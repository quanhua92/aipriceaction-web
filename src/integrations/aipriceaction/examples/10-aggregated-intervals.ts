/**
 * Example 10: Aggregated Intervals
 *
 * Demonstrates using aggregated intervals (5m, 15m, 30m, 1W, 2W, 1M).
 * Aggregated intervals compute OHLCV data from base intervals:
 * - Minute-based (5m, 15m, 30m): Aggregated from 1m data
 * - Day-based (1W, 2W, 1M): Aggregated from 1D data
 *
 * Run: pnpx tsx examples/10-aggregated-intervals.ts
 */

import { AIPriceActionClient, Interval } from "../src/index.js";

async function main() {
  // Create client (uses API_URL env var or defaults to localhost:3000)
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 10: Aggregated Intervals ===\n");

  try {
    // Example 1: 5-minute candles
    console.log("1️⃣  5-minute candles (VCB, last 10 candles):");
    const data5m = await client.getTickers({
      symbol: "VCB",
      interval: Interval.Minutes5,
      limit: 10,
    });
    if (data5m.VCB && data5m.VCB.length > 0) {
      console.log(`   Total candles: ${data5m.VCB.length}`);
      // Show first candle
      const first = data5m.VCB[0];
      console.log(`   Latest: ${first.time}`);
      console.log(`     Open: ${first.open.toLocaleString()}, High: ${first.high.toLocaleString()}`);
      console.log(`     Low: ${first.low.toLocaleString()}, Close: ${first.close.toLocaleString()}`);
      console.log(`     Volume: ${first.volume.toLocaleString()}`);
      console.log(`     MA20: ${first.ma20?.toFixed(2) || "N/A"}`);
      console.log(`     close_changed: ${first.close_changed?.toFixed(2) || "null"}, volume_changed: ${first.volume_changed?.toFixed(2) || "null"}`);
    }
    console.log();

    // Example 2: 15-minute candles
    console.log("2️⃣  15-minute candles (FPT, last 5 candles):");
    const data15m = await client.getTickers({
      symbol: "FPT",
      interval: Interval.Minutes15,
      limit: 5,
    });
    if (data15m.FPT && data15m.FPT.length > 0) {
      data15m.FPT.forEach((record, idx) => {
        console.log(
          `   ${idx + 1}. ${record.time}: ${record.open.toLocaleString()} → ${record.close.toLocaleString()} (Vol: ${record.volume.toLocaleString()})`
        );
      });
    }
    console.log();

    // Example 3: 30-minute candles
    console.log("3️⃣  30-minute candles (VNM, last 3 candles):");
    const data30m = await client.getTickers({
      symbol: "VNM",
      interval: Interval.Minutes30,
      limit: 3,
    });
    if (data30m.VNM && data30m.VNM.length > 0) {
      data30m.VNM.forEach((record) => {
        console.log(
          `   ${record.time}: OHLC [${record.open}, ${record.high}, ${record.low}, ${record.close}]`
        );
      });
    }
    console.log();

    // Example 4: Weekly candles (Monday-Sunday)
    console.log("4️⃣  Weekly candles (VCB, last 8 weeks):");
    const dataWeekly = await client.getTickers({
      symbol: "VCB",
      interval: Interval.Weekly,
      limit: 8,
    });
    if (dataWeekly.VCB && dataWeekly.VCB.length > 0) {
      console.log(`   Total weeks: ${dataWeekly.VCB.length}`);
      console.log(`   Latest week starting: ${dataWeekly.VCB[0].time} (Monday)`);
      console.log(`     Open: ${dataWeekly.VCB[0].open.toLocaleString()}`);
      console.log(`     Close: ${dataWeekly.VCB[0].close.toLocaleString()}`);
      console.log(`     Week Volume: ${dataWeekly.VCB[0].volume.toLocaleString()}`);

      // Show all weeks
      console.log("   Week-by-week:");
      dataWeekly.VCB.forEach((record, idx) => {
        const priceChange = record.close - record.open;
        const priceChangePct = ((priceChange / record.open) * 100).toFixed(2);
        console.log(
          `     ${idx + 1}. Week of ${record.time}: ${record.close.toLocaleString()} (${priceChangePct}%)`
        );
      });
    }
    console.log();

    // Example 5: Bi-weekly candles
    console.log("5️⃣  Bi-weekly candles (FPT, last 6 periods):");
    const dataBiWeekly = await client.getTickers({
      symbol: "FPT",
      interval: Interval.BiWeekly,
      limit: 6,
    });
    if (dataBiWeekly.FPT && dataBiWeekly.FPT.length > 0) {
      dataBiWeekly.FPT.forEach((record, idx) => {
        console.log(
          `   ${idx + 1}. ${record.time}: ${record.open.toLocaleString()} → ${record.close.toLocaleString()}`
        );
      });
    }
    console.log();

    // Example 6: Monthly candles
    console.log("6️⃣  Monthly candles (VCB, last 12 months):");
    const dataMonthly = await client.getTickers({
      symbol: "VCB",
      interval: Interval.Monthly,
      limit: 12,
    });
    if (dataMonthly.VCB && dataMonthly.VCB.length > 0) {
      console.log(`   Total months: ${dataMonthly.VCB.length}`);
      dataMonthly.VCB.forEach((record) => {
        const monthName = new Date(record.time).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        const priceChange = record.close - record.open;
        const priceChangePct = ((priceChange / record.open) * 100).toFixed(2);
        console.log(
          `   ${monthName}: ${record.open.toLocaleString()} → ${record.close.toLocaleString()} (${priceChangePct}%)`
        );
      });
    }
    console.log();

    // Example 7: Compare base vs aggregated intervals
    console.log("7️⃣  Comparison: 1m vs 5m record count (VCB):");
    const data1m = await client.getTickers({
      symbol: "VCB",
      interval: Interval.Minute,
    });
    const data5mAll = await client.getTickers({
      symbol: "VCB",
      interval: Interval.Minutes5,
    });
    if (data1m.VCB && data5mAll.VCB) {
      const ratio = (data1m.VCB.length / data5mAll.VCB.length).toFixed(2);
      console.log(`   1-minute records: ${data1m.VCB.length}`);
      console.log(`   5-minute records: ${data5mAll.VCB.length}`);
      console.log(`   Ratio: ${ratio}:1 (expected ~5:1)`);
    }
    console.log();

    // Example 8: Technical indicators in aggregated data
    console.log("8️⃣  MA indicators in weekly data (VCB):");
    if (dataWeekly.VCB && dataWeekly.VCB.length > 0) {
      const latest = dataWeekly.VCB[0];
      console.log(`   Week: ${latest.time}`);
      console.log(`   Close: ${latest.close.toLocaleString()}`);
      console.log(`   MA10: ${latest.ma10?.toLocaleString() || "N/A"}`);
      console.log(`   MA20: ${latest.ma20?.toLocaleString() || "N/A"}`);
      console.log(`   MA50: ${latest.ma50?.toLocaleString() || "N/A"}`);
      console.log(`   MA10 Score: ${latest.ma10_score?.toFixed(2) || "N/A"}%`);
      console.log(`   MA20 Score: ${latest.ma20_score?.toFixed(2) || "N/A"}%`);
      console.log(
        "   Note: MA values come from last record in aggregation (end-of-period state)"
      );
    }
    console.log();

    console.log("✅ Aggregated intervals examples completed successfully!");
    console.log("\n📚 Key Points:");
    console.log("   • Minute aggregations (5m, 15m, 30m) are computed from 1m base data");
    console.log("   • Day aggregations (1W, 2W, 1M) are computed from 1D base data");
    console.log("   • OHLCV: open=first, high=max, low=min, close=last, volume=sum");
    console.log("   • MA indicators: taken from last record (end-of-period state)");
    console.log("   • close_changed and volume_changed: calculated between consecutive candles");
    console.log("   • First candle: change indicators are null (no previous candle)");
    console.log("   • Weekly candles start on Monday (ISO 8601)");
    console.log("   • Monthly candles start on 1st day of month");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
