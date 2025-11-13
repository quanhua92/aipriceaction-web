import { type ReactNode, createContext, useContext, useEffect } from "react";

declare global {
	interface Window {
		gtag?: (
			command: string,
			targetIdOrEventName: string,
			config?: Record<string, unknown>,
		) => void;
		dataLayer?: unknown[];
	}
}

interface GoogleAnalyticsContextType {
	trackPageView: (url: string) => void;
	trackEvent: (
		eventName: string,
		eventParams?: Record<string, unknown>,
	) => void;
	setUserId: (userId: string) => void;
	setUserProperties: (properties: Record<string, unknown>) => void;
}

const GoogleAnalyticsContext = createContext<
	GoogleAnalyticsContextType | undefined
>(undefined);

interface GoogleAnalyticsProviderProps {
	children: ReactNode;
	measurementId?: string;
}

export function GoogleAnalyticsProvider({
	children,
	measurementId,
}: GoogleAnalyticsProviderProps) {
	useEffect(() => {
		if (!measurementId || typeof window === "undefined") return;

		if (window.gtag) {
			window.gtag("config", measurementId, {
				page_path: window.location.pathname,
			});
		}
	}, [measurementId]);

	const trackPageView = (url: string) => {
		if (!measurementId || typeof window === "undefined" || !window.gtag) return;

		window.gtag("config", measurementId, {
			page_path: url,
		});
	};

	const trackEvent = (
		eventName: string,
		eventParams?: Record<string, unknown>,
	) => {
		if (!measurementId || typeof window === "undefined" || !window.gtag) return;

		window.gtag("event", eventName, eventParams);
	};

	const setUserId = (userId: string) => {
		if (!measurementId || typeof window === "undefined" || !window.gtag) return;

		window.gtag("config", measurementId, {
			user_id: userId,
		});
	};

	const setUserProperties = (properties: Record<string, unknown>) => {
		if (!measurementId || typeof window === "undefined" || !window.gtag) return;

		window.gtag("set", "user_properties", properties);
	};

	const value: GoogleAnalyticsContextType = {
		trackPageView,
		trackEvent,
		setUserId,
		setUserProperties,
	};

	return (
		<GoogleAnalyticsContext.Provider value={value}>
			{children}
		</GoogleAnalyticsContext.Provider>
	);
}

export function useGoogleAnalytics() {
	const context = useContext(GoogleAnalyticsContext);
	if (context === undefined) {
		throw new Error(
			"useGoogleAnalytics must be used within a GoogleAnalyticsProvider",
		);
	}
	return context;
}
