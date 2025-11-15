/**
 * Example 11: Hourly Breakdown Analysis
 *
 * Demonstrates using the getTopPerformers() method with hourly breakdown
 * to analyze intraday performance patterns across trading hours.
 *
 * Run: pnpx tsx examples/11-hourly-breakdown.ts
 */

// @ts-nocheck - This example uses API features that are not yet implemented
import { AIPriceActionClient, SortMetric, SortDirection } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 11: Hourly Breakdown Analysis ===\n");

  try {
    // Example 1: Basic hourly breakdown - top performers by each hour
    console.log("⏰ Hourly Breakdown - Top Performers by Trading Hour:");
    const hourlyPerformers = await client.getTopPerformers({
      sort_by: SortMetric.CloseChangePercent,
      direction: SortDirection.Descending,
      limit: 3,
      with_hour: true, // Enable hourly breakdown
    });

    console.log(`   Analysis Date: ${hourlyPerformers.analysis_date}`);
    console.log(`   Daily Top Performers: ${hourlyPerformers.data.performers.length}`);
    console.log(`   Hourly Breakdowns: ${hourlyPerformers.data.hourly?.length || 0} hours\n`);

    // Display daily summary first
    console.log("📅 Daily Summary:");
    hourlyPerformers.data.performers.forEach((stock, index) => {
      const changeSign = (stock.close_changed ?? 0) >= 0 ? "+" : "";
      console.log(
        `   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
          `${changeSign}${(stock.close_changed ?? 0).toFixed(2)}%  ` +
          `Vol: ${(stock.volume / 1000).toFixed(0)}K  ` +
          `Sector: ${stock.sector || "N/A"}`
      );
    });
    console.log();

    // Display hourly breakdown
    if (hourlyPerformers.data.hourly && hourlyPerformers.data.hourly.length > 0) {
      console.log("🕐 Hourly Breakdown:");

      hourlyPerformers.data.hourly.forEach((hourData, hourIndex) => {
        console.log(`   Hour ${hourIndex + 1}: ${hourData.hour}`);
        console.log(`   ┌─ Top Performers (${hourData.performers.length}):`);

        hourData.performers.slice(0, 2).forEach((stock, index) => {
          const changeSign = (stock.close_changed ?? 0) >= 0 ? "+" : "";
          console.log(
            `   │   ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
              `${changeSign}${(stock.close_changed ?? 0).toFixed(2)}%  ` +
              `MA20: ${stock.ma20_score?.toFixed(1) || "N/A"}%`
          );
        });

        if (hourData.performers.length > 2) {
          console.log(`   │   ... and ${hourData.performers.length - 2} more`);
        }

        if (hourData.worst_performers.length > 0) {
          console.log(`   └─ Worst Performers (${hourData.worst_performers.length}):`);
          hourData.worst_performers.slice(0, 2).forEach((stock, index) => {
            const changeSign = (stock.close_changed ?? 0) >= 0 ? "+" : "";
            console.log(
              `       ${(index + 1).toString().padStart(2)}. ${stock.symbol.padEnd(6)} ` +
                `${changeSign}${(stock.close_changed ?? 0).toFixed(2)}%  ` +
                `MA20: ${stock.ma20_score?.toFixed(1) || "N/A"}%`
            );
          });
        }
        console.log();
      });
    }

    // Example 2: Hourly volume analysis
    console.log("📊 Hourly Volume Leaders Analysis:");
    const hourlyVolumeLeaders = await client.getTopPerformers({
      sort_by: SortMetric.Volume,
      limit: 2,
      min_volume: 50000,
      with_hour: true,
    });

    if (hourlyVolumeLeaders.data.hourly) {
      hourlyVolumeLeaders.data.hourly.forEach((hourData, index) => {
        const topVolume = hourData.performers[0];
        if (topVolume) {
          console.log(
            `   ${hourData.hour} → ${topVolume.symbol}: ` +
              `${(topVolume.volume / 1000).toFixed(0)}K shares`
          );
        }
      });
    }
    console.log();

    // Example 3: Hourly MA momentum tracking
    console.log("📈 Hourly MA20 Momentum Tracking:");
    const hourlyMAMomentum = await client.getTopPerformers({
      sort_by: SortMetric.MA20Score,
      limit: 2,
      with_hour: true,
    });

    if (hourlyMAMomentum.data.hourly) {
      hourlyMAMomentum.data.hourly.forEach((hourData, index) => {
        const topMomentum = hourData.performers[0];
        if (topMomentum && topMomentum.ma20_score) {
          const momentumSign = topMomentum.ma20_score >= 0 ? "+" : "";
          console.log(
            `   ${hourData.hour} → ${topMomentum.symbol}: ` +
              `MA20 ${momentumSign}${topMomentum.ma20_score.toFixed(2)}%  ` +
              `(${topMomentum.sector || "N/A"})`
          );
        }
      });
    }
    console.log();

    // Example 4: Sector hourly analysis (Banking)
    console.log("🏦 Banking Sector Hourly Performance:");
    try {
      const bankingHourly = await client.getTopPerformers({
        sector: "BANKING",
        sort_by: SortMetric.CloseChangePercent,
        limit: 1,
        with_hour: true,
      });

      if (bankingHourly.data.hourly) {
        console.log("   Hourly Top Banking Performers:");
        bankingHourly.data.hourly.forEach((hourData) => {
          if (hourData.performers.length > 0) {
            const topBank = hourData.performers[0];
            const changeSign = (topBank.close_changed ?? 0) >= 0 ? "+" : "";
            console.log(
              `   ${hourData.hour} → ${topBank.symbol}: ` +
              `${changeSign}${(topBank.close_changed ?? 0).toFixed(2)}%  ` +
              `Vol: ${(topBank.volume / 1000).toFixed(0)}K`
            );
          } else {
            console.log(`   ${hourData.hour} → No banking data`);
          }
        });
      }
    } catch (error) {
      console.log("   No banking sector data available for hourly analysis");
    }
    console.log();

    // Example 5: Money flow analysis by hour
    console.log("💰 Hourly Money Flow Analysis:");
    const hourlyMoneyFlow = await client.getTopPerformers({
      sort_by: SortMetric.TotalMoneyChanged,
      direction: SortDirection.Descending,
      limit: 1,
      with_hour: true,
    });

    if (hourlyMoneyFlow.data.hourly) {
      hourlyMoneyFlow.data.hourly.forEach((hourData) => {
        const topMoneyFlow = hourData.performers[0];
        if (topMoneyFlow && topMoneyFlow.total_money_changed) {
          const flowSign = topMoneyFlow.total_money_changed >= 0 ? "+" : "";
          const flowInMillions = Math.abs(topMoneyFlow.total_money_changed / 1_000_000);
          console.log(
            `   ${hourData.hour} → ${topMoneyFlow.symbol}: ` +
              `${flowSign}${flowInMillions.toFixed(0)}M VND  ` +
              `(${topMoneyFlow.sector || "N/A"})`
          );
        }
      });
    }
    console.log();

    console.log("✅ Hourly breakdown analysis completed!");
    console.log();
    console.log("💡 Key Insights:");
    console.log("   • Track momentum changes throughout the trading day");
    console.log("   • Identify sectors leading in different time periods");
    console.log("   • Monitor volume patterns and money flow shifts");
    console.log("   • Use hourly data for intraday trading strategies");
    console.log("   • All 20 data columns available for each hourly performer");

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();