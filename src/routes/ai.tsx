import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import * as React from "react";
import { AIDescription } from "@/components/ai/AIDescription";
import { SelectTickerDialog } from "@/components/dialogs/SelectTickerDialog";
import { TickerGroupSelector } from "@/components/TickerGroupSelector";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DateControlWidget } from "@/components/widgets/DateControlWidget";
import { useAPI } from "@/contexts/APIContext";
import { useChartSettings } from "@/contexts/ChartSettingsContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTranslation } from "@/hooks/useTranslation";
import { buildAIContext, type TickerInfo } from "@/lib/ai-context-builder";
import { AI_SELECTED_TICKERS_STORAGE_KEY } from "@/lib/constants";
import { SafeLocalStorage } from "@/lib/localStorage";
import { getSectorDisplayName } from "@/lib/sector-names";
import { getTickersForGroup } from "@/lib/ticker-group-utils";
import { getWatchlistNames } from "@/lib/watchlist-storage";
import { loadTranslations } from "@/translations";

export const Route = createFileRoute("/ai")({ component: AIContextPage });

const MAX_TICKERS = 100;

function AIContextPage() {
	const { t, language } = useTranslation();
	const translations = loadTranslations(language);
	const {
		getTickers,
		getHealth,
		tickers,
		cryptoTickers,
		tickerGroups,
		globalTickers,
		cryptoTickerGroups,
		globalTickerGroups,
		tickerNames,
		cryptoTickerNames,
		globalTickerNames,
		ema,
	} = useAPI();
	const { lastRefresh } = useRefresh();
	const { endDate } = useChartSettings();
	const [copied, setCopied] = React.useState(false);
	const [copiedTemplate, setCopiedTemplate] = React.useState<number | null>(
		null,
	);
	const [customWatchlistNames, setCustomWatchlistNames] = React.useState<
		string[]
	>([]);
	const [selectedTickers, setSelectedTickers] = React.useState<string[]>(() => {
		// Load from localStorage on initialization
		try {
			const stored = SafeLocalStorage.getItem(AI_SELECTED_TICKERS_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return parsed;
				}
			}
		} catch (error) {
			console.error("Failed to load tickers from localStorage:", error);
		}
		// Default to VNINDEX if nothing in storage
		return ["VNINDEX"];
	});
	const [limit, setLimit] = React.useState<number>(20);
	const [interval, setInterval] = React.useState<string>("1D");
	const [marketData, setMarketData] = React.useState<Record<
		string,
		any[]
	> | null>(null);
	const [isFetching, setIsFetching] = React.useState(false);
	const [fetchError, setFetchError] = React.useState<string | null>(null);
	const [isTradingHours, setIsTradingHours] = React.useState<boolean>(false);

	// Save selected tickers to localStorage whenever they change
	React.useEffect(() => {
		try {
			SafeLocalStorage.setItem(
				AI_SELECTED_TICKERS_STORAGE_KEY,
				JSON.stringify(selectedTickers),
			);
		} catch (error) {
			console.error("Failed to save tickers to localStorage:", error);
		}
	}, [selectedTickers]);

	// Load custom watchlist names
	React.useEffect(() => {
		setCustomWatchlistNames(getWatchlistNames());
	}, []);

	// Fetch health status to check trading hours
	React.useEffect(() => {
		const fetchHealthStatus = async () => {
			try {
				const health = await getHealth("AIRoute.tradingHours");
				setIsTradingHours(health.is_trading_hours);
			} catch (error) {
				console.error("Failed to fetch health status:", error);
			}
		};

		fetchHealthStatus();
	}, [getHealth]);

	const tickersInfo = React.useMemo((): TickerInfo[] => {
		return selectedTickers.map((symbol) => {
			const names = tickerNames || cryptoTickerNames || globalTickerNames || {};
			const name = names[symbol];

			const groups: string[] = [];
			const allGroups: Record<string, Record<string, string[]> | null> = {
				vn: tickerGroups,
				crypto: cryptoTickerGroups,
				yahoo: globalTickerGroups,
			};
			for (const [, groupsMap] of Object.entries(allGroups)) {
				if (!groupsMap) continue;
				for (const [groupKey, tickers] of Object.entries(groupsMap)) {
					if (tickers.includes(symbol)) {
						const displayName = getSectorDisplayName(groupKey, language);
						if (!groups.includes(displayName)) {
							groups.push(displayName);
						}
					}
				}
			}

			return { symbol, name, groups };
		});
	}, [
		selectedTickers,
		tickerNames,
		cryptoTickerNames,
		globalTickerNames,
		tickerGroups,
		cryptoTickerGroups,
		globalTickerGroups,
		language,
	]);

	const aiContext = React.useMemo(() => {
		return buildAIContext(
			language,
			marketData || undefined,
			interval,
			isTradingHours,
			ema,
			tickersInfo,
		);
	}, [language, marketData, interval, isTradingHours, ema, tickersInfo]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(aiContext);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	};

	const handleCopyTemplate = async (
		templateIndex: number,
		question: string,
	) => {
		try {
			const contextWithQuestion = `${aiContext}\n\n=== Question ===\n${question}`;
			await navigator.clipboard.writeText(contextWithQuestion);
			setCopiedTemplate(templateIndex);
			setTimeout(() => setCopiedTemplate(null), 2000);
		} catch (err) {
			console.error("Failed to copy template:", err);
		}
	};

	const handleAddTicker = (ticker: string) => {
		if (selectedTickers.length >= MAX_TICKERS) {
			return;
		}
		if (!selectedTickers.includes(ticker)) {
			setSelectedTickers([...selectedTickers, ticker]);
		}
	};

	const handleRemoveTicker = (ticker: string) => {
		setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
	};

	const handleGroupChange = (groupName: string) => {
		if (!groupName) return;

		const groupInfo = getTickersForGroup(
			groupName,
			tickerGroups,
			cryptoTickers || [],
			globalTickers || [],
			customWatchlistNames,
		);

		setSelectedTickers(groupInfo.tickers);
	};

	const handleClearTickers = () => {
		setSelectedTickers(["VNINDEX"]);
	};

	// Auto-fetch data when tickers, limit, or interval change
	React.useEffect(() => {
		const fetchData = async () => {
			if (selectedTickers.length === 0) {
				setMarketData(null);
				return;
			}

			setIsFetching(true);
			setFetchError(null);

			try {
				// Separate tickers by type to use correct mode
				const stockSymbolSet = new Set(tickers.map((t) => t.symbol));
				const cryptoSymbolSet = new Set(cryptoTickers.map((t) => t.symbol));
				const globalSymbolSet = new Set(globalTickers.map((t) => t.symbol));

				const stockSymbols: string[] = [];
				const cryptoSymbols: string[] = [];
				const globalSymbols: string[] = [];

				for (const symbol of selectedTickers) {
					if (cryptoSymbolSet.has(symbol)) {
						cryptoSymbols.push(symbol);
					} else if (globalSymbolSet.has(symbol)) {
						globalSymbols.push(symbol);
					} else {
						stockSymbols.push(symbol);
					}
				}

				const isMixed =
					(stockSymbols.length > 0 &&
						(cryptoSymbols.length > 0 || globalSymbols.length > 0)) ||
					(cryptoSymbols.length > 0 && globalSymbols.length > 0);

				let data: Record<string, any>;
				if (isMixed) {
					data = await getTickers("AIRoute.marketData.mixed", {
						symbol: selectedTickers,
						limit: limit,
						interval: interval,
						end_date: endDate,
						mode: "all",
						ema: ema || undefined,
					});
				} else {
					// All tickers are the same type — use correct mode
					let mode: "vn" | "crypto" | "yahoo" = "vn";
					if (cryptoSymbols.length > 0) mode = "crypto";
					else if (globalSymbols.length > 0) mode = "yahoo";

					data = await getTickers("AIRoute.marketData", {
						symbol: selectedTickers,
						limit: limit,
						interval: interval,
						end_date: endDate,
						mode,
						ema: ema || undefined,
					});
				}
				setMarketData(data);
			} catch (error) {
				console.error("Failed to fetch market data:", error);
				setFetchError("Failed to fetch market data");
			} finally {
				setIsFetching(false);
			}
		};

		fetchData();
	}, [
		selectedTickers,
		limit,
		interval,
		getTickers,
		lastRefresh,
		endDate,
		tickers.length,
		cryptoTickers.length,
		globalTickers.length,
		ema,
	]);

	const canAddMoreTickers = selectedTickers.length < MAX_TICKERS;

	return (
		<div className="space-y-4">
			{/* Description Section */}
			<div className="bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10 border-b">
				<div className="container mx-auto p-6 md:p-8">
					<AIDescription />
				</div>
			</div>

			<div className="container mx-auto p-2 md:p-6 space-y-6">
				{/* Date Control Widget */}
				<DateControlWidget />

				{/* Ticker Selection Card */}
				<Card>
					<CardHeader>
						<CardTitle>{t("common.aiContext.tickerSelection.title")}</CardTitle>
						<CardDescription>
							{t("common.aiContext.tickerSelection.description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="p-3 md:p-6 space-y-4">
						{/* Load Watchlist/Group */}
						<div className="space-y-2">
							<h3 className="text-sm font-medium">
								{t("common.aiContext.loadGroup.title")}
							</h3>
							<TickerGroupSelector
								value=""
								onValueChange={handleGroupChange}
								showAll={false}
								showCrypto={false}
								showPredefined={true}
								showCustom={true}
								showSectors={true}
								placeholder={t("common.aiContext.loadGroup.placeholder")}
							/>
						</div>

						{/* Settings Row */}
						<div className="flex items-center gap-2">
							{/* Limit Selector */}
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
									{t("common.aiContext.tickerSelection.recordLimit")}
								</span>
								<Select
									value={limit.toString()}
									onValueChange={(value) => setLimit(Number(value))}
								>
									<SelectTrigger className="w-[72px] h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="10">10</SelectItem>
										<SelectItem value="20">20</SelectItem>
										<SelectItem value="30">30</SelectItem>
										<SelectItem value="40">40</SelectItem>
										<SelectItem value="50">50</SelectItem>
										<SelectItem value="100">100</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Interval Selector */}
							<div className="flex items-center gap-2">
								<span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
									{t("common.aiContext.tickerSelection.interval")}
								</span>
								<Select value={interval} onValueChange={setInterval}>
									<SelectTrigger className="w-[80px] h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="5m">5m</SelectItem>
										<SelectItem value="15m">15m</SelectItem>
										<SelectItem value="1h">1h</SelectItem>
										<SelectItem value="4h">4h</SelectItem>
										<SelectItem value="1D">1D</SelectItem>
										<SelectItem value="2W">2W</SelectItem>
										<SelectItem value="1M">1M</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Add Ticker Button */}
						<div>
							<SelectTickerDialog onSelectTicker={handleAddTicker}>
								<Button
									variant={canAddMoreTickers ? "default" : "outline"}
									size="sm"
									className={`w-full ${
										canAddMoreTickers
											? "bg-green-500 hover:bg-green-600 text-white"
											: ""
									}`}
									disabled={!canAddMoreTickers}
								>
									<Plus className="h-4 w-4 mr-2" />
									{t("common.aiContext.tickerSelection.addTicker")}
									{!canAddMoreTickers &&
										` (${t("common.aiContext.tickerSelection.maxTickersReached")})`}
								</Button>
							</SelectTickerDialog>
						</div>

						{/* Clear Button */}
						<div>
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={handleClearTickers}
							>
								<X className="h-4 w-4 mr-2" />
								{t("common.aiContext.tickerSelection.clearTickers")}
							</Button>
						</div>

						{/* Selected Tickers List */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium">
									{t("common.aiContext.tickerSelection.selectedTickers")} (
									{selectedTickers.length})
								</span>
								{isFetching && (
									<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
								)}
							</div>
							<div className="space-y-2 max-h-[200px] overflow-y-auto">
								{selectedTickers.length === 0 ? (
									<p className="text-sm text-muted-foreground text-center py-4">
										{t("common.aiContext.tickerSelection.noTickersSelected")}
									</p>
								) : (
									selectedTickers.map((ticker) => (
										<div
											key={ticker}
											className="flex items-center justify-between p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
										>
											<span className="font-mono font-medium text-sm">
												{ticker}
											</span>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveTicker(ticker)}
												className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
											>
												<Trash2 className="h-3.5 w-3.5" />
												<span className="sr-only">
													{t("common.aiContext.tickerSelection.removeTicker")}{" "}
													{ticker}
												</span>
											</Button>
										</div>
									))
								)}
							</div>
						</div>

						{/* Data Status & Error */}
						{fetchError && (
							<p className="text-sm text-destructive">{fetchError}</p>
						)}
						{!isFetching &&
							marketData &&
							Object.keys(marketData).length > 0 && (
								<div className="text-sm text-muted-foreground">
									✓ Market data loaded for {Object.keys(marketData).length}{" "}
									ticker(s)
								</div>
							)}
					</CardContent>
				</Card>

				{/* AI Context Preview Card */}
				<Card>
					<CardHeader>
						<CardTitle>{t("common.aiContext.cardTitle")}</CardTitle>
						<CardDescription>
							{t("common.aiContext.cardDescription")}
						</CardDescription>
					</CardHeader>
					<CardContent className="p-3 md:p-6 space-y-4">
						{/* Scrollable Textarea */}
						<div className="relative">
							<textarea
								readOnly
								value={aiContext}
								className="w-full h-[600px] p-4 font-mono text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-muted/50"
								style={{ whiteSpace: "pre-wrap" }}
							/>
						</div>

						{/* Copy Button */}
						<div className="flex justify-end">
							<Button
								onClick={handleCopy}
								variant={copied ? "default" : "outline"}
								className={`min-w-[120px] ${
									copied
										? "bg-green-500 hover:bg-green-600 text-white"
										: "border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950"
								}`}
							>
								{copied ? (
									<>
										<Check className="mr-2 h-4 w-4" />
										{t("common.aiContext.copied")}
									</>
								) : (
									<>
										<Copy className="mr-2 h-4 w-4" />
										{t("common.aiContext.copyButton")}
									</>
								)}
							</Button>
						</div>

						{/* Usage Instructions */}
						<div className="mt-6 p-4 bg-muted/50 rounded-md space-y-2">
							<h3 className="font-semibold text-sm">
								{t("common.aiContext.howToUseTitle")}
							</h3>
							<ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
								<li>{t("common.aiContext.howToUseSteps.step1")}</li>
								<li>{t("common.aiContext.howToUseSteps.step2")}</li>
								<li>{t("common.aiContext.howToUseSteps.step3")}</li>
								<li>{t("common.aiContext.howToUseSteps.step4")}</li>
							</ol>
						</div>

						{/* Template Questions Section */}
						<div className="mt-6 space-y-4">
							<div>
								<h3 className="font-semibold text-sm">
									{t("templates.sectionTitle")}
								</h3>
								<p className="text-sm text-muted-foreground">
									{t("templates.sectionDescription")}
								</p>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{translations.templates.templates.map(
									(template: any, index: number) => {
										const isCopied = copiedTemplate === index;

										return (
											<Card
												key={index}
												className="hover:border-primary/50 transition-colors cursor-pointer p-4"
												onClick={() =>
													handleCopyTemplate(index, template.question)
												}
											>
												<h3 className="text-base font-semibold mb-2">
													{template.title}
												</h3>
												<p className="text-sm text-muted-foreground line-clamp-3 mb-4">
													{template.snippet}
												</p>
												<Button
													variant={isCopied ? "default" : "outline"}
													size="sm"
													className={`w-full ${
														isCopied
															? "bg-green-500 hover:bg-green-600 text-white"
															: "border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950"
													}`}
													onClick={(e) => {
														e.stopPropagation();
														handleCopyTemplate(index, template.question);
													}}
												>
													{isCopied ? (
														<>
															<Check className="mr-2 h-3.5 w-3.5" />
															{t("templates.templateCopied")}
														</>
													) : (
														<>
															<Copy className="mr-2 h-3.5 w-3.5" />
															{t("templates.copyTemplate")}
														</>
													)}
												</Button>
											</Card>
										);
									},
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
