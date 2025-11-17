export default {
  selectTicker: {
    title: 'Select Ticker Symbol',
    searchPlaceholder: 'Search by symbol...',
    filters: {
      all: 'All',
      stocks: 'Stocks',
      crypto: 'Crypto',
    },
    sortBy: {
      volume: 'Volume',
      gainers: '↑ Gainers',
      losers: '↓ Losers',
      ma20: 'MA20 Score',
      ma50: 'MA50 Score',
      az: 'A-Z',
    },
    sections: {
      marketIndices: 'Market Indices',
      stocks: 'Stocks',
      crypto: 'Cryptocurrencies',
      majorCrypto: 'Major Crypto',
    },
    labels: {
      marketIndex: 'Market Index',
      volume: 'Vol',
    },
    states: {
      loading: 'Loading...',
      error: 'An error occurred',
      noTickersFound: 'No tickers found',
    },
  },
}
