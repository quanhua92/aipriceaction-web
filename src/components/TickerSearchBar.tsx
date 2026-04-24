import { Search } from "lucide-react";
import * as React from "react";
import { SelectTickerDialog } from "@/components/dialogs/SelectTickerDialog";
import { useTranslation } from "@/hooks/useTranslation";

interface TickerSearchBarProps {
	onSelectTicker: (symbol: string) => void;
	defaultSectionFilter?: "stocks" | "crypto" | "global";
}

export function TickerSearchBar({
	onSelectTicker,
	defaultSectionFilter = "stocks",
}: TickerSearchBarProps) {
	const { t } = useTranslation();
	const triggerRef = React.useRef<HTMLDivElement>(null);

	const modKey = React.useMemo(
		() => (navigator.userAgent.includes("Mac") ? "⌘" : "Ctrl"),
		[],
	);

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			) {
				return;
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				triggerRef.current?.click();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<SelectTickerDialog
			onSelectTicker={onSelectTicker}
			defaultSectionFilter={defaultSectionFilter}
		>
			<div
				ref={triggerRef}
				className="group relative flex items-center w-full max-w-md lg:max-w-xl mx-auto h-12 px-4 bg-background/60 border border-border/50 rounded-xl cursor-pointer hover:border-primary/40 hover:bg-background/80 shadow-sm hover:shadow-md dark:bg-muted/30 dark:border-border/50 dark:hover:border-primary/50 transition-all"
			>
				<Search className="h-5 w-5 text-foreground shrink-0 transition-colors" />
				<span className="ml-3 text-sm text-foreground select-none transition-colors">
					{t("common.tickerSearch.placeholder")}
				</span>
				<kbd className="ml-auto pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded-md border border-border/60 bg-muted/50 dark:bg-muted dark:border-border px-2 font-mono text-[11px] text-foreground/60 transition-colors">
					{modKey} + K
				</kbd>
			</div>
		</SelectTickerDialog>
	);
}
