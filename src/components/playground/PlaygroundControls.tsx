import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLogs } from "@/contexts/LogsContext";
import { useTranslation } from "@/hooks/useTranslation";
import { isIntradayInterval } from "./hooks/usePlaygroundData";
import { usePlayground } from "./PlaygroundDataProvider";

interface PlaygroundControlsProps {
	hideSliderAndDate?: boolean;
}

export function PlaygroundControls({
	hideSliderAndDate = false,
}: PlaygroundControlsProps) {
	const { playgroundData, navigate, setCurrentIndex } = usePlayground();
	const { info } = useLogs();
	const { t } = useTranslation();

	const { currentIndex, allData, interval } = playgroundData;
	const isIntraday = isIntradayInterval(interval);

	// Get current and end dates for display
	const currentDate = allData[currentIndex]?.time?.split("T")[0] || "";
	const endDate = allData[allData.length - 1]?.time?.split("T")[0] || "";

	// Navigation button handlers
	const handleBack5 = () => navigate("back5");
	const handleBack1 = () => navigate("back1");
	const handleNext1 = () => navigate("next1");
	const handleNext5 = () => navigate("next5");

	// Quick jump handlers
	const handleJumpToStart = () => {
		info("[Playground] ⏮️ User jumped to start (index 0)");
		setCurrentIndex(0);
	};

	const handleJumpToEnd = () => {
		const endIndex = allData.length - 1;
		info(`[Playground] ⏭️ User jumped to end (index ${endIndex})`);
		setCurrentIndex(endIndex);
	};

	// Slider change handler
	const handleSliderChange = (value: number[]) => {
		setCurrentIndex(value[0]);
	};

	// Check if buttons should be disabled
	const isAtStart = currentIndex === 0;
	const isAtEnd = currentIndex >= allData.length - 1;

	// Keyboard shortcuts: Shift+Arrow for navigation
	const navigateRef = React.useRef(navigate);
	navigateRef.current = navigate;
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;
			if (e.shiftKey && e.key === "ArrowRight") {
				e.preventDefault();
				navigateRef.current("next1");
			} else if (e.shiftKey && e.key === "ArrowLeft") {
				e.preventDefault();
				navigateRef.current("back1");
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div className="space-y-4">
			{/* Navigation buttons */}
			<div className="flex items-center justify-center gap-3">
				<Button
					variant="outline"
					size="sm"
					onClick={handleBack5}
					disabled={isAtStart}
					className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
					title={
						isIntraday
							? t("common.playground.controls.back5")
							: t("common.playground.controls.back5Days")
					}
				>
					<ChevronsLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleBack1}
					disabled={isAtStart}
					className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
					title={
						isIntraday
							? t("common.playground.controls.back1")
							: t("common.playground.controls.back1Day")
					}
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleNext1}
					disabled={isAtEnd}
					className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
					title={
						isIntraday
							? t("common.playground.controls.next1")
							: t("common.playground.controls.next1Day")
					}
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleNext5}
					disabled={isAtEnd}
					className="h-10 w-10 p-0 border-green-600 text-green-600 hover:bg-green-50 hover:border-green-700 hover:text-green-700"
					title={
						isIntraday
							? t("common.playground.controls.next5")
							: t("common.playground.controls.next5Days")
					}
				>
					<ChevronsRight className="h-4 w-4" />
				</Button>
			</div>

			{/* Navigation guide text */}
			<div className="text-center text-sm text-muted-foreground">
				{isIntraday
					? t("common.playground.controls.navigationGuideBars")
					: t("common.playground.controls.navigationGuide")}{" "}
				· {t("common.playground.controls.keyboardShortcut")}
			</div>

			{/* Slider for fine control */}
			{allData.length > 0 && !hideSliderAndDate && (
				<div className="space-y-2 px-1">
					<Slider
						min={0}
						max={allData.length - 1}
						step={1}
						value={[currentIndex]}
						onValueChange={handleSliderChange}
						className="w-full"
					/>
				</div>
			)}

			{/* Date info - 3 columns */}
			{allData.length > 0 && !hideSliderAndDate && (
				<div className="space-y-2">
					<div className="grid grid-cols-3 gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={handleJumpToStart}
							disabled={isAtStart}
							className="text-xs flex flex-col items-center p-2 h-auto"
						>
							<span className="text-xs">
								{t("common.playground.controls.start")}
							</span>
							<span className="text-xs text-muted-foreground font-mono">
								{allData[0]?.time?.split("T")[0] || ""}
							</span>
						</Button>

						{/* Current date in middle - matching button style but not clickable */}
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => e.preventDefault()}
							className="text-xs flex flex-col items-center p-2 h-auto"
						>
							<span className="text-xs">
								{t("common.playground.controls.current")}
							</span>
							<span className="text-xs font-mono font-semibold">
								{currentDate || "-"}
							</span>
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={handleJumpToEnd}
							disabled={isAtEnd}
							className="text-xs flex flex-col items-center p-2 h-auto"
						>
							<span className="text-xs">
								{t("common.playground.controls.end")}
							</span>
							<span className="text-xs text-muted-foreground font-mono">
								{endDate || ""}
							</span>
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
