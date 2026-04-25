import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	SafeLocalStorage,
} from '@/lib/localStorage'
import {
	SYNC_TOKEN_STORAGE_KEY,
	SYNC_KEY_STORAGE_KEY,
	SYNC_SECRET_STORAGE_KEY,
	SYNC_LAST_UPLOAD_KEY,
	SYNC_LAST_DOWNLOAD_KEY,
} from '@/lib/constants'
import { generateUUIDv7 } from '@/lib/uuid'
import {
	syncCreateOrUpdate,
	syncFetch,
	collectLocalSyncData,
	applySyncData,
	getApiBaseURL,
	type SyncData,
	type SyncEntry,
} from '@/lib/api-client'
import { type Alert } from '@/lib/alert-storage'
import { type ChartLine } from '@/lib/chart-lines-storage'
import { useLogs } from '@/contexts/LogsContext'
import { useTranslation } from '@/hooks/useTranslation'
import {
	Upload,
	Download,
	Unplug,
	Eye,
	EyeOff,
	RefreshCw,
	Copy,
	Check,
	Wifi,
	WifiOff,
} from 'lucide-react'

export const Route = createFileRoute('/sync')({
	component: SyncPage,
})

function SyncPage() {
	const [isMounted, setIsMounted] = React.useState(false)
	const { t } = useTranslation()

	React.useEffect(() => {
		setIsMounted(true)
	}, [])

	if (!isMounted) {
		return <div className="p-4 md:p-6 space-y-4">{t('common.loading')}</div>
	}

	return <SyncPageContent />
}

