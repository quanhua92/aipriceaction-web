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
  quickAddAlert: {
    title: 'Add Price Alert',
    ticker: 'Ticker',
    currentPrice: 'Current Price',
    targetPrice: 'Target Price',
    alertType: 'Alert Type',
    distance: 'Distance',
    triggerMessage: 'Alert triggers at',
    save: 'Save Alert',
    cancel: 'Cancel',
    tabs: {
      details: 'Alert Details',
      existing: 'Existing Alerts',
    },
    note: {
      label: 'Note (optional)',
      placeholder: 'Add a note for this alert...',
    },
    existingAlerts: {
      empty: 'No existing alerts for this ticker',
      active: 'Active',
      triggered: 'Triggered',
    },
    validation: {
      required: 'Target price is required',
      positive: 'Target price must be greater than 0',
    },
  },
  editAlert: {
    title: 'Edit Alert',
    created: 'Created',
    status: 'Status',
    deleteConfirm: 'Are you sure? This cannot be undone.',
  },
}
