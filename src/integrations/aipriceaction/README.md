# aipriceaction-js

TypeScript SDK for the AIPriceAction Vietnamese Stock Market API.

## Installation

```bash
# Using pnpm (recommended)
pnpm add aipriceaction-js

# Using npm
npm install aipriceaction-js

# Using yarn
yarn add aipriceaction-js
```

## Quick Start

```typescript
import { AIPriceActionClient } from 'aipriceaction-js';

// Create client
const client = new AIPriceActionClient({
  baseURL: process.env.API_URL || 'http://localhost:3000'
});

// Get stock data
const data = await client.getTickers({ symbol: 'VCB' });
console.log(data.VCB[0]); // Latest VCB data

// Get top performers
const top = await client.getTopPerformers({ limit: 10 });
console.log(top.data.performers);

// Get health status
const health = await client.getHealth();
console.log(`Active tickers: ${health.active_tickers_count}`);
```

## Features

- ✅ **Type-safe** - Full TypeScript support with comprehensive types
- ✅ **Universal** - Works in Node.js and browser environments
- ✅ **Retry logic** - Automatic retry with exponential backoff
- ✅ **Error handling** - Custom error classes for different scenarios
- ✅ **Zero dependencies** - Uses native fetch API
- ✅ **Environment-based** - Configure via `API_URL` environment variable

## API Reference

### Client Methods

#### `getTickers(params?)`
Query stock data with optional filters.

```typescript
// Get today's data
const data = await client.getTickers({ symbol: 'VCB' });

// Multiple tickers
const data = await client.getTickers({ symbol: ['VCB', 'FPT', 'VNM'] });

// Historical data
const data = await client.getTickers({
  symbol: 'VCB',
  interval: '1D',
  start_date: '2025-01-01',
  end_date: '2025-12-31'
});

// Last 10 days
const data = await client.getTickers({
  symbol: 'VCB',
  limit: 10
});
```

#### `getTickersCSV(params?)`
Export stock data as CSV string.

```typescript
const csv = await client.getTickersCSV({ symbol: 'VCB' });
console.log(csv); // CSV formatted data
```

#### `getHealth()`
Get server health and statistics.

```typescript
const health = await client.getHealth();
console.log(health.memory_usage_mb);
console.log(health.active_tickers_count);
```

#### `getTickerGroups()`
Get ticker group mappings.

```typescript
const groups = await client.getTickerGroups();
console.log(groups.VN30); // ['VCB', 'VIC', 'VHM', ...]
console.log(groups.BANKING); // ['VCB', 'CTG', 'BID', ...]
```

#### `getTopPerformers(params?)`
Get top/bottom performing stocks.

```typescript
// Top 10 by percentage change
const top = await client.getTopPerformers({
  sort_by: 'close_changed',
  limit: 10
});

// Bottom 5 performers
const bottom = await client.getTopPerformers({
  sort_by: 'close_changed',
  direction: 'asc',
  limit: 5
});

// Filter by sector
const vn30 = await client.getTopPerformers({
  sector: 'VN30',
  sort_by: 'ma20_score'
});
```

#### `getMAScoresBySector(params?)`
Get moving average scores grouped by sector.

```typescript
// MA20 scores
const scores = await client.getMAScoresBySector({
  ma_period: 20,
  min_score: 1.0
});

// Only stocks above threshold
const filtered = await client.getMAScoresBySector({
  ma_period: 50,
  min_score: 2.0,
  above_threshold_only: true
});
```

## Configuration

```typescript
const client = new AIPriceActionClient({
  baseURL: 'http://localhost:3000',  // API URL
  timeout: 30000,                     // Request timeout (ms)
  retry: {
    maxRetries: 3,                    // Max retry attempts
    initialDelay: 1000,               // Initial delay (ms)
    maxDelay: 10000,                  // Max delay (ms)
    backoffMultiplier: 2              // Backoff multiplier
  },
  debug: false                        // Enable debug logging
});
```

## Error Handling

```typescript
import { APIError, NetworkError, ValidationError } from 'aipriceaction-js';

try {
  const data = await client.getTickers({ symbol: 'VCB' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid parameters:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else if (error instanceof APIError) {
    console.error(`API error (${error.statusCode}):`, error.message);
  }
}
```

## Examples

See the `examples/` directory for complete working examples:

- `01-basic-tickers.ts` - Basic getTickers usage
- `02-health-check.ts` - Health endpoint
- `03-ticker-groups.ts` - Ticker groups
- `04-top-performers.ts` - Top performers analysis
- `05-ma-scores.ts` - MA scores by sector
- `06-csv-export.ts` - CSV export
- `07-error-handling.ts` - Error handling patterns
- `08-batch-requests.ts` - Parallel requests
- `09-analysis-dashboard.ts` - Real-world workflow

### Running Examples

```bash
# Install dependencies
pnpm install

# Run examples with tsx
pnpx tsx examples/01-basic-tickers.ts

# Or use npm scripts
pnpm run example:basic
pnpm run example:top
pnpm run example:all
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run examples
pnpm run example examples/01-basic-tickers.ts
```

## License

MIT
