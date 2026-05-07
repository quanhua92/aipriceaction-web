import { Bookmark, Star } from "lucide-react";
import * as React from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAPI } from "@/contexts/APIContext";
import { useTranslation } from "@/hooks/useTranslation";
import {
	ALL_WATCHLIST_NAME,
	CRYPTO_WATCHLIST_NAME,
	GLOBAL_WATCHLIST_NAME,
	PRIORITY_GROUPS,
} from "@/lib/constants";
import { getPredefinedWatchlistNames } from "@/lib/predefined-watchlists";
import { getSectorDisplayName } from "@/lib/sector-names";
import { getWatchlistNames } from "@/lib/watchlist-storage";

export interface TickerGroupSelectorProps {
	value: string;
	onValueChange: (group: string) => void;
	showAll?: boolean;
	showCrypto?: boolean;
	showGlobal?: boolean;
	showPredefined?: boolean;
	showCustom?: boolean;
	showSectors?: boolean;
	placeholder?: string;
	className?: string;
	refreshKey?: number;
}

export function TickerGroupSelector({
	value,
	onValueChange,
	showAll = true,
	showCrypto = true,
	showGlobal = true,
	showPredefined = true,
	showCustom = true,
	showSectors = true,
	placeholder = "Select ticker group",
	className,
	refreshKey,
}: TickerGroupSelectorProps) {
	const { tickerGroups } = useAPI();
	const { language } = useTranslation();

	const [customWatchlists, setCustomWatchlists] = React.useState<string[]>([]);

	// Load custom watchlists
	React.useEffect(() => {
		setCustomWatchlists(getWatchlistNames());
	}, [refreshKey]);

	// Get predefined watchlist names
	const predefinedWatchlists = React.useMemo(
		() => (showPredefined ? getPredefinedWatchlistNames() : []),
		[showPredefined],
	);

	// Get sector groups (exclude market indices)
	const sectorGroups = React.useMemo(() => {
		if (!showSectors || !tickerGroups) return [];
		return Object.keys(tickerGroups).sort((a, b) => {
			const priorityA = PRIORITY_GROUPS.indexOf(a as any);
			const priorityB = PRIORITY_GROUPS.indexOf(b as any);
			if (priorityA !== -1 && priorityB !== -1) return priorityA - priorityB;
			if (priorityA !== -1) return -1;
			if (priorityB !== -1) return 1;
			return a.localeCompare(b);
		});
	}, [tickerGroups, showSectors]);

	// Combine all groups in display order
	const allGroups = React.useMemo(() => {
		const seen = new Set<string>();
		const groups: string[] = [];
		const add = (g: string) => {
			if (!seen.has(g)) {
				seen.add(g);
				groups.push(g);
			}
		};
		if (showAll) add(ALL_WATCHLIST_NAME);
		if (showCrypto) add(CRYPTO_WATCHLIST_NAME);
		if (showGlobal) add(GLOBAL_WATCHLIST_NAME);
		for (const g of predefinedWatchlists) add(g);
		if (showCustom) for (const g of customWatchlists) add(g);
		for (const g of sectorGroups) add(g);
		return groups;
	}, [
		showAll,
		showCrypto,
		showGlobal,
		predefinedWatchlists,
		customWatchlists,
		sectorGroups,
		showCustom,
	]);

	// Get display name (readable names for sectors only)
	const getDropdownDisplayName = React.useCallback(
		(group: string): string => {
			const isSector = sectorGroups.includes(group);
			if (isSector) {
				return getSectorDisplayName(group, language);
			}
			return group;
		},
		[sectorGroups, language],
	);

	return (
		<Select value={value} onValueChange={onValueChange}>
			<SelectTrigger className={className}>
				<SelectValue placeholder={placeholder}>
					{value && getDropdownDisplayName(value)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{allGroups.map((group) => (
					<SelectItem key={group} value={group}>
						<div className="flex items-center gap-2">
							{/* Icon for predefined watchlists */}
							{predefinedWatchlists.includes(group) && (
								<Bookmark className="h-3 w-3 fill-purple-500 text-purple-500" />
							)}
							{/* Icon for custom watchlists */}
							{customWatchlists.includes(group) && (
								<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
							)}
							<span className={group === ALL_WATCHLIST_NAME ? "font-bold" : ""}>
								{getDropdownDisplayName(group)}
							</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
