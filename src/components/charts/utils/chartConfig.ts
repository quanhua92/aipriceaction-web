import { LineSeries } from "lightweight-charts";

export const MA_CONFIG = [
  { key: 'ma10', color: '#dc2626' },
  { key: 'ma20', color: '#16a34a' },
  { key: 'ma50', color: '#2563eb' },
  { key: 'ma100', color: '#a1a1aa' },
  { key: 'ma200', color: '#71717a' },
] as const;

export const MA_SERIES_OPTIONS = {
  lineWidth: 1,
  crosshairMarkerVisible: false,
  lastValueVisible: false,
  priceLineVisible: false,
} as const;

export type MAKey = typeof MA_CONFIG[number]['key'];
export type MAConfig = typeof MA_CONFIG[number];