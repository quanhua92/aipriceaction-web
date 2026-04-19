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
import { useLogs } from '@/contexts/LogsContext'
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

	React.useEffect(() => {
		setIsMounted(true)
	}, [])

	if (!isMounted) {
		return <div className="p-4 md:p-6 space-y-4">Loading...</div>
	}

	return <SyncPageContent />
}

function SyncPageContent() {
	const { info, error: logError } = useLogs()

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
			showStatus('error', 'All fields are required')
			return
		}
		setLoading('create')
		try {
			const data = collectLocalSyncData()
			const entry = await syncCreateOrUpdate(token.trim(), syncKey.trim(), secret.trim(), data, effectiveBaseUrl)
			saveCredentials(token.trim(), syncKey.trim(), secret.trim())
			setServerEntry(entry)
			info(`[Sync] Created sync entry: ${syncKey.trim().slice(0, 8)}...`)
			showStatus('success', 'Sync entry created and local data uploaded')
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
			showStatus('error', 'All fields are required')
			return
		}
		setLoading('join')
		try {
			const entry = await syncFetch(token.trim(), syncKey.trim(), secret.trim(), effectiveBaseUrl)
			saveCredentials(token.trim(), syncKey.trim(), secret.trim())
			setServerEntry(entry)
			info(`[Sync] Connected to sync entry: ${syncKey.trim().slice(0, 8)}... (updated: ${entry.updated_at})`)
			showStatus('success', 'Connected to existing sync entry')
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
			info(`[Sync] Uploaded: ${Object.keys(data.watchlists).length} watchlists, ${data.alerts.length} alerts, ${data.chartLines.length} chart lines`)
			showStatus('success', `Uploaded: ${Object.keys(data.watchlists).length} watchlists, ${data.alerts.length} alerts, ${data.chartLines.length} chart lines`)
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
		const label = mode === 'overwrite' ? 'Overwrite' : 'Merge'
		info(`[Sync] Applied server data (${label}): ${Object.keys(data.watchlists).length} watchlists, ${data.alerts.length} alerts, ${data.chartLines.length} chart lines`)
		showStatus('success', `Server data ${mode === 'overwrite' ? 'overwritten' : 'merged'} into local. Reload pages to see changes.`)
	}

	function handleDisconnect() {
		clearCredentials()
		info('[Sync] Disconnected from sync')
		showStatus('success', 'Disconnected from sync')
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
			showStatus('error', 'Failed to copy to clipboard')
		}
	}

	// Compute local data for diff display
	const currentLocalData = localData ?? collectLocalSyncData()
	const serverData = serverEntry?.value ?? null

	return (
		<div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
			<div className="flex items-center gap-3">
				<h1 className="text-xl font-bold">Sync</h1>
				{isConnected ? (
					<Badge variant="default" className="gap-1">
						<Wifi className="h-3 w-3" />
						Connected
					</Badge>
				) : (
					<Badge variant="secondary" className="gap-1">
						<WifiOff className="h-3 w-3" />
						Not connected
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
						<CardTitle className="text-base">Sync Settings</CardTitle>
						<CardDescription className="text-xs flex items-center gap-2">
							Key:
							<code className="bg-muted px-1.5 py-0.5 rounded text-xs">{syncKey.slice(0, 8)}...</code>
							<Button variant="ghost" size="sm" className="h-6 gap-1" onClick={handleCopyKey}>
								{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
								{copied ? 'Copied' : 'Copy Settings'}
							</Button>
						</CardDescription>
						{serverEntry && (
							<p className="text-xs text-muted-foreground mt-1">
								Updated: {new Date(serverEntry.updated_at).toLocaleString()}
							</p>
						)}
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
										Confirm Upload
									</Button>
									<Button
										onClick={() => setConfirmUpload(false)}
										variant="outline"
										className="flex-1"
									>
										Cancel
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
									Upload to Server
								</Button>
							)}
							<p className="text-xs text-muted-foreground">Overwrite server with local data</p>
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
								Fetch Server Data
							</Button>

							{/* Diff display */}
							{serverData && (
								<div className="bg-muted/50 border rounded-md p-3 space-y-2 text-xs">
									<div className="font-medium mb-2">Data Comparison</div>
									<div className="grid grid-cols-3 gap-2">
										<div />
										<div className="font-medium text-center">Local</div>
										<div className="font-medium text-center">Server</div>

										<div>Watchlists</div>
										<div className="text-center">{Object.keys(currentLocalData.watchlists).length}</div>
										<div className="text-center">{Object.keys(serverData.watchlists).length}</div>

										<div>Alerts</div>
										<div className="text-center">{currentLocalData.alerts.length}</div>
										<div className="text-center">{serverData.alerts.length}</div>

										<div>Chart Lines</div>
										<div className="text-center">{currentLocalData.chartLines.length}</div>
										<div className="text-center">{serverData.chartLines.length}</div>

										<div className="pt-1 text-muted-foreground">Server exported at</div>
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
													Confirm {confirmApply === 'overwrite' ? 'Overwrite' : 'Merge'}
												</Button>
												<Button
													onClick={() => setConfirmApply(null)}
													size="sm"
													variant="outline"
												>
													Cancel
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
													Overwrite Local
												</Button>
												<Button
													onClick={() => handleApply('merge')}
													size="sm"
													variant="secondary"
													className="gap-1"
												>
													Merge into Local
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
								Disconnect
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				// ── Setup Tab ──
				<Tabs value={setupMode} onValueChange={(v) => setSetupMode(v as 'create' | 'join')} className="w-full">
					<TabsList className="w-full">
						<TabsTrigger value="create" className="flex-1">Create New Sync</TabsTrigger>
						<TabsTrigger value="join" className="flex-1">Join Existing Sync</TabsTrigger>
					</TabsList>

					<TabsContent value="create" className="space-y-4 mt-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Create New Sync</CardTitle>
								<CardDescription className="text-xs">
									Generate a new sync key and upload your local data to the server.
									Share the key, token, and secret with other devices to sync.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="create-api-url" className="text-xs">API Server URL</Label>
									<Input
										id="create-api-url"
										type="text"
										placeholder={getApiBaseURL()}
										value={syncApiUrl}
										onChange={(e) => handleUrlChange(e.target.value)}
										className="text-xs font-mono"
									/>
									<p className="text-[10px] text-muted-foreground">
										Default: {getApiBaseURL()}
									</p>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="create-token" className="text-xs">Sync Token</Label>
									<div className="relative">
										<Input
											id="create-token"
											type={showToken ? 'text' : 'password'}
											placeholder="Enter your sync token"
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
									<Label htmlFor="create-secret" className="text-xs">Secret</Label>
									<div className="relative">
										<Input
											id="create-secret"
											type={showSecret ? 'text' : 'password'}
											placeholder="Choose a secret password"
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

								<div className="space-y-1.5">
									<Label htmlFor="create-key" className="text-xs">Sync Key (UUID v7)</Label>
									<div className="flex gap-2">
										<Input
											id="create-key"
											type="text"
											placeholder="Generate a new key..."
											value={syncKey}
											onChange={(e) => setSyncKey(e.target.value)}
											className="flex-1 text-xs font-mono"
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setSyncKey(generateUUIDv7())}
											className="shrink-0 text-xs"
										>
											Generate
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
									Create & Upload
								</Button>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="join" className="space-y-4 mt-4">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Join Existing Sync</CardTitle>
								<CardDescription className="text-xs">
									Enter the token, key, and secret from another device to connect.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="space-y-1.5">
									<Label htmlFor="join-api-url" className="text-xs">API Server URL</Label>
									<Input
										id="join-api-url"
										type="text"
										placeholder={getApiBaseURL()}
										value={syncApiUrl}
										onChange={(e) => handleUrlChange(e.target.value)}
										className="text-xs font-mono"
									/>
									<p className="text-[10px] text-muted-foreground">
										Default: {getApiBaseURL()}
									</p>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="join-token" className="text-xs">Sync Token</Label>
									<div className="relative">
										<Input
											id="join-token"
											type={showToken ? 'text' : 'password'}
											placeholder="Enter sync token"
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
									<Label htmlFor="join-key" className="text-xs">Sync Key</Label>
									<Input
										id="join-key"
										type="text"
										placeholder="Paste the sync key..."
										value={syncKey}
										onChange={(e) => setSyncKey(e.target.value)}
										className="text-xs font-mono"
									/>
								</div>

								<div className="space-y-1.5">
									<Label htmlFor="join-secret" className="text-xs">Secret</Label>
									<div className="relative">
										<Input
											id="join-secret"
											type={showSecret ? 'text' : 'password'}
											placeholder="Enter the secret"
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
									Connect
								</Button>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			)}
		</div>
	)
}
