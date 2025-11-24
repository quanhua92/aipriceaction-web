import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useNote } from '@/contexts/NoteContext'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { fetchMarkdown, deleteSession } from '@/lib/api-client'
import { getNoteById, deleteNoteById } from '@/lib/note-storage'

export const Route = createFileRoute('/note/$id')({
	// Server-side data loading
	loader: async ({ params }) => {
		try {
			const content = await fetchMarkdown(params.id)
			return { content, error: null }
		} catch (error) {
			return {
				content: null,
				error: error instanceof Error ? error.message : 'Failed to load note',
			}
		}
	},

	// Dynamic meta tags for SSR
	head: ({ loaderData }) => {
		// Extract title from first H1 heading
		const h1Match = loaderData?.content?.match(/^#\s+(.+)$/m)
		const title = h1Match ? h1Match[1].trim() : 'Markdown Note'

		// Extract description from first paragraph (skip headings)
		const lines = loaderData?.content?.split('\n') || []
		let description = ''
		for (const line of lines) {
			const trimmed = line.trim()
			// Skip empty lines and headings
			if (!trimmed || trimmed.startsWith('#')) continue
			// Clean markdown formatting
			const cleaned = trimmed
				.replace(/[*_~`]/g, '') // Remove markdown formatting
				.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
				.substring(0, 160) // Limit length
			if (cleaned) {
				description = cleaned
				break
			}
		}

		if (!description) {
			description = 'View markdown note on AIPriceAction'
		}

		return {
			meta: [
				{ title: `${title} | AIPriceAction` },
				{ property: 'og:title', content: title },
				{ property: 'og:type', content: 'article' },
				{ name: 'description', content: description },
				{ property: 'og:description', content: description },
			],
		}
	},

	component: NoteReadPage,
})

function NoteReadPage() {
	const { id } = Route.useParams()
	const loaderData = Route.useLoaderData()
	const navigate = useNavigate()
	const { refreshNotes } = useNote()
	const { info, error: logError } = useLogs()
	const { t } = useTranslation()

	// Check if user has secret for this note (client-side only)
	const [canDelete, setCanDelete] = React.useState(false)
	const [deleting, setDeleting] = React.useState(false)

	React.useEffect(() => {
		if (typeof window !== 'undefined') {
			const note = getNoteById(id)
			setCanDelete(!!note)
		}
	}, [id])

	const handleDelete = async () => {
		if (!confirm(t('common.notes.deleteConfirm'))) return

		setDeleting(true)

		try {
			const note = getNoteById(id)
			if (!note) {
				throw new Error('Note not found in local storage')
			}

			// Delete entire session from API (requires secret)
			const result = await deleteSession(id, note.secret)

			// Remove from localStorage
			deleteNoteById(id)
			refreshNotes()

			info(
				'Notes',
				`Deleted session ${id.slice(0, 8)} (${result.files_deleted.markdown} markdown, ${result.files_deleted.images} images)`
			)
			navigate({ to: '/notes' })
		} catch (err) {
			console.error('Delete failed:', err)
			logError(
				'Notes',
				`${t('common.notes.deleteFailed')}: ${err instanceof Error ? err.message : 'Unknown error'}`
			)
			setDeleting(false)
		}
	}

	// Error state
	if (loaderData.error || !loaderData.content) {
		return (
			<div>
				<div className="p-4 md:p-6 pb-3">
					<div className="flex items-center gap-3 mb-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: '/notes' })}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="h-4 w-4" />
							{t('common.notes.backToNotes')}
						</Button>
					</div>
					<div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-muted/30">
						<h2 className="text-xl font-bold mb-2">{t('common.notes.noteNotFound')}</h2>
						<p className="text-muted-foreground mb-4">{loaderData.error}</p>
						<Button onClick={() => navigate({ to: '/notes' })}>{t('common.notes.goToNotes')}</Button>
					</div>
				</div>
			</div>
		)
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
						<code className="text-sm font-mono text-muted-foreground">
							{id.slice(0, 8)}...
						</code>
					</div>
					{canDelete && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleDelete}
							disabled={deleting}
							className="flex items-center gap-2 text-destructive hover:text-destructive"
						>
							<Trash2 className="h-4 w-4" />
							{deleting ? t('common.notes.deleting') : t('common.delete')}
						</Button>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="p-4 md:p-6 border-t">
				<div className="max-w-4xl mx-auto">
					<article className="prose prose-slate dark:prose-invert max-w-none">
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							components={{
								table: ({ node, ...props }) => (
									<div className="overflow-x-auto">
										<table {...props} />
									</div>
								),
							}}
						>
							{loaderData.content}
						</ReactMarkdown>
					</article>
				</div>
			</div>
		</div>
	)
}
