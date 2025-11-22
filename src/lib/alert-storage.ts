import { ALERTS_STORAGE_KEY } from './constants'

export interface Alert {
  id: string
  ticker: string
  created_at: string
  target_price: number
  alert_type: 'price_hits'
  triggered: boolean
  triggered_at?: string
  note?: string
}

/**
 * Get all alerts from localStorage
 */
export function getAlerts(): Alert[] {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as Alert[]
  } catch (error) {
    console.error('Failed to get alerts from localStorage:', error)
    return []
  }
}

/**
 * Generate a unique ID (fallback for environments without crypto.randomUUID)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random number
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Add a new alert
 */
export function addAlert(
  alert: Omit<Alert, 'id' | 'created_at' | 'triggered'>
): Alert {
  const newAlert: Alert = {
    ...alert,
    id: generateId(),
    created_at: new Date().toISOString(),
    triggered: false,
  }

  const alerts = getAlerts()
  alerts.push(newAlert)

  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts))
    return newAlert
  } catch (error) {
    console.error('Failed to add alert to localStorage:', error)
    throw error
  }
}

/**
 * Update an existing alert
 */
export function updateAlert(id: string, updates: Partial<Alert>): void {
  const alerts = getAlerts()
  const index = alerts.findIndex((a) => a.id === id)

  if (index === -1) {
    throw new Error(`Alert with id ${id} not found`)
  }

  alerts[index] = { ...alerts[index], ...updates }

  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts))
  } catch (error) {
    console.error('Failed to update alert in localStorage:', error)
    throw error
  }
}

/**
 * Delete an alert
 */
export function deleteAlert(id: string): void {
  const alerts = getAlerts()
  const filtered = alerts.filter((a) => a.id !== id)

  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete alert from localStorage:', error)
    throw error
  }
}

/**
 * Get alerts for a specific ticker
 */
export function getAlertsByTicker(ticker: string): Alert[] {
  const alerts = getAlerts()
  return alerts.filter((a) => a.ticker === ticker)
}

/**
 * Get only active (non-triggered) alerts
 */
export function getActiveAlerts(): Alert[] {
  const alerts = getAlerts()
  return alerts.filter((a) => !a.triggered)
}

/**
 * Get only triggered alerts
 */
export function getTriggeredAlerts(): Alert[] {
  const alerts = getAlerts()
  return alerts.filter((a) => a.triggered)
}
