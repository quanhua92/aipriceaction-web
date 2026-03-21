import { Search } from "lucide-react";
import * as React from "react";
import { useEffect, useState } from "react";
import {
	SortableTickerList,
	type SortableTickerListRef,
} from "@/components/lists/SortableTickerList";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAPI } from "@/contexts/APIContext";
import { useTranslation } from "@/hooks/useTranslation";
import type { TickersResponse } from "@/lib/api-client";
import { MARKET_INDICES } from "@/lib/constants";

interface SelectTickerDialogProps {
	children: React.ReactNode;
	onSelectTicker: (ticker: string) => void;
	defaultSectionFilter?: "all" | "stocks" | "crypto";
	/** When set, fetches historical last-data as of this date instead of using live context data */
	endDate?: string;
}

export function SelectTickerDialog({
	children,
	onSelectTicker,
	defaultSectionFilter = "stocks",
	endDate,
}: SelectTickerDialogProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const tickerListRef = React.useRef<SortableTickerListRef>(null);
	const [historicalStockData, setHistoricalStockData] =
		useState<TickersResponse | null>(null);
	const [historicalCryptoData, setHistoricalCryptoData] =
		useState<TickersResponse | null>(null);
	const [historicalLoading, setHistoricalLoading] = useState(false);
	const {
		tickers,
		loading,
		error,
		allTickersLastData,
		cryptoTickers,
		cryptoLoading,
		cryptoError,
		allCryptoTickersLastData,
		getTickers,
	} = useAPI();
	const { t } = useTranslation();

	// Fetch historical data when dialog opens with endDate
	useEffect(() => {
		if (!endDate || !open) return;
		let cancelled = false;
		setHistoricalLoading(true);
		Promise.all([
			getTickers("SelectTickerDialog.historical", {
				limit: 1,
				end_date: endDate,
			}),
			getTickers("SelectTickerDialog.historical.crypto", {
				limit: 1,
				end_date: endDate,
				mode: "crypto",
			}),
		])
			.then(([stockData, cryptoData]) => {
				if (!cancelled) {
					setHistoricalStockData(stockData);
					setHistoricalCryptoData(cryptoData);
					setHistoricalLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setHistoricalLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [endDate, open, getTickers]);

	// Use historical data when available, otherwise fall back to live context data
	const effectiveStockData = historicalStockData ?? allTickersLastData;
	const effectiveCryptoData = historicalCryptoData ?? allCryptoTickersLastData;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			tickerListRef.current?.selectFirstVisible();
		}
	};

	const handleSelectTicker = (symbol: string) => {
		onSelectTicker(symbol);
		setOpen(false);
		setSearch("");
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent
				className="sm:max-w-2xl h-[700px] flex flex-col p-6 gap-4"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">
					{t("dialogs.selectTicker.title")}
				</DialogTitle>
				<div className="shrink-0 border-b pb-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={t("dialogs.selectTicker.searchPlaceholder")}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={handleKeyDown}
							className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1"
							autoFocus
						/>
					</div>
				</div>

				<div className="flex-1 min-h-0">
					<SortableTickerList
						ref={tickerListRef}
						tickers={tickers}
						allTickersLastData={effectiveStockData}
						searchQuery={search}
						marketIndices={[...MARKET_INDICES]}
						onSelectTicker={handleSelectTicker}
						loading={loading || cryptoLoading || historicalLoading}
						error={error || cryptoError}
						maxHeight="none"
						className="h-full"
						cryptoTickers={cryptoTickers}
						allCryptoTickersLastData={effectiveCryptoData}
						defaultSectionFilter={defaultSectionFilter}
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}
