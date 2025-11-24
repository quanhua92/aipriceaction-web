import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { useNote } from '@/contexts/NoteContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { uploadMarkdown } from '@/lib/api-client'
import { saveNote } from '@/lib/note-storage'

export const Route = createFileRoute('/notes/new')({
	component: NewNotePage,
})

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	// Fallback for older browsers
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0
		const v = c === 'x' ? r : (r & 0x3) | 0x8
		return v.toString(16)
	})
}

function NewNotePage() {
	const navigate = useNavigate()
	const { refreshNotes } = useNote()
	const { info, error: logError } = useLogs()
	const { t } = useTranslation()

	const [content, setContent] = React.useState('')
	const [uploading, setUploading] = React.useState(false)

	const handlePublish = async () => {
		if (!content.trim()) {
			logError('Notes', t('common.notes.emptyContent'))
			return
		}

		setUploading(true)

		try {
			// Generate UUID and secret
			const sessionId = generateUUID()
			const secret = generateUUID()

			info('Notes', `Uploading note ${sessionId.slice(0, 8)}...`)

			// Upload to API
			await uploadMarkdown(sessionId, secret, content)

			// Save to localStorage
			saveNote({
				id: sessionId,
				secret,
				createdAt: new Date().toISOString(),
			})

			// Refresh notes list
			refreshNotes()

			info('Notes', `Note ${sessionId.slice(0, 8)} published successfully`)

			// Redirect to note view
			navigate({ to: '/note/$id', params: { id: sessionId } })
		} catch (err) {
			console.error('Upload failed:', err)
			logError(
				'Notes',
				`${t('common.notes.publishFailed')}: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
		} finally {
			setUploading(false)
		}
	}

	return (
		<div>
			{/* Header */}
			<div className="p-4 md:p-6 pb-3">
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-3">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: '/notes' })}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							{t('common.back')}
						</Button>
						<h1 className="text-2xl font-bold">{t('common.notes.newNote')}</h1>
					</div>
					<Button
						onClick={handlePublish}
						disabled={uploading || !content.trim()}
						className="flex items-center gap-2"
					>
						<Send className="h-4 w-4" />
						{uploading ? t('common.notes.publishing') : t('common.notes.publish')}
					</Button>
				</div>
				<p className="text-sm text-muted-foreground">
					{t('common.notes.editorDescription')}
				</p>
			</div>

			{/* Editor */}
			<div className="p-4 md:p-6 border-t">
				<textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder={t('common.notes.editorPlaceholder')}
					className="w-full h-[calc(100vh-16rem)] p-4 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
					disabled={uploading}
				/>
			</div>
		</div>
	)
}
