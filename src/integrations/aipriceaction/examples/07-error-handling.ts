/**
 * Example 07: Error Handling Patterns
 *
 * Demonstrates proper error handling with custom error types,
 * retry logic, and graceful degradation.
 *
 * Run: pnpx tsx examples/07-error-handling.ts
 */

import {
  AIPriceActionClient,
  APIError,
  NetworkError,
  ValidationError,
  RateLimitError,
} from "../src/index.js";

async function main() {
  const client = new AIPriceActionClient({
    baseURL: process.env.API_URL || "http://localhost:3000",
    timeout: 10000, // 10 second timeout
    retry: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
    },
    debug: true, // Enable debug logging to see retries
  });

  console.log("=== Example 07: Error Handling ===\n");

  // Example 1: Validation errors (client-side)
  console.log("1️⃣  Testing validation errors:");
  try {
    await client.getTickers({
      symbol: "VCB",
      start_date: "invalid-date", // Invalid date format
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`   ✅ Caught ValidationError: ${error.message}`);
      console.log(`   Field: ${error.field}`);
    } else {
      console.log(`   ❌ Unexpected error type: ${error}`);
    }
  }
  console.log();

  // Example 2: Invalid MA period
  console.log("2️⃣  Testing invalid MA period:");
  try {
    await client.getMAScoresBySector({
      ma_period: 999, // Invalid period
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`   ✅ Caught ValidationError: ${error.message}`);
    } else {
      console.log(`   ❌ Unexpected error type: ${error}`);
    }
  }
  console.log();

  // Example 3: Network errors (wrong URL)
  console.log("3️⃣  Testing network errors:");
  const wrongClient = new AIPriceActionClient({
    baseURL: "http://localhost:9999", // Wrong port
    timeout: 2000,
    retry: {
      maxRetries: 1, // Fewer retries for demo
      initialDelay: 500,
      maxDelay: 1000,
      backoffMultiplier: 2,
    },
  });

  try {
    await wrongClient.getHealth();
  } catch (error) {
    if (error instanceof NetworkError) {
      console.log(`   ✅ Caught NetworkError: ${error.message}`);
      if (error.cause) {
        console.log(`   Cause: ${error.cause.message}`);
      }
    } else {
      console.log(`   Note: Error type is ${error?.constructor.name}`);
    }
  }
  console.log();

  // Example 4: API errors (invalid ticker)
  console.log("4️⃣  Testing API response with invalid data:");
  try {
    const result = await client.getTickers({
      symbol: "INVALIDTICKER123",
    });

    if (Object.keys(result).length === 0) {
      console.log("   ✅ API returned empty result for invalid ticker (graceful handling)");
    }
  } catch (error) {
    if (error instanceof APIError) {
      console.log(`   API Error (${error.statusCode}): ${error.message}`);
    } else {
      console.log(`   Error: ${error}`);
    }
  }
  console.log();

  // Example 5: Graceful error handling with fallback
  console.log("5️⃣  Graceful error handling with fallback:");

  async function getDataWithFallback(symbol: string) {
    try {
      const data = await client.getTickers({ symbol });
      return data;
    } catch (error) {
      console.log(`   ⚠️  Primary request failed: ${error instanceof Error ? error.message : error}`);

      // Try with cache=false as fallback
      try {
        console.log("   🔄 Trying with cache=false...");
        const fallbackData = await client.getTickers({
          symbol,
          cache: false,
        });
        console.log("   ✅ Fallback succeeded!");
        return fallbackData;
      } catch (fallbackError) {
        console.log(
          `   ❌ Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`
        );
        return null;
      }
    }
  }

  const result = await getDataWithFallback("VCB");
  if (result && result.VCB) {
    console.log(`   Got ${result.VCB.length} records for VCB`);
  }
  console.log();

  // Example 6: Handling multiple errors in batch
  console.log("6️⃣  Handling errors in batch operations:");

  const tickers = ["VCB", "INVALID1", "FPT", "INVALID2", "VNM"];
  const results: Array<{ ticker: string; success: boolean; data?: any; error?: string }> = [];

  for (const ticker of tickers) {
    try {
      const data = await client.getTickers({ symbol: ticker, limit: 1 });
      results.push({
        ticker,
        success: true,
        data: data[ticker]?.[0],
      });
    } catch (error) {
      results.push({
        ticker,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log("   Results:");
  results.forEach((result) => {
    if (result.success) {
      console.log(`   ✅ ${result.ticker}: ${result.data ? "OK" : "No data"}`);
    } else {
      console.log(`   ❌ ${result.ticker}: ${result.error}`);
    }
  });
  console.log();

  // Example 7: Custom error handler
  console.log("7️⃣  Custom error handler function:");

  async function safeAPICall<T>(
    fn: () => Promise<T>,
    defaultValue: T
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ValidationError) {
        console.log(`   🔴 Validation: ${error.message}`);
      } else if (error instanceof NetworkError) {
        console.log(`   🔴 Network: ${error.message}`);
      } else if (error instanceof RateLimitError) {
        console.log(`   🔴 Rate Limited: ${error.message}`);
        if (error.retryAfter) {
          console.log(`   Retry after: ${error.retryAfter}s`);
        }
      } else if (error instanceof APIError) {
        console.log(`   🔴 API Error (${error.statusCode}): ${error.message}`);
      } else {
        console.log(`   🔴 Unknown Error: ${error}`);
      }

      console.log(`   Using default value instead`);
      return defaultValue;
    }
  }

  const health = await safeAPICall(
    () => client.getHealth(),
    { active_tickers_count: 0 } as any
  );

  console.log(`   Active tickers: ${health.active_tickers_count}`);
  console.log();

  console.log("✅ Error handling examples completed!");
  console.log("\n💡 Best Practices:");
  console.log("   • Always catch specific error types");
  console.log("   • Provide fallback values or retry logic");
  console.log("   • Log errors appropriately for debugging");
  console.log("   • Handle batch operations gracefully");
  console.log("   • Use custom error handlers for common patterns");
}

main();
