/**
 * Example 03: Ticker Groups
 *
 * Demonstrates using the getTickerGroups() method to retrieve
 * sector and index groupings.
 *
 * Run: pnpx tsx examples/03-ticker-groups.ts
 */

import { AIPriceActionClient } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 03: Ticker Groups ===\n");

  try {
    const groups = await client.getTickerGroups();

    // List all available groups
    console.log("📋 Available Groups:");
    const groupNames = Object.keys(groups).sort();
    console.log(`   Total: ${groupNames.length} groups`);
    console.log();

    // Show some major groups (using actual Vietnamese group names)
    const majorGroups = [
      { key: "NGAN_HANG", display: "Banking (NGAN_HANG)" },
      { key: "CONG_NGHE", display: "Technology (CONG_NGHE)" },
      { key: "BAT_DONG_SAN", display: "Real Estate (BAT_DONG_SAN)" },
      { key: "XAY_DUNG", display: "Construction (XAY_DUNG)" },
      { key: "DAU_KHI", display: "Energy (DAU_KHI)" },
    ];

    for (const group of majorGroups) {
      const tickers = groups[group.key];

      if (tickers) {
        console.log(`🏢 ${group.display}:`);
        console.log(`   Members: ${tickers.length}`);
        console.log(`   Tickers: ${tickers.slice(0, 10).join(", ")}${tickers.length > 10 ? "..." : ""}`);
        console.log();
      }
    }

    // Example: Get data for banking sector tickers
    console.log("📊 Getting data for Banking sector (NGAN_HANG)...");
    const bankingTickers = groups["NGAN_HANG"] || [];

    if (bankingTickers.length > 0) {
      // Get latest data for first 5 banking stocks
      const sampleTickers = bankingTickers.slice(0, 5);
      const data = await client.getTickers({
        symbol: sampleTickers,
      });

      console.log(`\n💹 Latest prices for ${sampleTickers.length} banking stocks:`);
      for (const ticker of sampleTickers) {
        const tickerData = data[ticker];
        if (tickerData && tickerData.length > 0) {
          const latest = tickerData[0];
          console.log(
            `   ${ticker.padEnd(6)} ${latest.close.toLocaleString().padStart(10)} VND  (${latest.time})`
          );
        }
      }
    }
    console.log();

    // Example: Find which groups a ticker belongs to
    console.log("🔍 Finding groups for VCB:");
    const targetTicker = "VCB";
    const belongsTo: string[] = [];

    for (const [groupName, tickers] of Object.entries(groups)) {
      if (tickers.includes(targetTicker)) {
        belongsTo.push(groupName);
      }
    }

    console.log(`   ${targetTicker} belongs to: ${belongsTo.join(", ")}`);
    console.log();

    console.log("✅ Ticker groups example completed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
