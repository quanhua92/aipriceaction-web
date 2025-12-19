/**
 * Date utility functions for chart components
 * Eliminates repetitive date formatting logic across chart components
 */

/**
 * Formats a timestamp from lightweight-charts parameter for display
 * Handles timestamp conversion and error cases consistently
 *
 * @param paramTime - Time parameter from lightweight-charts (can be number or string)
 * @returns Formatted date string for display in tooltips
 */
export const formatTooltipDate = (paramTime: any): string => {
	let dateStr: string;
	try {
		const date = new Date((paramTime as number) * 1000);
		if (isNaN(date.getTime())) {
			dateStr = String(paramTime);
		} else {
			// Timestamp is already shifted to Vietnam time, format as UTC to display correctly
			dateStr = date.toLocaleString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				timeZone: "UTC", // Use UTC because timestamp is already shifted
			});
		}
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("Error formatting tooltip date:", error);
		}
		dateStr = "Invalid Date";
	}
	return dateStr;
};