import { createFileRoute, Link } from '@tanstack/react-router'
import * as React from 'react'
import { Download, Upload, Plus, Trash2, ExternalLink } from 'lucide-react'
import { useNote } from '@/contexts/NoteContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { NOTES_STORAGE_KEY } from '@/lib/constants'
import { SafeLocalStorage } from '@/lib/localStorage'
import { getNotes, deleteNoteById, type Note } from '@/lib/note-storage'
import { parseUTCISOString, formatToVietnamTime } from '@/lib/format'
import { deleteSession } from '@/lib/api-client'

export const Route = createFileRoute('/notes/')({
	component: NotesPage,
})

function NotesPage() {
	const { notes, refreshNotes } = useNote()
	const { info, error: logError } = useLogs()
	const { t } = useTranslation()
	const fileInputRef = React.useRef<HTMLInputElement>(null)

	// Export notes to JSON file
	const handleExport = () => {
		try {
			const allNotes = getNotes()
			const dataStr = JSON.stringify(allNotes, null, 2)
			const dataBlob = new Blob([dataStr], { type: 'application/json' })

			const url = URL.createObjectURL(dataBlob)
			const link = document.createElement('a')
			link.href = url
			const now = new Date()
			const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
			link.download = `notes-${timestamp}.json`

			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			info('Notes', t('common.notes.exported').replace('{count}', String(allNotes.length)))
		} catch (err) {
			console.error('Export failed:', err)
			logError('Notes', t('common.notes.exportFailed'))
		}
	}

	// Import notes from JSON file
	const handleImport = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const importedNotes = JSON.parse(text) as Note[]

			// Validate structure
			if (!Array.isArray(importedNotes)) {
				throw new Error(t('common.notes.invalidFileFormat'))
			}

			// Get existing notes
			const existingNotes = getNotes()
			const importedIds = new Set(importedNotes.map((n) => n.id))
			const existingIds = new Set(existingNotes.map((n) => n.id))

			// Track new vs overwritten counts
			const overwrittenCount = importedNotes.filter((note) =>
				existingIds.has(note.id)
			).length
			const newCount = importedNotes.length - overwrittenCount

			// Filter out existing notes that will be overwritten
			const nonDuplicateExisting = existingNotes.filter(
				(note) => !importedIds.has(note.id)
			)

			// Merge with all imported notes (includes both new and overwrites)
			const merged = [...nonDuplicateExisting, ...importedNotes]
			SafeLocalStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(merged))

			// Refresh UI
			refreshNotes()

			info(
				'Notes',
				t('common.notes.imported')
					.replace('{count}', String(importedNotes.length))
					.replace('{newCount}', String(newCount))
					.replace('{overwrittenCount}', String(overwrittenCount))
			)
		} catch (err) {
			console.error('Import failed:', err)
			logError(
				'Notes',
				`${t('common.notes.importFailed')}: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		} finally {
			// Reset file input
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
		}
	}

	// Delete a note
	const handleDelete = async (note: Note) => {
		if (!confirm(t('common.notes.deleteSessionConfirm').replace('{id}', note.id.slice(0, 8)))) return

		try {
			// Delete entire session from API
			const result = await deleteSession(note.id, note.secret)

			// Remove from localStorage
			deleteNoteById(note.id)
			refreshNotes()

			info(
				'Notes',
				`Deleted session ${note.id.slice(0, 8)} (${result.files_deleted.markdown} markdown, ${result.files_deleted.images} images)`
			)
		} catch (err) {
			console.error('Delete failed:', err)
			logError(
				'Notes',
				`${t('common.notes.deleteFailed')}: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		}
	}

	return (
		<div>
			{/* Header */}
			<div className="p-4 md:p-6 pb-3">
				<div className="flex items-center justify-between mb-2">
					<h1 className="text-2xl font-bold">{t('common.notes.title')}</h1>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							className="flex items-center gap-2"
						>
							<Download className="h-4 w-4" />
							{t('common.notes.export')}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleImport}
							className="flex items-center gap-2"
						>
							<Upload className="h-4 w-4" />
							{t('common.notes.import')}
						</Button>
					</div>
				</div>
				<p className="text-sm text-muted-foreground">
					{t('common.notes.description')}
				</p>
				{/* Hidden file input */}
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					onChange={handleFileChange}
					className="hidden"
				/>
			</div>

			{/* Notes List */}
			<div className="p-4 md:p-6 border-t">
				{/* New Note Card - Always visible at top */}
				<Link to="/notes/new">
					<div className="p-4 border-2 border-dashed border-primary/50 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer mb-6">
						<div className="flex items-center gap-3 text-primary">
							<Plus className="h-5 w-5" />
							<span className="font-medium">{t('common.notes.createNew')}</span>
						</div>
					</div>
				</Link>

				{/* Divider */}
				{notes.length > 0 && <div className="border-t mb-6" />}

				{notes.length === 0 ? (
					<div className="flex flex-col items-center justify-center p-12 text-center">
						<p className="text-lg text-muted-foreground">{t('common.notes.noNotesYet')}</p>
						<p className="text-sm text-muted-foreground mt-2">
							{t('common.notes.noNotesDescription')}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{notes.map((note) => (
							<div
								key={note.id}
								className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow"
							>
								<div className="flex items-start justify-between mb-3">
									<div className="flex-1">
										<code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded break-all">
											{note.id}
										</code>
										<p className="text-xs text-muted-foreground mt-2">
											{formatToVietnamTime(parseUTCISOString(note.createdAt))}
										</p>
									</div>
								</div>
								<div className="flex gap-2">
									<Link to="/note/$id" params={{ id: note.id }} className="flex-1">
										<Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
											<ExternalLink className="h-4 w-4" />
											{t('common.notes.view')}
										</Button>
									</Link>
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleDelete(note)}
										className="flex items-center gap-2 text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
