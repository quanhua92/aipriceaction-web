/**
 * Example 02: Health Check and Server Statistics
 *
 * Demonstrates using the getHealth() method to monitor server status
 * and retrieve system statistics.
 *
 * Run: pnpx tsx examples/02-health-check.ts
 */

import { AIPriceActionClient } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 02: Health Check & Statistics ===\n");

  try {
    const health = await client.getHealth();

    // Server Status
    console.log("🏥 Server Status:");
    console.log(`   Uptime: ${Math.floor(health.uptime_secs / 60)} minutes`);
    console.log(`   Trading Hours: ${health.is_trading_hours ? "✅ Yes" : "❌ No"}`);
    console.log(`   Timezone: ${health.trading_hours_timezone}`);
    console.log();

    // Memory Statistics
    console.log("💾 Memory Usage:");
    console.log(
      `   Current: ${health.memory_usage_mb.toFixed(2)} MB / ${health.memory_limit_mb} MB`
    );
    console.log(`   Usage: ${health.memory_usage_percent.toFixed(2)}%`);
    console.log();

    // Disk Cache Statistics
    console.log("📦 Disk Cache:");
    console.log(`   Entries: ${health.disk_cache_entries}`);
    console.log(
      `   Size: ${health.disk_cache_size_mb.toFixed(2)} MB / ${health.disk_cache_limit_mb} MB`
    );
    console.log(`   Usage: ${health.disk_cache_usage_percent.toFixed(2)}%`);
    console.log();

    // Ticker Statistics
    console.log("📊 Data Statistics:");
    console.log(`   Total Tickers: ${health.total_tickers_count}`);
    console.log(`   Active Tickers: ${health.active_tickers_count}`);
    console.log(
      `   Daily Records: ${health.daily_records_count.toLocaleString()}`
    );
    console.log(
      `   Hourly Records: ${health.hourly_records_count.toLocaleString()}`
    );
    console.log(
      `   Minute Records: ${health.minute_records_count.toLocaleString()}`
    );
    console.log();

    // Worker Statistics
    console.log("🔄 Background Workers:");
    console.log(
      `   Daily Sync: ${health.daily_last_sync || "Not synced yet"}`
    );
    console.log(
      `   Hourly Sync: ${health.hourly_last_sync || "Not synced yet"}`
    );
    console.log(
      `   Minute Sync: ${health.minute_last_sync || "Not synced yet"}`
    );
    console.log(`   Daily Iterations: ${health.daily_iteration_count}`);
    console.log(`   Slow Iterations: ${health.slow_iteration_count}`);
    console.log();

    // System Time
    console.log("⏰ System Time:");
    console.log(`   ${health.current_system_time}`);
    console.log();

    console.log("✅ Health check completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
