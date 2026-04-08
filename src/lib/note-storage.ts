import { NOTES_STORAGE_KEY } from './constants'
import { SafeLocalStorage } from './localStorage'

export interface Note {
	id: string // Session UUID
	secret: string // For deletion
	createdAt: string // ISO timestamp
}

/**
 * Get all notes from localStorage
 */
export function getNotes(): Note[] {
	try {
		const stored = SafeLocalStorage.getItem(NOTES_STORAGE_KEY)
		if (!stored) return []
		return JSON.parse(stored) as Note[]
	} catch (error) {
		console.error('Failed to get notes from localStorage:', error)
		return []
	}
}

/**
 * Save a new note
 */
export function saveNote(note: Note): void {
	const notes = getNotes()
	notes.push(note)

	try {
		SafeLocalStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
	} catch (error) {
		console.error('Failed to save note to localStorage:', error)
		throw error
	}
}

/**
 * Delete a note by ID
 */
export function deleteNoteById(id: string): void {
	const notes = getNotes()
	const filtered = notes.filter((n) => n.id !== id)

	try {
		SafeLocalStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(filtered))
	} catch (error) {
		console.error('Failed to delete note from localStorage:', error)
		throw error
	}
}

/**
 * Get a note by ID
 */
export function getNoteById(id: string): Note | undefined {
	const notes = getNotes()
	return notes.find((n) => n.id === id)
}
