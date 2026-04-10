import { Search } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { RRGTicker } from "@/lib/api-client";

type Quadrant = "leading" | "improving" | "weakening" | "lagging";

interface RRGTableProps {
	tickers: RRGTicker[];
	allTickers: RRGTicker[];
	selectedTicker: RRGTicker | null;
	algorithm: "mascore" | "jdk";
	onSelectTicker: (ticker: RRGTicker) => void;
	tickerNamesMap?: Record<string, string>;
}

function getQuadrant(
	rsRatio: number,
	rsMomentum: number,
	algorithm: "mascore" | "jdk",
): Quadrant {
	const center = algorithm === "mascore" ? 0 : 100;
	const xAbove = rsRatio >= center;
	const yAbove = rsMomentum >= center;
	if (xAbove && yAbove) return "leading";
	if (!xAbove && yAbove) return "improving";
	if (xAbove && !yAbove) return "weakening";
	return "lagging";
}

function getQuadrantBadgeVariant(
	q: Quadrant,
): "default" | "secondary" | "destructive" | "outline" {
	const variants: Record<
		Quadrant,
		"default" | "secondary" | "destructive" | "outline"
	> = {
		leading: "default",
		improving: "secondary",
		weakening: "destructive",
		lagging: "outline",
	};
	return variants[q];
}

function formatVolume(vol: number): string {
	if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
	if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
	if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
	return String(vol);
}

type SortKey =
	| "symbol"
	| "quadrant"
	| "sector"
	| "price"
	| "volume"
	| "rsRatio"
	| "rsMomentum";

function SortHeader({
	col,
	label,
	sortBy,
	sortDir,
	onSort,
}: {
	col: SortKey;
	label: string;
	sortBy: SortKey;
	sortDir: "asc" | "desc";
	onSort: (key: SortKey) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => onSort(col)}
			className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-medium text-muted-foreground"
		>
			{label}
			{sortBy === col && (
				<span className="text-[10px]">
					{sortDir === "asc" ? "\u25B2" : "\u25BC"}
				</span>
			)}
		</button>
	);
}

export function RRGTable({
	tickers,
	allTickers,
	selectedTicker,
	algorithm,
	onSelectTicker,
	tickerNamesMap = {},
}: RRGTableProps) {
	const { t } = useTranslation();
	const [sortBy, setSortBy] = React.useState<SortKey>("symbol");
	const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
	const [search, setSearch] = React.useState("");

	const handleSort = (key: SortKey) => {
		if (sortBy === key) {
			setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(key);
			setSortDir("asc");
		}
	};

	const searchBase = React.useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return null; // no search → use volume-filtered tickers
		return (allTickers ?? tickers).filter((ticker) => {
			const name = tickerNamesMap[ticker.symbol];
			return (
				ticker.symbol.toLowerCase().includes(q) ||
				name?.toLowerCase().includes(q)
			);
		});
	}, [search, allTickers, tickers, tickerNamesMap]);

	const sortedTickers = React.useMemo(() => {
		const source = searchBase ?? tickers;
		return [...source].sort((a, b) => {
			let cmp = 0;
			switch (sortBy) {
				case "symbol":
					cmp = a.symbol.localeCompare(b.symbol);
					break;
				case "quadrant": {
					const qa = getQuadrant(a.rs_ratio, a.rs_momentum, algorithm);
					const qb = getQuadrant(b.rs_ratio, b.rs_momentum, algorithm);
					const order: Quadrant[] = [
						"leading",
						"improving",
						"weakening",
						"lagging",
					];
					cmp = order.indexOf(qa) - order.indexOf(qb);
					break;
				}
				case "sector":
					cmp = (a.sector || "").localeCompare(b.sector || "");
					break;
				case "price":
					cmp = a.close - b.close;
					break;
				case "volume":
					cmp = a.volume - b.volume;
					break;
				case "rsRatio":
					cmp = a.rs_ratio - b.rs_ratio;
					break;
				case "rsMomentum":
					cmp = a.rs_momentum - b.rs_momentum;
					break;
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [searchBase, tickers, sortBy, sortDir, algorithm]);

	const xColLabel =
		algorithm === "mascore"
			? t("common.rrg.mascoreXAxis")
			: t("common.rrg.table.rsRatio");
	const yColLabel =
		algorithm === "mascore"
			? t("common.rrg.mascoreYAxis")
			: t("common.rrg.table.rsMomentum");

	return (
		<div>
			<div className="relative mb-2">
				<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
				<Input
					type="text"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder={t("common.rrg.table.searchPlaceholder")}
					className="h-8 text-xs pl-8"
				/>
			</div>
			<div className="overflow-x-auto -mx-3 md:mx-0">
				<Table className="text-xs">
					<TableHeader>
						<TableRow>
							<TableHead className="py-2 px-2 sticky left-0 bg-card z-10 min-w-[70px]">
								<SortHeader
									col="symbol"
									label={t("common.rrg.table.symbol")}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
							<TableHead className="py-2 px-2 min-w-[80px]">
								<SortHeader
									col="quadrant"
									label={t("common.rrg.table.quadrant")}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
							<TableHead className="py-2 px-2 min-w-[70px] hidden sm:table-cell">
								<SortHeader
									col="sector"
									label={t("common.rrg.table.sector")}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
							<TableHead className="py-2 px-2 min-w-[60px] text-right">
								<SortHeader
									col="price"
									label={t("common.rrg.table.price")}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
							<TableHead className="py-2 px-2 min-w-[60px] text-right hidden md:table-cell">
								<SortHeader
									col="volume"
									label={t("common.rrg.table.volume")}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
							<TableHead className="py-2 px-2 min-w-[60px] text-right">
								<SortHeader
									col="rsRatio"
									label={xColLabel}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
							<TableHead className="py-2 px-2 min-w-[70px] text-right">
								<SortHeader
									col="rsMomentum"
									label={yColLabel}
									sortBy={sortBy}
									sortDir={sortDir}
									onSort={handleSort}
								/>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedTickers.map((ticker) => {
							const quadrant = getQuadrant(
								ticker.rs_ratio,
								ticker.rs_momentum,
								algorithm,
							);
							const isSelected = selectedTicker?.symbol === ticker.symbol;
							return (
								<TableRow
									key={ticker.symbol}
									className={`cursor-pointer hover:bg-muted/50 py-2 ${isSelected ? "bg-muted" : ""}`}
									onClick={() => onSelectTicker(ticker)}
								>
									<TableCell className="py-2 px-2 font-medium sticky left-0 bg-card z-10">
										{ticker.symbol}
									</TableCell>
									<TableCell className="py-2 px-2">
										<Badge
											variant={getQuadrantBadgeVariant(quadrant)}
											className="text-[10px] px-1.5 py-0"
										>
											{t(`common.rrg.quadrants.${quadrant}`)}
										</Badge>
									</TableCell>
									<TableCell className="py-2 px-2 text-muted-foreground hidden sm:table-cell">
										{ticker.sector || "-"}
									</TableCell>
									<TableCell className="py-2 px-2 text-right font-mono">
										{ticker.close.toLocaleString()}
									</TableCell>
									<TableCell className="py-2 px-2 text-right font-mono hidden md:table-cell">
										{formatVolume(ticker.volume)}
									</TableCell>
									<TableCell className="py-2 px-2 text-right font-mono">
										{ticker.rs_ratio.toFixed(2)}
									</TableCell>
									<TableCell className="py-2 px-2 text-right font-mono">
										{ticker.rs_momentum.toFixed(2)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
