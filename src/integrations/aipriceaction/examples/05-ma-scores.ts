/**
 * Example 05: Moving Average Scores by Sector
 *
 * Demonstrates using the getMAScoresBySector() method to analyze
 * sector momentum based on moving averages.
 *
 * Run: pnpx tsx examples/05-ma-scores.ts
 */

import { AIPriceActionClient, MAPeriod } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 05: MA Scores by Sector ===\n");

  try {
    // Example 1: MA20 scores by sector
    console.log("📊 MA20 Scores by Sector:");
    const ma20Scores = await client.getMAScoresBySector({
      ma_period: MAPeriod.MA20,
      top_per_sector: 5,
    });

    console.log(`   Analysis Date: ${ma20Scores.analysis_date}`);
    console.log(`   MA Period: ${ma20Scores.data.ma_period}`);
    console.log(`   Total Analyzed: ${ma20Scores.total_analyzed} stocks\n`);

    // Show top 5 sectors by average score
    const sortedSectors = ma20Scores.data.sectors
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 5);

    sortedSectors.forEach((sector, index) => {
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${sector.sector_name.padEnd(15)} ` +
          `Avg: ${sector.average_score.toFixed(2)}%  ` +
          `Stocks: ${sector.total_stocks}  ` +
          `Above MA: ${sector.stocks_above_threshold}`
      );
    });
    console.log();

    // Example 2: Detailed view of a specific sector (NGAN_HANG - Banking)
    console.log("🏦 Banking Sector (NGAN_HANG) - MA20 Analysis:");
    const bankingSector = ma20Scores.data.sectors.find(
      (s) => s.sector_name === "NGAN_HANG"
    );

    if (bankingSector) {
      console.log(`   Total Stocks: ${bankingSector.total_stocks}`);
      console.log(`   Above MA20: ${bankingSector.stocks_above_threshold}`);
      console.log(`   Average Score: ${bankingSector.average_score.toFixed(2)}%\n`);

      console.log("   Top Stocks:");
      bankingSector.top_stocks.slice(0, 5).forEach((stock, index) => {
        console.log(
          `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
            `${stock.close.toLocaleString().padStart(10)} VND  ` +
            `MA20: ${stock.ma_value.toLocaleString().padStart(10)}  ` +
            `Score: ${stock.ma_score >= 0 ? "+" : ""}${stock.ma_score.toFixed(2)}%`
        );
      });
    }
    console.log();

    // Example 3: MA50 scores with threshold filter
    console.log("📈 MA50 Scores (above 2% threshold):");
    const ma50Scores = await client.getMAScoresBySector({
      ma_period: MAPeriod.MA50,
      min_score: 2.0,
      above_threshold_only: true,
      top_per_sector: 3,
    });

    console.log(
      `   Sectors with stocks above 2% MA50: ${ma50Scores.data.sectors.length}\n`
    );

    ma50Scores.data.sectors
      .filter((s) => s.stocks_above_threshold > 0)
      .slice(0, 5)
      .forEach((sector) => {
        console.log(`   ${sector.sector_name}:`);
        console.log(
          `      Above threshold: ${sector.stocks_above_threshold}/${sector.total_stocks}`
        );

        sector.top_stocks.forEach((stock) => {
          console.log(
            `      • ${stock.symbol}: ${stock.ma_score >= 0 ? "+" : ""}${stock.ma_score.toFixed(2)}% above MA50`
          );
        });
        console.log();
      });

    // Example 4: Long-term trend analysis (MA200)
    console.log("📉 MA200 Long-term Trend Analysis:");
    const ma200Scores = await client.getMAScoresBySector({
      ma_period: MAPeriod.MA200,
      top_per_sector: 3,
    });

    const strongSectors = ma200Scores.data.sectors
      .filter((s) => s.average_score > 0)
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 5);

    console.log(`   Sectors with positive MA200 momentum:\n`);
    strongSectors.forEach((sector) => {
      console.log(
        `   ${sector.sector_name.padEnd(15)} Avg: ${sector.average_score.toFixed(2)}%`
      );
    });
    console.log();

    console.log("✅ MA scores analysis completed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
