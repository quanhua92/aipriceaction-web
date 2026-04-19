import { uuidv7 } from 'uuidv7'

/**
 * Generate a UUID v7 string.
 * UUID v7 is time-ordered (timestamp prefix) which makes it sortable by creation time.
 */
export function generateUUIDv7(): string {
	return uuidv7()
}
