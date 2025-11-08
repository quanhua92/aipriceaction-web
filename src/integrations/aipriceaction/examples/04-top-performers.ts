/**
 * Example 04: Top Performers Analysis
 *
 * Demonstrates using the getTopPerformers() method to analyze
 * top and bottom performing stocks with various sorting options.
 *
 * Run: pnpx tsx examples/04-top-performers.ts
 */

import { AIPriceActionClient, SortMetric, SortDirection } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 04: Top Performers Analysis ===\n");

  try {
    // Example 1: Top 10 performers by percentage change
    console.log("🚀 Top 10 Performers (by % change):");
    const topPerformers = await client.getTopPerformers({
      sort_by: SortMetric.CloseChangePercent,
      direction: SortDirection.Descending,
      limit: 10,
    });

    console.log(`   Analysis Date: ${topPerformers.analysis_date}`);
    console.log(`   Total Analyzed: ${topPerformers.total_analyzed} stocks\n`);

    topPerformers.data.performers.forEach((stock, index) => {
      const changeSign = (stock.close_changed ?? 0) >= 0 ? "+" : "";
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
          `${stock.close.toLocaleString().padStart(10)} VND  ` +
          `${changeSign}${(stock.close_changed ?? 0).toFixed(2)}%  ` +
          `Vol: ${(stock.volume / 1000).toFixed(0)}K`
      );
    });
    console.log();

    // Example 2: Bottom 5 performers
    console.log("📉 Bottom 5 Performers (worst % change):");
    const bottomPerformers = await client.getTopPerformers({
      sort_by: SortMetric.CloseChangePercent,
      direction: SortDirection.Ascending,
      limit: 5,
    });

    bottomPerformers.data.performers.forEach((stock, index) => {
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
          `${stock.close.toLocaleString().padStart(10)} VND  ` +
          `${(stock.close_changed ?? 0).toFixed(2)}%`
      );
    });
    console.log();

    // Example 3: Top volume leaders
    console.log("📊 Top 5 Volume Leaders:");
    const volumeLeaders = await client.getTopPerformers({
      sort_by: SortMetric.Volume,
      limit: 5,
      min_volume: 100000, // Filter low volume stocks
    });

    volumeLeaders.data.performers.forEach((stock, index) => {
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
          `Vol: ${(stock.volume / 1_000_000).toFixed(2)}M  ` +
          `Price: ${stock.close.toLocaleString()} VND`
      );
    });
    console.log();

    // Example 4: Top MA20 momentum stocks
    console.log("📈 Top 5 MA20 Momentum (stocks above MA20):");
    const ma20Leaders = await client.getTopPerformers({
      sort_by: SortMetric.MA20Score,
      limit: 5,
    });

    ma20Leaders.data.performers.forEach((stock, index) => {
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
          `MA20 Score: ${stock.ma20_score?.toFixed(2)}%  ` +
          `Price: ${stock.close.toLocaleString()} VND`
      );
    });
    console.log();

    // Example 5: Filter by sector (NGAN_HANG - Banking)
    console.log("🏆 Top 5 Banking Sector (NGAN_HANG) Performers:");
    const bankingPerformers = await client.getTopPerformers({
      sector: "NGAN_HANG",
      sort_by: SortMetric.CloseChangePercent,
      limit: 5,
    });

    bankingPerformers.data.performers.forEach((stock, index) => {
      const changeSign = (stock.close_changed ?? 0) >= 0 ? "+" : "";
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
          `${changeSign}${(stock.close_changed ?? 0).toFixed(2)}%  ` +
          `Sector: ${stock.sector || "N/A"}`
      );
    });
    console.log();

    console.log("✅ Top performers analysis completed!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
