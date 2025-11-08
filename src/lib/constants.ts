/**
 * Market indices
 */
export const MARKET_INDICES = ['VNINDEX', 'VN30'] as const

export type MarketIndex = typeof MARKET_INDICES[number]