function SyncPageContent() {
	const { info, error: logError } = useLogs()
	const { t } = useTranslation()

	// Stored credentials
	const [token, setToken] = React.useState('')
	const [syncKey, setSyncKey] = React.useState('')
	const [secret, setSecret] = React.useState('')
	const [syncApiUrl, setSyncApiUrl] = React.useState('')
	const [isConnected, setIsConnected] = React.useState(false)

	// UI state
	const [showToken, setShowToken] = React.useState(false)
	const [showSecret, setShowSecret] = React.useState(false)
	const [loading, setLoading] = React.useState<string | null>(null)
	const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
	const [setupMode, setSetupMode] = React.useState<'create' | 'join'>('create')
	const [confirmUpload, setConfirmUpload] = React.useState(false)
	const [confirmApply, setConfirmApply] = React.useState<'overwrite' | 'merge' | null>(null)

	// Sync tab state
	const [serverEntry, setServerEntry] = React.useState<SyncEntry | null>(null)
	const [localData, setLocalData] = React.useState<SyncData | null>(null)
	const [copied, setCopied] = React.useState(false)
	const [lastUploadTime, setLastUploadTime] = React.useState<string | null>(null)
	const [lastDownloadTime, setLastDownloadTime] = React.useState<string | null>(null)

	// Local backup state
	const fileInputRef = React.useRef<HTMLInputElement>(null)
	const [confirmImport, setConfirmImport] = React.useState<'overwrite' | 'merge' | null>(null)
	const [pendingImportData, setPendingImportData] = React.useState<SyncData | null>(null)

	// Load stored credentials on mount
	React.useEffect(() => {
		const storedToken = SafeLocalStorage.getItem(SYNC_TOKEN_STORAGE_KEY)
		const storedKey = SafeLocalStorage.getItem(SYNC_KEY_STORAGE_KEY)
		const storedSecret = SafeLocalStorage.getItem(SYNC_SECRET_STORAGE_KEY)
		const storedUrl = SafeLocalStorage.getItem('sync_api_url')
		if (storedToken) setToken(storedToken)
		if (storedKey) setSyncKey(storedKey)
		if (storedSecret) setSecret(storedSecret)
		if (storedUrl) setSyncApiUrl(storedUrl)
		setIsConnected(!!storedKey && !!storedSecret)
		setLastUploadTime(SafeLocalStorage.getItem(SYNC_LAST_UPLOAD_KEY))
		setLastDownloadTime(SafeLocalStorage.getItem(SYNC_LAST_DOWNLOAD_KEY))
	}, [])

	function showStatus(type: 'success' | 'error', text: string) {
		setStatusMessage({ type, text })
		setTimeout(() => setStatusMessage(null), 5000)
	}

	function saveCredentials(t: string, k: string, s: string) {
		SafeLocalStorage.setItem(SYNC_TOKEN_STORAGE_KEY, t)
		SafeLocalStorage.setItem(SYNC_KEY_STORAGE_KEY, k)
		SafeLocalStorage.setItem(SYNC_SECRET_STORAGE_KEY, s)
		setToken(t)
		setSyncKey(k)
		setSecret(s)
		setIsConnected(true)
	}

	function clearCredentials() {
		SafeLocalStorage.removeItem(SYNC_TOKEN_STORAGE_KEY)
		SafeLocalStorage.removeItem(SYNC_KEY_STORAGE_KEY)
		SafeLocalStorage.removeItem(SYNC_SECRET_STORAGE_KEY)
		setToken('')
		setSyncKey('')
		setSecret('')
		setIsConnected(false)
		setServerEntry(null)
		setLocalData(null)
	}

	const effectiveBaseUrl = syncApiUrl.trim() || getApiBaseURL()

	function handleUrlChange(url: string) {
		const trimmed = url.trim()
		setSyncApiUrl(trimmed)
		if (trimmed) {
			SafeLocalStorage.setItem('sync_api_url', trimmed)
		} else {
			SafeLocalStorage.removeItem('sync_api_url')
		}
	}

	async function handleCreate() {
		if (!token.trim() || !secret.trim() || !syncKey.trim()) {
			showStatus('error', t('common.sync.allFieldsRequired'))
			return
		}
		setLoading('create')
		try {
			const data = collectLocalSyncData()
			const entry = await syncCreateOrUpdate(token.trim(), syncKey.trim(), secret.trim(), data, effectiveBaseUrl)
			saveCredentials(token.trim(), syncKey.trim(), secret.trim())
			setServerEntry(entry)
			const now = new Date().toISOString()
			SafeLocalStorage.setItem(SYNC_LAST_UPLOAD_KEY, now)
			setLastUploadTime(now)
			info(`[Sync] Created sync entry: ${syncKey.trim().slice(0, 8)}...`)
			showStatus('success', t('common.sync.createdAndUploaded'))
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			logError(`[Sync] Create failed: ${msg}`)
			showStatus('error', msg)
		} finally {
			setLoading(null)
		}
	}

	async function handleJoin() {
		if (!token.trim() || !secret.trim() || !syncKey.trim()) {
			showStatus('error', t('common.sync.allFieldsRequired'))
			return
		}
		setLoading('join')
		try {
			const entry = await syncFetch(token.trim(), syncKey.trim(), secret.trim(), effectiveBaseUrl)
			saveCredentials(token.trim(), syncKey.trim(), secret.trim())
			setServerEntry(entry)
			info(`[Sync] Connected to sync entry: ${syncKey.trim().slice(0, 8)}... (updated: ${entry.updated_at})`)
			showStatus('success', t('common.sync.connectedToExisting'))
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			logError(`[Sync] Join failed: ${msg}`)
			showStatus('error', msg)
		} finally {
			setLoading(null)
		}
	}

	async function handleUpload() {
		if (!confirmUpload) {
			setConfirmUpload(true)
			return
		}
		setConfirmUpload(false)
		setLoading('upload')
		try {
			const data = collectLocalSyncData()
			const entry = await syncCreateOrUpdate(token, syncKey, secret, data, effectiveBaseUrl)
			setServerEntry(entry)
			setLocalData(data)
			const now = new Date().toISOString()
			SafeLocalStorage.setItem(SYNC_LAST_UPLOAD_KEY, now)
			setLastUploadTime(now)
			info(`[Sync] Uploaded: ${Object.keys(data.watchlists).length} watchlists, ${data.alerts.length} alerts, ${data.chartLines.length} chart lines`)
			showStatus('success', t('common.sync.uploaded', { watchlists: Object.keys(data.watchlists).length, alerts: data.alerts.length, chartLines: data.chartLines.length }))
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			logError(`[Sync] Upload failed: ${msg}`)
			showStatus('error', msg)
		} finally {
			setLoading(null)
		}
	}

	async function handleDownload() {
		setLoading('download')
		try {
			const entry = await syncFetch(token, syncKey, secret, effectiveBaseUrl)
			setServerEntry(entry)
			info(`[Sync] Fetched server data (updated: ${entry.updated_at})`)
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			logError(`[Sync] Download failed: ${msg}`)
			showStatus('error', msg)
		} finally {
			setLoading(null)
		}
	}

	function handleApply(mode: 'overwrite' | 'merge') {
		if (confirmApply !== mode) {
			setConfirmApply(mode)
			return
		}
		setConfirmApply(null)
		if (!serverEntry) return
		const data = serverEntry.value
		applySyncData(data, mode)
		setLocalData(null) // clear cached local data
		const now = new Date().toISOString()
		SafeLocalStorage.setItem(SYNC_LAST_DOWNLOAD_KEY, now)
		setLastDownloadTime(now)
		const label = mode === 'overwrite' ? t('common.sync.overwritten') : t('common.sync.merged')
		info(`[Sync] Applied server data (${label}): ${Object.keys(data.watchlists).length} watchlists, ${data.alerts.length} alerts, ${data.chartLines.length} chart lines`)
		showStatus('success', t('common.sync.serverDataApplied', { mode: mode === 'overwrite' ? t('common.sync.overwritten').toLowerCase() : t('common.sync.merged').toLowerCase() }))
	}

	function handleDisconnect() {
		clearCredentials()
		info('[Sync] Disconnected from sync')
		showStatus('success', t('common.sync.disconnected'))
	}

	function handleExportJSON() {
		try {
			const data = collectLocalSyncData()
			const dataStr = JSON.stringify(data, null, 2)
			const blob = new Blob([dataStr], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			const now = new Date()
			const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`
			link.download = `sync-${ts}.json`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)
			info(`[Sync] Exported: ${Object.keys(data.watchlists).length} watchlists, ${data.alerts.length} alerts, ${data.chartLines.length} chart lines`)
			showStatus('success', t('common.sync.exportedFile', { filename: `sync-${ts}.json` }))
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			logError(`[Sync] Export failed: ${msg}`)
			showStatus('error', msg)
		}
	}

	function handleImportJSON() {
		fileInputRef.current?.click()
	}

	async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			const text = await file.text()
			const raw = JSON.parse(text) as unknown

			if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
				throw new Error('Invalid file format: expected a JSON object')
			}

			const obj = raw as Record<string, unknown>

			// Validate watchlists
			let watchlists: Record<string, string> = {}
			if (obj.watchlists !== undefined) {
				if (typeof obj.watchlists !== 'object' || obj.watchlists === null || Array.isArray(obj.watchlists)) {
					throw new Error('Invalid watchlists: expected an object')
				}
				const wl = obj.watchlists as Record<string, unknown>
				for (const [key, value] of Object.entries(wl)) {
					if (typeof value !== 'string') {
						throw new Error(`Invalid watchlists: value for "${key}" is not a string`)
					}
					watchlists[key] = value
				}
			}

			// Validate alerts
			let alerts: Alert[] = []
			if (obj.alerts !== undefined) {
				if (!Array.isArray(obj.alerts)) {
					throw new Error('Invalid alerts: expected an array')
				}
				alerts = obj.alerts.filter(
					(a): a is Alert =>
						typeof a === 'object' && a !== null &&
						typeof (a as Record<string, unknown>).id === 'string' &&
						typeof (a as Record<string, unknown>).ticker === 'string' &&
						typeof (a as Record<string, unknown>).target_price === 'number' &&
						typeof (a as Record<string, unknown>).alert_type === 'string',
				)
				if (alerts.length === 0 && obj.alerts.length > 0) {
					throw new Error('Invalid alerts: no valid alert entries found')
				}
			}

			// Validate chartLines
			let chartLines: ChartLine[] = []
			if (obj.chartLines !== undefined) {
				if (!Array.isArray(obj.chartLines)) {
					throw new Error('Invalid chartLines: expected an array')
				}
				chartLines = obj.chartLines.filter(
					(l): l is ChartLine =>
						typeof l === 'object' && l !== null &&
						typeof (l as Record<string, unknown>).id === 'string' &&
						typeof (l as Record<string, unknown>).ticker === 'string' &&
						typeof (l as Record<string, unknown>).price === 'number',
				)
				if (chartLines.length === 0 && obj.chartLines.length > 0) {
					throw new Error('Invalid chartLines: no valid chart line entries found')
				}
			}

			if (Object.keys(watchlists).length === 0 && alerts.length === 0 && chartLines.length === 0) {
				throw new Error('No valid data found in file')
			}

			const data: SyncData = {
				watchlists,
				alerts,
				chartLines,
				exportedAt: new Date().toISOString(),
			}

			setPendingImportData(data)
			setConfirmImport(null) // show the overwrite/merge choice
			info(`[Sync] Parsed import: ${Object.keys(watchlists).length} watchlists, ${alerts.length} alerts, ${chartLines.length} chart lines`)
			showStatus('success', t('common.sync.fileLoaded'))
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err)
			logError(`[Sync] Import failed: ${msg}`)
			showStatus('error', msg)
			setPendingImportData(null)
			setConfirmImport(null)
		} finally {
			if (fileInputRef.current) {
				fileInputRef.current.value = ''
			}
		}
	}

	function handleApplyImport(mode: 'overwrite' | 'merge') {
		if (!pendingImportData) return
		applySyncData(pendingImportData, mode)
		const d = pendingImportData
		const label = mode === 'overwrite' ? t('common.sync.overwritten') : t('common.sync.merged')
		info(`[Sync] Import ${label.toLowerCase()}: ${Object.keys(d.watchlists).length} watchlists, ${d.alerts.length} alerts, ${d.chartLines.length} chart lines`)
		showStatus('success', t('common.sync.importApplied', { label }))
		setPendingImportData(null)
		setConfirmImport(null)
		setLocalData(null)
	}

	async function handleCopyKey() {
		try {
			const config = [
				`Token: ${token}`,
				`Key: ${syncKey}`,
				`Secret: ${secret}`,
				`URL: ${effectiveBaseUrl}`,
			].join('\n')
			await navigator.clipboard.writeText(config)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			showStatus('error', t('common.sync.failedToCopy'))
		}
	}

	// Compute local data for diff display
	const currentLocalData = localData ?? collectLocalSyncData()
	const serverData = serverEntry?.value ?? null

	return (
		<div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
			<div className="flex items-center gap-3">
				<h1 className="text-xl font-bold">{t('common.sync.title')}</h1>
				{isConnected ? (
					<Badge variant="default" className="gap-1">
						<Wifi className="h-3 w-3" />
						{t('common.sync.connected')}
					</Badge>
				) : (
					<Badge variant="secondary" className="gap-1">
						<WifiOff className="h-3 w-3" />
						{t('common.sync.notConnected')}
					</Badge>
				)}
				<span className="text-xs text-muted-foreground font-mono">{effectiveBaseUrl}</span>
			</div>

			{/* Status message */}
			{statusMessage && (
				<div className={`p-3 rounded-md text-sm ${statusMessage.type === 'success'
					? 'bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400'
					: 'bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400'
				}`}>
					{statusMessage.text}
				</div>
			)}

			{isConnected ? (
				// ── Sync Tab ──
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-base">{t('common.sync.settings')}</CardTitle>
						<CardDescription className="text-xs flex items-center gap-2">
							{t('common.sync.key')}:
							<code className="bg-muted px-1.5 py-0.5 rounded text-xs">{syncKey.slice(0, 8)}...</code>
							<Button variant="ghost" size="sm" className="h-6 gap-1" onClick={handleCopyKey}>
								{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
								{copied ? t('common.sync.copied') : t('common.sync.copySettings')}
							</Button>
						</CardDescription>
						{serverEntry && (
							<p className="text-xs text-muted-foreground mt-1">
								{t('common.sync.updated')}: {new Date(serverEntry.updated_at).toLocaleString()}
							</p>
						)}
						<p className="text-xs text-muted-foreground mt-1">
							{t('common.sync.lastUpload')}: {lastUploadTime ? new Date(lastUploadTime).toLocaleString() : t('common.sync.never')}
						</p>
						<p className="text-xs text-muted-foreground mt-1">
							{t('common.sync.lastDownload')}: {lastDownloadTime ? new Date(lastDownloadTime).toLocaleString() : t('common.sync.never')}
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Upload section */}
						<div className="space-y-1">
							{confirmUpload ? (
								<div className="flex gap-2">
									<Button
										onClick={handleUpload}
										disabled={loading === 'upload'}
										variant="destructive"
										className="flex-1 gap-2"
									>
										{loading === 'upload'
											? <RefreshCw className="h-4 w-4 animate-spin" />
											: <Upload className="h-4 w-4" />}
										{t('common.sync.confirmUpload')}
									</Button>
									<Button
										onClick={() => setConfirmUpload(false)}
										variant="outline"
										className="flex-1"
									>
										{t('common.cancel')}
									</Button>
								</div>
							) : (
								<Button
									onClick={handleUpload}
									disabled={loading === 'upload'}
									className="w-full gap-2"
								>
									{loading === 'upload'
										? <RefreshCw className="h-4 w-4 animate-spin" />
										: <Upload className="h-4 w-4" />}
									{t('common.sync.uploadToServer')}
								</Button>
							)}
							<p className="text-xs text-muted-foreground">{t('common.sync.overwriteServerDesc')}</p>
						</div>

						{/* Download section */}
						<div className="space-y-3">
							<Button
								onClick={handleDownload}
								disabled={loading === 'download'}
								variant="outline"
								className="w-full gap-2"
							>
								{loading === 'download'
									? <RefreshCw className="h-4 w-4 animate-spin" />
									: <Download className="h-4 w-4" />}
								{t('common.sync.fetchServerData')}
							</Button>

							{/* Diff display */}
							{serverData && (
								<div className="bg-muted/50 border rounded-md p-3 space-y-2 text-xs">
									<div className="font-medium mb-2">{t('common.sync.dataComparison')}</div>
									<div className="grid grid-cols-3 gap-2">
										<div />
										<div className="font-medium text-center">{t('common.sync.local')}</div>
										<div className="font-medium text-center">{t('common.sync.server')}</div>

										<div>{t('common.sync.watchlists')}</div>
										<div className="text-center">{Object.keys(currentLocalData.watchlists).length}</div>
										<div className="text-center">{Object.keys(serverData.watchlists).length}</div>

										<div>{t('common.sync.alerts')}</div>
										<div className="text-center">{currentLocalData.alerts.length}</div>
										<div className="text-center">{serverData.alerts.length}</div>

										<div>{t('common.sync.chartLines')}</div>
										<div className="text-center">{currentLocalData.chartLines.length}</div>
										<div className="text-center">{serverData.chartLines.length}</div>

										<div className="pt-1 text-muted-foreground">{t('common.sync.serverExportedAt')}</div>
										<div className="col-span-2 text-center text-muted-foreground">
											{serverData.exportedAt ? new Date(serverData.exportedAt).toLocaleString() : 'N/A'}
										</div>
									</div>

									<div className="pt-2">
										{confirmApply ? (
											<div className="flex gap-2">
												<Button
													onClick={() => handleApply(confirmApply)}
													size="sm"
													variant={confirmApply === 'overwrite' ? 'destructive' : 'default'}
													className="gap-1"
												>
													{t('common.confirm')} {confirmApply === 'overwrite' ? t('common.sync.overwrite') : t('common.sync.merge')}
												</Button>
												<Button
													onClick={() => setConfirmApply(null)}
													size="sm"
													variant="outline"
												>
													{t('common.cancel')}
												</Button>
											</div>
										) : (
											<div className="flex gap-2">
												<Button
													onClick={() => handleApply('overwrite')}
													size="sm"
													variant="destructive"
													className="gap-1"
												>
													{t('common.sync.overwriteLocal')}
												</Button>
												<Button
													onClick={() => handleApply('merge')}
													size="sm"
													variant="secondary"
													className="gap-1"
												>
													{t('common.sync.mergeIntoLocal')}
												</Button>
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Disconnect */}
						<div className="pt-2 border-t">
							<Button
								onClick={handleDisconnect}
								variant="ghost"
								size="sm"
								className="gap-2 text-destructive hover:text-destructive"
							>
								<Unplug className="h-4 w-4" />
								{t('common.sync.disconnect')}
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				// ── Setup Tab ──
				<Tabs value={setupMode} onValueChange={(v) => setSetupMode(v as 'create' | 'join')} className="w-full">
					<TabsList className="w-full">
						<TabsTrigger value="create" className="flex-1">{t('common.sync.createNewSync')}</TabsTrigger>
						<TabsTrigger value="join" className="flex-1">{t('common.sync.joinExistingSync')}</TabsTrigger>
					</TabsList>

					<TabsContent value="create" className="space-y-4 mt-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">{t('common.sync.createNewSync')}</CardTitle>
								<CardDescription className="text-xs">
									{t('common.sync.createDescription')}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="create-api-url" className="text-xs">{t('common.sync.apiServerUrl')}</Label>
									<Input
										id="create-api-url"
										type="text"
										placeholder={getApiBaseURL()}
										value={syncApiUrl}
										onChange={(e) => handleUrlChange(e.target.value)}
										className="text-xs font-mono"
									/>
									<p className="text-[10px] text-muted-foreground">
										{t('common.sync.default')}: {getApiBaseURL()}
									</p>
								</div>

								<div className="space-y-1.5">
									<div className="flex items-center gap-1.5">
									<Label htmlFor="create-token" className="text-xs">{t('common.sync.syncToken')}</Label>
									<span className="text-[10px] text-muted-foreground">{t('common.sync.syncTokenHint')}</span>
								</div>
									<div className="relative">
										<Input
											id="create-token"
											type={showToken ? 'text' : 'password'}
											placeholder={t('common.sync.enterSyncToken')}
											value={token}
											onChange={(e) => setToken(e.target.value)}
											className="pr-10 text-xs font-mono"
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="absolute right-0 top-0 h-full px-2"
											onClick={() => setShowToken(!showToken)}
										>
											{showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</Button>
									</div>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="create-key" className="text-xs">{t('common.sync.syncKey')}</Label>
									<div className="flex gap-2">
										<Input
											id="create-key"
											type="text"
											placeholder={t('common.sync.generateKey')}
											value={syncKey}
											onChange={(e) => setSyncKey(e.target.value)}
											readOnly
											className="flex-1 text-xs font-mono bg-muted"
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSyncKey(generateUUIDv7())}
											className="shrink-0 text-xs"
										>
											{t('common.sync.generate')}
										</Button>
									</div>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="create-secret" className="text-xs">{t('common.sync.secret')}</Label>
									<div className="relative">
										<Input
											id="create-secret"
											type={showSecret ? 'text' : 'password'}
											placeholder={t('common.sync.chooseSecret')}
											value={secret}
											onChange={(e) => setSecret(e.target.value)}
											className="pr-10 text-xs font-mono"
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="absolute right-0 top-0 h-full px-2"
											onClick={() => setShowSecret(!showSecret)}
										>
											{showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</Button>
									</div>
								</div>

								<Button
									onClick={handleCreate}
									disabled={loading === 'create' || !token.trim() || !secret.trim() || !syncKey.trim()}
									className="w-full gap-2"
								>
									{loading === 'create'
										? <RefreshCw className="h-4 w-4 animate-spin" />
										: <Upload className="h-4 w-4" />}
									{t('common.sync.createAndUpload')}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="join" className="space-y-4 mt-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">{t('common.sync.joinExistingSync')}</CardTitle>
								<CardDescription className="text-xs">
									{t('common.sync.joinDescription')}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="join-api-url" className="text-xs">{t('common.sync.apiServerUrl')}</Label>
									<Input
										id="join-api-url"
										type="text"
										placeholder={getApiBaseURL()}
										value={syncApiUrl}
										onChange={(e) => handleUrlChange(e.target.value)}
										className="text-xs font-mono"
									/>
									<p className="text-[10px] text-muted-foreground">
										{t('common.sync.default')}: {getApiBaseURL()}
									</p>
								</div>

								<div className="space-y-1.5">
									<div className="flex items-center gap-1.5">
									<Label htmlFor="join-token" className="text-xs">{t('common.sync.syncToken')}</Label>
									<span className="text-[10px] text-muted-foreground">{t('common.sync.syncTokenHint')}</span>
								</div>
									<div className="relative">
										<Input
											id="join-token"
											type={showToken ? 'text' : 'password'}
											placeholder={t('common.sync.enterSyncTokenJoin')}
											value={token}
											onChange={(e) => setToken(e.target.value)}
											className="pr-10 text-xs font-mono"
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="absolute right-0 top-0 h-full px-2"
											onClick={() => setShowToken(!showToken)}
										>
											{showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</Button>
									</div>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="join-key" className="text-xs">{t('common.sync.syncKey').replace(' (UUID v7)', '')}</Label>
									<Input
										id="join-key"
										type="text"
										placeholder={t('common.sync.pasteSyncKey')}
										value={syncKey}
										onChange={(e) => setSyncKey(e.target.value)}
										className="text-xs font-mono"
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="join-secret" className="text-xs">{t('common.sync.secret')}</Label>
									<div className="relative">
										<Input
											id="join-secret"
											type={showSecret ? 'text' : 'password'}
											placeholder={t('common.sync.enterSecret')}
											value={secret}
											onChange={(e) => setSecret(e.target.value)}
											className="pr-10 text-xs font-mono"
										/>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											className="absolute right-0 top-0 h-full px-2"
											onClick={() => setShowSecret(!showSecret)}
										>
											{showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
										</Button>
									</div>
								</div>

								<Button
									onClick={handleJoin}
									disabled={loading === 'join' || !token.trim() || !secret.trim() || !syncKey.trim()}
									variant="outline"
									className="w-full gap-2"
								>
									{loading === 'join'
										? <RefreshCw className="h-4 w-4 animate-spin" />
										: <Download className="h-4 w-4" />}
									{t('common.sync.connect')}
								</Button>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			)}

			{/* Local Backup - always visible */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">{t('common.sync.localBackup')}</CardTitle>
					<CardDescription className="text-xs">
						{t('common.sync.localBackupDescription')}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-1">
						<Button onClick={handleExportJSON} variant="outline" className="w-full gap-2">
							<Download className="h-4 w-4" />
							{t('common.sync.exportJson')}
						</Button>
						<p className="text-xs text-muted-foreground">{t('common.sync.exportJsonDesc')}</p>
					</div>

					<div className="space-y-1">
						{confirmImport && pendingImportData ? (
							<div className="flex gap-2">
								<Button
									onClick={() => handleApplyImport(confirmImport)}
									variant={confirmImport === 'overwrite' ? 'destructive' : 'default'}
									size="sm"
									className="flex-1 gap-1"
								>
									{t('common.confirm')} {confirmImport === 'overwrite' ? t('common.sync.overwrite') : t('common.sync.merge')}
								</Button>
								<Button
									onClick={() => { setConfirmImport(null); setPendingImportData(null) }}
									variant="outline"
									size="sm"
									className="flex-1"
								>
									{t('common.cancel')}
								</Button>
							</div>
						) : pendingImportData ? (
							<div className="flex gap-2">
								<Button
									onClick={() => setConfirmImport('overwrite')}
									variant="destructive"
									size="sm"
									className="flex-1 gap-1"
								>
									{t('common.sync.overwriteLocal')}
								</Button>
								<Button
									onClick={() => setConfirmImport('merge')}
									variant="secondary"
									size="sm"
									className="flex-1 gap-1"
								>
									{t('common.sync.mergeIntoLocal')}
								</Button>
								<Button
									onClick={() => setPendingImportData(null)}
									variant="ghost"
									size="sm"
								>
									{t('common.cancel')}
								</Button>
							</div>
						) : (
							<Button onClick={handleImportJSON} variant="outline" className="w-full gap-2">
								<Upload className="h-4 w-4" />
								{t('common.sync.importJson')}
							</Button>
						)}
						<p className="text-xs text-muted-foreground">{t('common.sync.importJsonDesc')}</p>
					</div>

					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						onChange={handleFileChange}
						className="hidden"
					/>
				</CardContent>
			</Card>
		</div>
	)
}
