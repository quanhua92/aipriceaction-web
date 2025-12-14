/**
 * Safe localStorage utilities with error handling and fallbacks
 * Essential for Samsung Internet and other restrictive browsers
 */

export class SafeLocalStorage {
  private static isLocalStorageAvailable: boolean | null = null

  /**
   * Test if localStorage is available
   */
  static isAvailable(): boolean {
    if (this.isLocalStorageAvailable !== null) {
      return this.isLocalStorageAvailable
    }

    try {
      const test = '__localStorage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      this.isLocalStorageAvailable = true
      return true
    } catch (e) {
      console.warn('localStorage is not available:', e)
      this.isLocalStorageAvailable = false
      return false
    }
  }

  /**
   * Safely get an item from localStorage
   */
  static getItem(key: string): string | null {
    if (!this.isAvailable()) {
      return null
    }

    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error)
      return null
    }
  }

  /**
   * Safely set an item in localStorage
   */
  static setItem(key: string, value: string): boolean {
    if (!this.isAvailable()) {
      return false
    }

    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error)
      return false
    }
  }

  /**
   * Safely remove an item from localStorage
   */
  static removeItem(key: string): boolean {
    if (!this.isAvailable()) {
      return false
    }

    try {
      localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error)
      return false
    }
  }

  /**
   * Safely clear all localStorage
   */
  static clear(): boolean {
    if (!this.isAvailable()) {
      return false
    }

    try {
      localStorage.clear()
      return true
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
      return false
    }
  }
}

// Default in-memory fallback for when localStorage is not available
class MemoryStorage {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] || null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

export const memoryStorage = new MemoryStorage()