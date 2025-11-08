/**
 * Example 08: Batch Requests and Performance Optimization
 *
 * Demonstrates efficient batch processing, parallel requests,
 * and performance optimization techniques.
 *
 * Run: pnpx tsx examples/08-batch-requests.ts
 */

import { AIPriceActionClient, Interval } from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
  });

  console.log("=== Example 08: Batch Requests & Performance ===\n");

  try {
    // Example 1: Single request for multiple tickers (RECOMMENDED)
    console.log("1️⃣  Single request with multiple tickers (most efficient):");
    const startTime1 = Date.now();

    const multiData = await client.getTickers({
      symbol: ["VCB", "FPT", "VNM", "HPG", "VIC", "MWG"],
    });

    const duration1 = Date.now() - startTime1;
    console.log(`   ✅ Fetched ${Object.keys(multiData).length} tickers in ${duration1}ms`);
    console.log();

    // Example 2: Parallel requests (when you need different parameters)
    console.log("2️⃣  Parallel requests with Promise.all:");
    const startTime2 = Date.now();

    const [vcbDaily, fptHourly, vnmMinute] = await Promise.all([
      client.getTickers({ symbol: "VCB", interval: Interval.Daily, limit: 5 }),
      client.getTickers({ symbol: "FPT", interval: Interval.Hourly, limit: 5 }),
      client.getTickers({ symbol: "VNM", interval: Interval.Minute, limit: 5 }),
    ]);

    const duration2 = Date.now() - startTime2;
    console.log(`   ✅ Fetched 3 different intervals in ${duration2}ms (parallel)`);
    console.log(`      VCB Daily: ${vcbDaily.VCB?.length || 0} records`);
    console.log(`      FPT Hourly: ${fptHourly.FPT?.length || 0} records`);
    console.log(`      VNM Minute: ${vnmMinute.VNM?.length || 0} records`);
    console.log();

    // Example 3: Batch with concurrency limit
    console.log("3️⃣  Batch processing with concurrency control:");

    const tickers = [
      "VCB", "FPT", "VNM", "HPG", "VIC", "MWG",
      "TCB", "BID", "CTG", "VHM", "GAS", "PLX"
    ];

    async function batchWithConcurrency<T, R>(
      items: T[],
      processor: (item: T) => Promise<R>,
      concurrency: number
    ): Promise<R[]> {
      const results: R[] = [];
      const queue = [...items];

      async function processNext(): Promise<void> {
        while (queue.length > 0) {
          const item = queue.shift();
          if (item) {
            const result = await processor(item);
            results.push(result);
          }
        }
      }

      const workers = Array(Math.min(concurrency, items.length))
        .fill(null)
        .map(() => processNext());

      await Promise.all(workers);
      return results;
    }

    const startTime3 = Date.now();

    const batchResults = await batchWithConcurrency(
      tickers,
      async (ticker) => {
        const data = await client.getTickers({ symbol: ticker, limit: 1 });
        return { ticker, data: data[ticker]?.[0] };
      },
      3 // Max 3 concurrent requests
    );

    const duration3 = Date.now() - startTime3;
    console.log(
      `   ✅ Processed ${batchResults.length} tickers with concurrency=3 in ${duration3}ms`
    );
    console.log();

    // Example 4: Fetching multiple analysis endpoints in parallel
    console.log("4️⃣  Parallel analysis requests:");
    const startTime4 = Date.now();

    const [topPerformers, maScores, health, groups] = await Promise.all([
      client.getTopPerformers({ limit: 10 }),
      client.getMAScoresBySector({ ma_period: 20 }),
      client.getHealth(),
      client.getTickerGroups(),
    ]);

    const duration4 = Date.now() - startTime4;
    console.log(`   ✅ Fetched 4 endpoints in ${duration4}ms (parallel)`);
    console.log(`      Top Performers: ${topPerformers.data.performers.length}`);
    console.log(`      MA Sectors: ${maScores.data.sectors.length}`);
    console.log(`      Health: OK (${health.active_tickers_count} tickers)`);
    console.log(`      Groups: ${Object.keys(groups).length}`);
    console.log();

    // Example 5: Smart caching - reusing data
    console.log("5️⃣  Smart caching demonstration:");

    // First request (cache miss)
    const cacheStart1 = Date.now();
    await client.getTickers({ symbol: "VCB", cache: true });
    const cacheDuration1 = Date.now() - cacheStart1;

    // Second request (cache hit - should be faster)
    const cacheStart2 = Date.now();
    await client.getTickers({ symbol: "VCB", cache: true });
    const cacheDuration2 = Date.now() - cacheStart2;

    console.log(`   First request (cache miss): ${cacheDuration1}ms`);
    console.log(`   Second request (cache hit): ${cacheDuration2}ms`);
    console.log(
      `   Speed improvement: ${((cacheDuration1 / cacheDuration2) * 100 - 100).toFixed(0)}%`
    );
    console.log();

    // Example 6: Efficient sector-wide analysis
    console.log("6️⃣  Efficient sector-wide data fetching:");

    const bankingTickers = groups["NGAN_HANG"]?.slice(0, 10) || [];

    if (bankingTickers.length > 0) {
      const sectorStart = Date.now();

      // Efficient: Single request with all tickers
      const sectorData = await client.getTickers({
        symbol: bankingTickers,
        limit: 1,
      });

      const sectorDuration = Date.now() - sectorStart;

      console.log(`   ✅ Fetched ${bankingTickers.length} banking sector tickers in ${sectorDuration}ms`);
      console.log(`   Average: ${(sectorDuration / bankingTickers.length).toFixed(2)}ms per ticker`);
    }
    console.log();

    console.log("✅ Batch processing examples completed!");
    console.log("\n💡 Performance Tips:");
    console.log("   • Use single request with multiple symbols when possible");
    console.log("   • Use Promise.all for different endpoints");
    console.log("   • Implement concurrency limits for many requests");
    console.log("   • Leverage cache for repeated queries");
    console.log("   • Batch similar requests together");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
