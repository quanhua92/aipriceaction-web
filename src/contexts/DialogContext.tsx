import React from 'react'

interface DialogState {
	viewportWidth: number
	viewportHeight: number
}

interface DialogContextValue extends DialogState {
	// We can add more dialog-related state here in the future
}

const DialogContext = React.createContext<DialogContextValue | undefined>(
	undefined
)

export function DialogProvider({ children }: { children: React.ReactNode }) {
	const [viewportWidth, setViewportWidth] = React.useState<number>(() => {
		if (typeof window === 'undefined') return 1024
		return window.innerWidth
	})

	const [viewportHeight, setViewportHeight] = React.useState<number>(() => {
		if (typeof window === 'undefined') return 768
		return window.innerHeight
	})

	// Update viewport dimensions on window resize
	React.useEffect(() => {
		const handleResize = () => {
			setViewportWidth(window.innerWidth)
			setViewportHeight(window.innerHeight)
		}

		window.addEventListener('resize', handleResize)
		return () => window.removeEventListener('resize', handleResize)
	}, [])

	const value: DialogContextValue = React.useMemo(
		() => ({
			viewportWidth,
			viewportHeight,
		}),
		[viewportWidth, viewportHeight]
	)

	return (
		<DialogContext.Provider value={value}>{children}</DialogContext.Provider>
	)
}

export function useDialog() {
	const context = React.useContext(DialogContext)
	if (context === undefined) {
		throw new Error('useDialog must be used within a DialogProvider')
	}
	return context
}
