import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Plus, Trash2, Loader2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildAIContext } from "@/lib/ai-context-builder";
import { useTranslation } from "@/hooks/useTranslation";
import { SelectTickerDialog } from "@/components/dialogs/SelectTickerDialog";
import { useAPI } from "@/contexts/APIContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useChartSettings } from "@/contexts/ChartSettingsContext";
import { loadTranslations } from "@/translations";
import { AI_SELECTED_TICKERS_STORAGE_KEY } from "@/lib/constants";
import { TickerGroupSelector } from "@/components/TickerGroupSelector";
import { getTickersForGroup } from "@/lib/ticker-group-utils";
import { getWatchlistNames } from "@/lib/watchlist-storage";
import { DateControlWidget } from "@/components/widgets/DateControlWidget";
import { AIDescription } from "@/components/ai/AIDescription";

export const Route = createFileRoute("/ai")({ component: AIContextPage });

const MAX_TICKERS = 100;

function AIContextPage() {
	const { t, language } = useTranslation();
	const translations = loadTranslations(language);
	const { getTickers, getHealth, cryptoTickers, tickerGroups, globalTickers } = useAPI();
	const { lastRefresh } = useRefresh();
	const { endDate } = useChartSettings();
	const [copied, setCopied] = React.useState(false);
	const [copiedTemplate, setCopiedTemplate] = React.useState<number | null>(null);
	const [customWatchlistNames, setCustomWatchlistNames] = React.useState<string[]>([]);
	const [selectedTickers, setSelectedTickers] = React.useState<string[]>(() => {
		// Load from localStorage on initialization
		try {
			const stored = localStorage.getItem(AI_SELECTED_TICKERS_STORAGE_KEY);
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
	const [marketData, setMarketData] = React.useState<Record<string, any[]> | null>(null);
	const [isFetching, setIsFetching] = React.useState(false);
	const [fetchError, setFetchError] = React.useState<string | null>(null);
	const [isTradingHours, setIsTradingHours] = React.useState<boolean>(false);

	// Save selected tickers to localStorage whenever they change
	React.useEffect(() => {
		try {
			localStorage.setItem(AI_SELECTED_TICKERS_STORAGE_KEY, JSON.stringify(selectedTickers));
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
				const health = await getHealth('AIRoute.tradingHours');
				setIsTradingHours(health.is_trading_hours);
			} catch (error) {
				console.error("Failed to fetch health status:", error);
			}
		};

		fetchHealthStatus();
	}, [getHealth]);

	const aiContext = React.useMemo(() => {
		return buildAIContext(language, marketData || undefined, interval, isTradingHours);
	}, [language, marketData, interval, isTradingHours]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(aiContext);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text:", err);
		}
	}

	const handleCopyTemplate = async (templateIndex: number, question: string) => {
		try {
			const contextWithQuestion = `${aiContext}\n\n=== Question ===\n${question}`;
			await navigator.clipboard.writeText(contextWithQuestion);
			setCopiedTemplate(templateIndex);
			setTimeout(() => setCopiedTemplate(null), 2000);
		} catch (err) {
			console.error("Failed to copy template:", err);
		}
	}

	const handleAddTicker = (ticker: string) => {
		if (selectedTickers.length >= MAX_TICKERS) {
			return
		}
		if (!selectedTickers.includes(ticker)) {
			setSelectedTickers([...selectedTickers, ticker]);
		}
	}

	const handleRemoveTicker = (ticker: string) => {
		setSelectedTickers(selectedTickers.filter(t => t !== ticker));
	}

	const handleGroupChange = (groupName: string) => {
		if (!groupName) return;

		const groupInfo = getTickersForGroup(
			groupName,
			tickerGroups,
			cryptoTickers || [],
			globalTickers || [],
			customWatchlistNames
		);

		setSelectedTickers(groupInfo.tickers);
	}

	const handleClearTickers = () => {
		setSelectedTickers(['VNINDEX']);
	}

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
				const data = await getTickers('AIRoute.marketData', {
					symbol: selectedTickers,
					limit: limit,
					interval: interval,
					end_date: endDate,
					mode: 'all'
				});
				setMarketData(data);
			} catch (error) {
				console.error("Failed to fetch market data:", error);
				setFetchError("Failed to fetch market data");
			} finally {
				setIsFetching(false);
			}
		}

		fetchData();
	}, [selectedTickers, limit, interval, getTickers, lastRefresh, endDate]);

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
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Limit Selector */}
						<div className="flex items-center gap-3">
							<label className="text-sm font-medium whitespace-nowrap">
								{t("common.aiContext.tickerSelection.recordLimit")}:
							</label>
							<Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
								<SelectTrigger className="w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="10">10 {t("common.aiContext.tickerSelection.records")}</SelectItem>
									<SelectItem value="20">20 {t("common.aiContext.tickerSelection.records")}</SelectItem>
									<SelectItem value="30">30 {t("common.aiContext.tickerSelection.records")}</SelectItem>
									<SelectItem value="40">40 {t("common.aiContext.tickerSelection.records")}</SelectItem>
									<SelectItem value="50">50 {t("common.aiContext.tickerSelection.records")}</SelectItem>
									<SelectItem value="100">100 {t("common.aiContext.tickerSelection.records")}</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Interval Selector */}
						<div className="flex items-center gap-3">
							<label className="text-sm font-medium whitespace-nowrap">
								{t("common.aiContext.tickerSelection.interval")}:
							</label>
							<Select value={interval} onValueChange={setInterval}>
								<SelectTrigger className="w-[140px]">
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
										? 'bg-green-500 hover:bg-green-600 text-white'
										: ''
								}`}
								disabled={!canAddMoreTickers}
							>
								<Plus className="h-4 w-4 mr-2" />
								{t("common.aiContext.tickerSelection.addTicker")}
								{!canAddMoreTickers && ` (${t("common.aiContext.tickerSelection.maxTickersReached")})`}
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
								{t("common.aiContext.tickerSelection.selectedTickers")} ({selectedTickers.length})
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
										<span className="font-mono font-medium text-sm">{ticker}</span>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveTicker(ticker)}
											className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
										>
											<Trash2 className="h-3.5 w-3.5" />
											<span className="sr-only">{t("common.aiContext.tickerSelection.removeTicker")} {ticker}</span>
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
					{!isFetching && marketData && Object.keys(marketData).length > 0 && (
						<div className="text-sm text-muted-foreground">
							✓ Market data loaded for {Object.keys(marketData).length} ticker(s)
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
									? 'bg-green-500 hover:bg-green-600 text-white'
									: 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950'
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
						<h3 className="font-semibold text-sm">{t("common.aiContext.howToUseTitle")}</h3>
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
							<h3 className="font-semibold text-sm">{t("templates.sectionTitle")}</h3>
							<p className="text-sm text-muted-foreground">
								{t("templates.sectionDescription")}
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{translations.templates.templates.map((template: any, index: number) => {
								const isCopied = copiedTemplate === index;

								return (
									<Card
										key={index}
										className="hover:border-primary/50 transition-colors cursor-pointer p-4"
										onClick={() => handleCopyTemplate(index, template.question)}
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
													? 'bg-green-500 hover:bg-green-600 text-white'
													: 'border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950'
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
							})}
						</div>
					</div>
				</CardContent>
			</Card>
			</div>
		</div>
	)
}
