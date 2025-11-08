# Examples

Complete working examples for the AIPriceAction TypeScript SDK.

## Prerequisites

Make sure the AIPriceAction API server is running:

```bash
# In the main project directory
cargo run -- serve --port 3000

# Or using Docker
docker compose -f docker-compose.local.yml up -d
```

## Running Examples

All examples can be run directly with `pnpx tsx`:

```bash
# From the sdk/aipriceaction-js directory
pnpm install

# Run individual examples
pnpx tsx examples/01-basic-tickers.ts
pnpx tsx examples/02-health-check.ts
pnpx tsx examples/03-ticker-groups.ts

# Or use npm scripts
pnpm run example:basic
pnpm run example:health
pnpm run example:all
```

## Environment Variables

Set the API URL via environment variable:

```bash
export API_URL=http://localhost:3000
pnpx tsx examples/01-basic-tickers.ts
```

## Examples List

### Basic Examples

1. **01-basic-tickers.ts** - Basic usage of getTickers()
   - Single ticker
   - Multiple tickers
   - Historical data
   - Limit parameter

2. **02-health-check.ts** - Server health and statistics
   - Health endpoint
   - Memory usage
   - Cache statistics

3. **03-ticker-groups.ts** - Ticker group mappings
   - Get all groups
   - Filter by specific group
   - List group members

4. **04-top-performers.ts** - Top/bottom performers
   - Top performers by percentage
   - Bottom performers
   - Filter by sector
   - Sort by different metrics

5. **05-ma-scores.ts** - MA scores by sector
   - MA20 scores
   - MA50 scores
   - Filter by threshold
   - Sector analysis

6. **06-csv-export.ts** - CSV format handling
   - Export to CSV
   - Save to file
   - Parse CSV data

### Advanced Examples

7. **07-error-handling.ts** - Error handling patterns
   - Network errors
   - Validation errors
   - API errors
   - Retry logic

8. **08-batch-requests.ts** - Parallel API calls
   - Fetch multiple tickers
   - Concurrent requests
   - Performance optimization

9. **09-analysis-dashboard.ts** - Real-world workflow
   - Market overview
   - Sector analysis
   - Top performers
   - Combined metrics

## Notes

- All examples use environment variables for configuration
- Examples are self-contained with inline documentation
- Output includes formatted console display
- Error handling is demonstrated in each example
