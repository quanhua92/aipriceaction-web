import * as React from 'react'

export interface LogEntry {
	timestamp: number
	level: 'info' | 'warn' | 'error' | 'debug'
	message: string
	data?: any
}

interface LogsContextValue {
	logs: LogEntry[]
	info: (message: string, data?: any) => void
	warn: (message: string, data?: any) => void
	error: (message: string, data?: any) => void
	debug: (message: string, data?: any) => void
	clearLogs: () => void
}

const LogsContext = React.createContext<LogsContextValue | undefined>(undefined)

const MAX_LOGS = 500

export function LogsProvider({ children }: { children: React.ReactNode }) {
	// Use ref to store logs array for efficient updates
	const logsRef = React.useRef<LogEntry[]>([])

	// Use state to trigger re-renders when logs change
	const [, setUpdateTrigger] = React.useState(0)

	// Generic log function
	const addLog = React.useCallback(
		(level: LogEntry['level'], message: string, data?: any) => {
			const newLog: LogEntry = {
				timestamp: Date.now(),
				level,
				message,
				...(data !== undefined && { data }),
			}

			// Prepend new log (recent first) and keep only last MAX_LOGS entries
			logsRef.current = [newLog, ...logsRef.current].slice(0, MAX_LOGS)

			// Trigger re-render
			setUpdateTrigger((prev) => prev + 1)
		},
		[]
	)

	// Log level methods
	const info = React.useCallback(
		(message: string, data?: any) => {
			addLog('info', message, data)
		},
		[addLog]
	)

	const warn = React.useCallback(
		(message: string, data?: any) => {
			addLog('warn', message, data)
		},
		[addLog]
	)

	const error = React.useCallback(
		(message: string, data?: any) => {
			addLog('error', message, data)
		},
		[addLog]
	)

	const debug = React.useCallback(
		(message: string, data?: any) => {
			addLog('debug', message, data)
		},
		[addLog]
	)

	const clearLogs = React.useCallback(() => {
		logsRef.current = []
		setUpdateTrigger((prev) => prev + 1)
	}, [])

	const value: LogsContextValue = {
		logs: logsRef.current,
		info,
		warn,
		error,
		debug,
		clearLogs,
	}

	return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>
}

export function useLogs() {
	const context = React.useContext(LogsContext)
	if (context === undefined) {
		throw new Error('useLogs must be used within a LogsProvider')
	}
	return context
}
