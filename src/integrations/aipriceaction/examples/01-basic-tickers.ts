/**
 * Example 01: Basic Tickers API Usage
 *
 * Demonstrates basic usage of the getTickers() method with various parameters.
 *
 * Run: pnpx tsx examples/01-basic-tickers.ts
 */

import { AIPriceActionClient } from "../src/index.js";

async function main() {
  // Create client (uses API_URL env var or defaults to localhost:3000)
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 01: Basic Tickers API ===\n");

  try {
    // Example 1: Get today's data for single ticker
    console.log("1️⃣  Single ticker (VCB - today's data):");
    const vcbData = await client.getTickers({ symbol: "VCB" });
    if (vcbData.VCB && vcbData.VCB.length > 0) {
      const latest = vcbData.VCB[0];
      console.log(`   Date: ${latest.time}`);
      console.log(`   Close: ${latest.close.toLocaleString()} VND`);
      console.log(`   Volume: ${latest.volume.toLocaleString()}`);
      console.log(`   MA20: ${latest.ma20?.toFixed(2) || "N/A"}`);
      console.log(`   MA20 Score: ${latest.ma20_score?.toFixed(2) || "N/A"}%`);
    }
    console.log();

    // Example 2: Get multiple tickers
    console.log("2️⃣  Multiple tickers (VCB, FPT, VNM):");
    const multiData = await client.getTickers({
      symbol: ["VCB", "FPT", "VNM"],
    });
    for (const [ticker, data] of Object.entries(multiData)) {
      if (data.length > 0) {
        console.log(
          `   ${ticker}: ${data[0].close.toLocaleString()} VND (${data[0].time})`
        );
      }
    }
    console.log();

    // Example 3: Get historical data with date range
    console.log("3️⃣  Historical data (VCB, Jan 2025):");
    const historicalData = await client.getTickers({
      symbol: "VCB",
      start_date: "2025-01-01",
      end_date: "2025-01-31",
    });
    if (historicalData.VCB) {
      console.log(`   Records: ${historicalData.VCB.length}`);
      if (historicalData.VCB.length > 0) {
        console.log(`   First: ${historicalData.VCB[0].time}`);
        console.log(
          `   Last: ${historicalData.VCB[historicalData.VCB.length - 1].time}`
        );
      }
    }
    console.log();

    // Example 4: Get last N days using limit
    console.log("4️⃣  Last 5 trading days (FPT):");
    const limitData = await client.getTickers({
      symbol: "FPT",
      limit: 5,
    });
    if (limitData.FPT) {
      console.log(`   Records: ${limitData.FPT.length}`);
      limitData.FPT.forEach((record, index) => {
        console.log(
          `   ${index + 1}. ${record.time}: ${record.close.toLocaleString()} VND`
        );
      });
    }
    console.log();

    // Example 5: Get hourly data
    console.log("5️⃣  Hourly data (VCB, latest 3 hours):");
    const hourlyData = await client.getTickers({
      symbol: "VCB",
      interval: "1H",
      limit: 3,
    });
    if (hourlyData.VCB && hourlyData.VCB.length > 0) {
      hourlyData.VCB.forEach((record) => {
        console.log(
          `   ${record.time}: ${record.close.toLocaleString()} VND (Vol: ${record.volume.toLocaleString()})`
        );
      });
    }
    console.log();

    console.log("✅ Examples completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
