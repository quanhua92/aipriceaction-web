/**
 * Example 06: CSV Export
 *
 * Demonstrates using the getTickersCSV() method to export data
 * in CSV format and save to files.
 *
 * Run: pnpx tsx examples/06-csv-export.ts
 */

import { AIPriceActionClient, Interval } from "../src/index.js";
import { writeFile } from "fs/promises";
import { join } from "path";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 06: CSV Export ===\n");

  try {
    // Example 1: Export single ticker to CSV
    console.log("📄 Exporting VCB daily data to CSV...");
    const vcbCSV = await client.getTickersCSV({
      symbol: "VCB",
      interval: Interval.Daily,
      limit: 10,
    });

    console.log("   Preview (first 5 lines):");
    const lines = vcbCSV.split("\n");
    lines.slice(0, 5).forEach((line) => {
      console.log(`   ${line}`);
    });
    console.log(`   ... (${lines.length - 5} more lines)\n`);

    // Example 2: Export multiple tickers
    console.log("📊 Exporting multiple tickers (VCB, FPT, VNM)...");
    const multiCSV = await client.getTickersCSV({
      symbol: ["VCB", "FPT", "VNM"],
      limit: 5,
    });

    const multiLines = multiCSV.split("\n");
    console.log(`   Total lines: ${multiLines.length}`);
    console.log(`   Preview (first 3 lines):`);
    multiLines.slice(0, 3).forEach((line) => {
      console.log(`   ${line}`);
    });
    console.log();

    // Example 3: Export with date range
    console.log("📅 Exporting historical data (Jan 2025)...");
    const historicalCSV = await client.getTickersCSV({
      symbol: "VCB",
      start_date: "2025-01-01",
      end_date: "2025-01-31",
    });

    const historicalLines = historicalCSV.split("\n");
    console.log(`   Records: ${historicalLines.length - 1} (excluding header)`);
    console.log();

    // Example 4: Save CSV to file (using /tmp to avoid cleanup)
    console.log("💾 Saving CSV files to /tmp...");

    const outputDir = "/tmp";

    // Save VCB daily data
    const vcbFilename = "VCB_daily.csv";
    await writeFile(join(outputDir, vcbFilename), vcbCSV);
    console.log(`   ✅ Saved: ${join(outputDir, vcbFilename)}`);

    // Save multi-ticker data
    const multiFilename = "multi_tickers.csv";
    await writeFile(join(outputDir, multiFilename), multiCSV);
    console.log(`   ✅ Saved: ${join(outputDir, multiFilename)}`);

    // Save historical data
    const historicalFilename = "VCB_historical.csv";
    await writeFile(join(outputDir, historicalFilename), historicalCSV);
    console.log(`   ✅ Saved: ${join(outputDir, historicalFilename)}`);
    console.log();

    // Example 5: Parse CSV data (simple parsing)
    console.log("🔍 Parsing CSV data...");
    const csvLines = vcbCSV.split("\n").filter((line) => line.trim());
    const header = csvLines[0].split(",");
    const dataLines = csvLines.slice(1);

    console.log(`   Columns: ${header.join(", ")}`);
    console.log(`   Data rows: ${dataLines.length}`);

    // Parse first data row
    if (dataLines.length > 0) {
      const firstRow = dataLines[0].split(",");
      console.log("\n   First record:");
      header.forEach((col, index) => {
        console.log(`      ${col}: ${firstRow[index]}`);
      });
    }
    console.log();

    // Example 6: Export with legacy price format
    console.log("🔄 Export with legacy price format (prices ÷ 1000)...");
    const legacyCSV = await client.getTickersCSV({
      symbol: "VCB",
      limit: 3,
      legacy: true,
    });

    console.log("   Preview (legacy format):");
    legacyCSV.split("\n").slice(0, 4).forEach((line) => {
      console.log(`   ${line}`);
    });
    console.log();

    console.log("✅ CSV export examples completed!");
    console.log("\n📂 Files saved to /tmp (auto-cleanup on reboot):");
    console.log("   • /tmp/VCB_daily.csv");
    console.log("   • /tmp/multi_tickers.csv");
    console.log("   • /tmp/VCB_historical.csv");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
