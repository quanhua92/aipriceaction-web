/**
 * Example 09: Analysis Dashboard - Real-World Workflow
 *
 * Demonstrates a complete market analysis workflow combining
 * multiple API endpoints to build a comprehensive dashboard.
 *
 * Run: pnpx tsx examples/09-analysis-dashboard.ts
 */

import { AIPriceActionClient, SortMetric, MAPeriod } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║        VIETNAM STOCK MARKET ANALYSIS DASHBOARD          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();

  try {
    // Step 1: Get system health and basic info
    console.log("📊 SYSTEM STATUS");
    console.log("─".repeat(60));

    const health = await client.getHealth();

    console.log(`Trading Hours:     ${health.is_trading_hours ? "✅ OPEN" : "❌ CLOSED"}`);
    console.log(`Active Tickers:    ${health.active_tickers_count.toLocaleString()}`);
    console.log(
      `Memory Usage:      ${health.memory_usage_mb.toFixed(0)}MB / ${health.memory_limit_mb}MB (${health.memory_usage_percent.toFixed(1)}%)`
    );
    console.log(
      `Data Records:      ${(health.daily_records_count + health.hourly_records_count + health.minute_records_count).toLocaleString()} total`
    );
    console.log(`Last Daily Sync:   ${health.daily_last_sync || "N/A"}`);
    console.log();

    // Step 2: Market Overview - Top Gainers & Losers
    console.log("🚀 MARKET OVERVIEW");
    console.log("─".repeat(60));

    const [topGainers, topLosers, volumeLeaders] = await Promise.all([
      client.getTopPerformers({
        sort_by: SortMetric.CloseChangePercent,
        limit: 5,
      }),
      client.getTopPerformers({
        sort_by: SortMetric.CloseChangePercent,
        direction: "asc",
        limit: 5,
      }),
      client.getTopPerformers({
        sort_by: SortMetric.Volume,
        limit: 5,
      }),
    ]);

    console.log("\n📈 Top 5 Gainers:");
    topGainers.data.performers.forEach((stock, i) => {
      console.log(
        `   ${i + 1}. ${stock.symbol.padEnd(6)} ` +
          `+${(stock.close_changed ?? 0).toFixed(2)}%  ` +
          `${stock.close.toLocaleString().padStart(10)} VND`
      );
    });

    console.log("\n📉 Top 5 Losers:");
    topLosers.data.performers.forEach((stock, i) => {
      console.log(
        `   ${i + 1}. ${stock.symbol.padEnd(6)} ` +
          `${(stock.close_changed ?? 0).toFixed(2)}%  ` +
          `${stock.close.toLocaleString().padStart(10)} VND`
      );
    });

    console.log("\n📊 Volume Leaders:");
    volumeLeaders.data.performers.forEach((stock, i) => {
      console.log(
        `   ${i + 1}. ${stock.symbol.padEnd(6)} ` +
          `${(stock.volume / 1_000_000).toFixed(2)}M  ` +
          `${stock.close.toLocaleString().padStart(10)} VND`
      );
    });
    console.log();

    // Step 3: Sector Analysis
    console.log("🏢 SECTOR ANALYSIS (MA20 Momentum)");
    console.log("─".repeat(60));

    const sectorAnalysis = await client.getMAScoresBySector({
      ma_period: MAPeriod.MA20,
      top_per_sector: 3,
    });

    const topSectors = sectorAnalysis.data.sectors
      .sort((a, b) => b.average_score - a.average_score)
      .slice(0, 5);

    topSectors.forEach((sector) => {
      console.log(
        `\n${sector.sector_name} (Avg: ${sector.average_score >= 0 ? "+" : ""}${sector.average_score.toFixed(2)}%)`
      );
      console.log(
        `   Stocks: ${sector.total_stocks} | Above MA20: ${sector.stocks_above_threshold}`
      );

      sector.top_stocks.slice(0, 3).forEach((stock) => {
        console.log(
          `   • ${stock.symbol.padEnd(6)} ${stock.ma_score >= 0 ? "+" : ""}${stock.ma_score.toFixed(2)}%  ` +
            `${stock.close.toLocaleString().padStart(10)} VND`
        );
      });
    });
    console.log();

    // Step 4: Banking Sector Analysis
    console.log("🏦 BANKING SECTOR (NGAN_HANG) ANALYSIS");
    console.log("─".repeat(60));

    const groups = await client.getTickerGroups();
    const bankingTickers = groups["NGAN_HANG"] || [];

    if (bankingTickers.length > 0) {
      const bankingData = await client.getTickers({
        symbol: bankingTickers,
        limit: 1,
      });

      // Calculate banking sector statistics
      let totalValue = 0;
      let gainers = 0;
      let losers = 0;
      let unchanged = 0;

      for (const ticker of bankingTickers) {
        const data = bankingData[ticker];
        if (data && data.length > 0) {
          const stock = data[0];
          totalValue += stock.close * stock.volume;

          if (stock.close_changed) {
            if (stock.close_changed > 0) gainers++;
            else if (stock.close_changed < 0) losers++;
            else unchanged++;
          }
        }
      }

      console.log(`Banking Stocks:    ${bankingTickers.length}`);
      console.log(`Gainers:           ${gainers} (${((gainers / bankingTickers.length) * 100).toFixed(1)}%)`);
      console.log(`Losers:            ${losers} (${((losers / bankingTickers.length) * 100).toFixed(1)}%)`);
      console.log(`Unchanged:         ${unchanged}`);
      console.log(`Total Value:       ${(totalValue / 1_000_000_000).toFixed(2)}B VND`);
    }
    console.log();

    // Step 5: Momentum Analysis (MA Scores)
    console.log("💫 MOMENTUM ANALYSIS");
    console.log("─".repeat(60));

    const [ma20Leaders, ma50Leaders, ma200Leaders] = await Promise.all([
      client.getTopPerformers({ sort_by: SortMetric.MA20Score, limit: 5 }),
      client.getTopPerformers({ sort_by: SortMetric.MA50Score, limit: 5 }),
      client.getTopPerformers({ sort_by: SortMetric.MA200Score, limit: 5 }),
    ]);

    console.log("\n🔥 MA20 Leaders (Short-term Momentum):");
    ma20Leaders.data.performers.slice(0, 3).forEach((stock, i) => {
      console.log(
        `   ${i + 1}. ${stock.symbol.padEnd(6)} ` +
          `Score: ${stock.ma20_score?.toFixed(2)}%`
      );
    });

    console.log("\n⚡ MA50 Leaders (Medium-term Trend):");
    ma50Leaders.data.performers.slice(0, 3).forEach((stock, i) => {
      console.log(
        `   ${i + 1}. ${stock.symbol.padEnd(6)} ` +
          `Score: ${stock.ma50_score?.toFixed(2)}%`
      );
    });

    console.log("\n🌟 MA200 Leaders (Long-term Trend):");
    ma200Leaders.data.performers.slice(0, 3).forEach((stock, i) => {
      console.log(
        `   ${i + 1}. ${stock.symbol.padEnd(6)} ` +
          `Score: ${stock.ma200_score?.toFixed(2)}%`
      );
    });
    console.log();

    // Step 6: Market Breadth
    console.log("📊 MARKET BREADTH");
    console.log("─".repeat(60));

    const allPerformers = await client.getTopPerformers({
      limit: 100,
    });

    const above2Percent = allPerformers.data.performers.filter(
      (s) => (s.close_changed ?? 0) >= 2
    ).length;
    const above1Percent = allPerformers.data.performers.filter(
      (s) => (s.close_changed ?? 0) >= 1
    ).length;
    const below1Percent = allPerformers.data.performers.filter(
      (s) => (s.close_changed ?? 0) <= -1
    ).length;
    const below2Percent = allPerformers.data.performers.filter(
      (s) => (s.close_changed ?? 0) <= -2
    ).length;

    console.log(`Stocks +2% or more:   ${above2Percent}`);
    console.log(`Stocks +1% or more:   ${above1Percent}`);
    console.log(`Stocks -1% or less:   ${below1Percent}`);
    console.log(`Stocks -2% or less:   ${below2Percent}`);

    const bullishRatio =
      (above1Percent / (above1Percent + below1Percent)) * 100;
    console.log(`\nMarket Sentiment:     ${bullishRatio.toFixed(1)}% Bullish`);
    console.log();

    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║              END OF MARKET ANALYSIS                      ║");
    console.log("╚══════════════════════════════════════════════════════════╝");
    console.log();

    console.log("✅ Dashboard analysis completed successfully!");
    console.log(
      `\n💡 Analysis Date: ${topGainers.analysis_date}`
    );
    console.log(
      `⏰ Generated at: ${new Date().toLocaleString()}`
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
