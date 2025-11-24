import * as React from 'react'
import { getNotes, type Note } from '@/lib/note-storage'

interface NoteContextValue {
	notes: Note[]
	refreshNotes: () => void
}

const NoteContext = React.createContext<NoteContextValue | undefined>(undefined)

export function NoteProvider({ children }: { children: React.ReactNode }) {
	const [notes, setNotes] = React.useState<Note[]>([])

	const refreshNotes = React.useCallback(() => {
		if (typeof window !== 'undefined') {
			const loadedNotes = getNotes()
			// Sort by creation date (newest first)
			loadedNotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			setNotes(loadedNotes)
		}
	}, [])

	// Load notes on mount (client-side only)
	React.useEffect(() => {
		refreshNotes()
	}, [refreshNotes])

	const value = React.useMemo(
		() => ({
			notes,
			refreshNotes,
		}),
		[notes, refreshNotes]
	)

	return <NoteContext.Provider value={value}>{children}</NoteContext.Provider>
}

export function useNote() {
	const context = React.useContext(NoteContext)
	if (context === undefined) {
		throw new Error('useNote must be used within a NoteProvider')
	}
	return context
}
