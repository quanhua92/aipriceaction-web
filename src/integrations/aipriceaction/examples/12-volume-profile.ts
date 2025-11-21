/**
 * Example 12: Volume Profile Analysis
 *
 * Demonstrates using the getVolumeProfile() method to analyze
 * volume distribution across price levels for trading decisions.
 *
 * Run: pnpx tsx examples/12-volume-profile.ts
 */

import { AIPriceActionClient } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 12: Volume Profile Analysis ===\n");

  try {
    // Example 1: Basic volume profile for VN stock
    console.log("📊 Basic Volume Profile (VJC - Latest trading day):");
    const vjcProfile = await client.getVolumeProfile({
      symbol: "VJC",
      date: "2025-11-20",
    });

    console.log(`   Symbol: ${vjcProfile.data.symbol}`);
    console.log(`   Analysis Date: ${vjcProfile.analysis_date}`);
    console.log(`   Total Volume: ${vjcProfile.data.total_volume.toLocaleString()}`);
    console.log(`   Total Minutes: ${vjcProfile.data.total_minutes}`);
    console.log();

    // Price Range
    console.log("   📈 Price Range:");
    console.log(`      Low:    ${vjcProfile.data.price_range.low.toLocaleString()} VND`);
    console.log(`      High:   ${vjcProfile.data.price_range.high.toLocaleString()} VND`);
    console.log(`      Spread: ${vjcProfile.data.price_range.spread.toLocaleString()} VND`);
    console.log();

    // Point of Control
    console.log("   🎯 Point of Control (POC):");
    console.log(`      Price:      ${vjcProfile.data.poc.price.toLocaleString()} VND`);
    console.log(`      Volume:     ${vjcProfile.data.poc.volume.toLocaleString()}`);
    console.log(`      Percentage: ${vjcProfile.data.poc.percentage.toFixed(2)}%`);
    console.log();

    // Value Area
    console.log("   📦 Value Area (70% of volume):");
    console.log(`      Low:        ${vjcProfile.data.value_area.low.toLocaleString()} VND`);
    console.log(`      High:       ${vjcProfile.data.value_area.high.toLocaleString()} VND`);
    console.log(`      Volume:     ${vjcProfile.data.value_area.volume.toLocaleString()}`);
    console.log(`      Percentage: ${vjcProfile.data.value_area.percentage.toFixed(2)}%`);
    console.log();

    // Statistics
    console.log("   📊 Volume Statistics:");
    console.log(`      Mean Price:     ${vjcProfile.data.statistics.mean_price.toLocaleString()} VND`);
    console.log(`      Median Price:   ${vjcProfile.data.statistics.median_price.toLocaleString()} VND`);
    console.log(`      Std Deviation:  ${vjcProfile.data.statistics.std_deviation.toFixed(2)}`);
    console.log(`      Skewness:       ${vjcProfile.data.statistics.skewness.toFixed(4)}`);
    console.log();

    // Top 5 High Volume Nodes
    console.log("   🔥 Top 5 High Volume Nodes:");
    const sortedProfile = [...vjcProfile.data.profile]
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    sortedProfile.forEach((level, index) => {
      console.log(
        `      ${index + 1}. ${level.price.toLocaleString().padStart(10)} VND  ` +
          `${level.percentage.toFixed(2)}% of volume`
      );
    });
    console.log();

    // Example 2: Crypto volume profile
    console.log("₿  Crypto Volume Profile (BTC - Latest trading day):");
    const btcProfile = await client.getVolumeProfile({
      symbol: "BTC",
      date: "2025-11-20",
      mode: "crypto",
    });

    console.log(`   Symbol: ${btcProfile.data.symbol}`);
    console.log(`   POC Price: $${btcProfile.data.poc.price.toLocaleString()}`);
    console.log(`   Value Area: $${btcProfile.data.value_area.low.toLocaleString()} - $${btcProfile.data.value_area.high.toLocaleString()}`);
    console.log(`   Total Volume: ${btcProfile.data.total_volume.toLocaleString()}`);
    console.log();

    // Example 3: High granularity (100 bins)
    console.log("🔬 High Granularity Profile (100 bins):");
    const highGranProfile = await client.getVolumeProfile({
      symbol: "VJC",
      date: "2025-11-20",
      bins: 100,
    });

    console.log(`   Profile Levels: ${highGranProfile.data.profile.length}`);
    console.log(`   POC: ${highGranProfile.data.poc.price.toLocaleString()} VND`);
    console.log();

    // Example 4: Custom value area (80%)
    console.log("📐 Custom Value Area (80%):");
    const customVAProfile = await client.getVolumeProfile({
      symbol: "VJC",
      date: "2025-11-20",
      value_area_pct: 80,
    });

    console.log(`   Value Area Coverage: ${customVAProfile.data.value_area.percentage.toFixed(2)}%`);
    console.log(`   VA Range: ${customVAProfile.data.value_area.low.toLocaleString()} - ${customVAProfile.data.value_area.high.toLocaleString()} VND`);
    console.log();

    // Example 5: Multi-day volume profile (date range)
    console.log("📅 Multi-Day Volume Profile (3 days):");
    const weeklyProfile = await client.getVolumeProfile({
      symbol: "VJC",
      start_date: "2025-11-18",
      end_date: "2025-11-20",
      bins: 100,
    });

    console.log(`   Analysis Period: ${weeklyProfile.analysis_date}`);
    console.log(`   Total Minutes: ${weeklyProfile.data.total_minutes} (across multiple days)`);
    console.log(`   Total Volume: ${weeklyProfile.data.total_volume.toLocaleString()}`);
    console.log(`   Composite POC: ${weeklyProfile.data.poc.price.toLocaleString()} VND`);
    console.log(`   Value Area: ${weeklyProfile.data.value_area.low.toLocaleString()} - ${weeklyProfile.data.value_area.high.toLocaleString()} VND`);
    console.log();

    // Example 6: Trading insights
    console.log("💡 Trading Insights:");
    const currentPrice = vjcProfile.data.poc.price;
    const vaHigh = vjcProfile.data.value_area.high;
    const vaLow = vjcProfile.data.value_area.low;

    if (currentPrice > vaHigh) {
      console.log("   ⚠️  Price ABOVE Value Area → Potentially overbought");
      console.log("      Strategy: Look for mean reversion back to VA High");
    } else if (currentPrice < vaLow) {
      console.log("   ⚠️  Price BELOW Value Area → Potentially oversold");
      console.log("      Strategy: Look for bounce back to VA Low");
    } else {
      console.log("   ✅ Price INSIDE Value Area → Normal trading range");
      console.log("      Strategy: Range trading between VA Low and VA High");
    }
    console.log();

    // Display distribution skewness insight
    const skewness = vjcProfile.data.statistics.skewness;
    console.log("   📊 Distribution Analysis:");
    if (skewness > 0.5) {
      console.log("      Positive skew → More volume at lower prices (bullish accumulation)");
    } else if (skewness < -0.5) {
      console.log("      Negative skew → More volume at higher prices (bearish distribution)");
    } else {
      console.log("      Balanced distribution → Neutral market sentiment");
    }
    console.log();

    console.log("✅ Volume profile analysis completed!");
    console.log("\n💡 Tips:");
    console.log("   • POC acts as magnetic price level (support/resistance)");
    console.log("   • Value Area defines 'normal' trading range");
    console.log("   • High Volume Nodes (>3%) = Strong support/resistance");
    console.log("   • Low Volume Nodes (<1%) = Price moves fast through these areas");
    console.log("   • Combine with MA analysis for best results");
    console.log("   • Use smaller bins (10-20) for clarity, larger bins (50-100) for precision");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
