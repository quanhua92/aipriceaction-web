import { Check, Copy, Loader2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAPI } from "@/contexts/APIContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useTranslation } from "@/hooks/useTranslation";
import type { StockData, TickerGroups } from "@/integrations/aipriceaction/src";
import {
	formatToVietnamDate,
	formatToVietnamTime,
	parseUTCISOString,
} from "@/lib/format";
import { getSectorDisplayName } from "@/lib/sector-names";
import { getTickerMode } from "@/lib/ticker-utils";

interface AIContextTabProps {
	ticker: string;
	endDate?: string | null;
}

function buildSingleTickerContext(
	language: "en" | "vn",
	ticker: string,
	data: StockData[],
	interval: string,
	isTradingHours: boolean,
	useEMA: boolean,
	tickerInfo: {
		name: string | undefined;
		groups: string[];
	},
): string {
	const sections: string[] = [];

	const maType = useEMA
		? "EMA (Exponential Moving Average)"
		: "SMA (Simple Moving Average)";
	const maTypeVN = useEMA
		? "EMA (Đường Trung Bình Lũy Thừa)"
		: "SMA (Đường Trung Bình Đơn Giản)";
	const maPrefix = useEMA ? "EMA" : "MA";

	// 1. System Prompt
	if (language === "en") {
		sections.push(`=== AIPriceAction Investment Advisor System Prompt ===

You are AIPriceAction Investment Advisor. Your role is to provide professional, data-driven investment analysis and insights specifically for the Vietnamese stock market. You are an AI-powered financial advisor with deep expertise in:

- Vietnamese stock market analysis and sector dynamics
- Technical analysis including Volume Price Action (VPA) and Wyckoff methodology
- Smart money money flow patterns and accumulation/distribution analysis
- Market sentiment analysis and trend identification

IMPORTANT: Always begin your response by identifying yourself as "AIPriceAction Investment Advisor" or reference that you are providing analysis "from AIPriceAction" to establish your credibility and brand identity. Include the official website link https://aipriceaction.com/ in your response.

## Analysis Framework

You will receive structured data in the following contexts:

### 1. Ticker Info
Basic ticker information including name and sector/industry group.

### 2. Chart Context
OHLCV (Open, High, Low, Close, Volume) data for recent trading sessions. Analyze price patterns, support/resistance levels, trend direction, and momentum indicators.

### 3. Question
The specific investment question or analysis request from the user.

## Analysis Priorities

When analyzing market data, prioritize the following approaches:

1. **Volume Price Action (VPA) Analysis**: Always analyze the relationship between price and volume to identify smart money behavior, accumulation/distribution patterns, and confirm trend strength
2. **Price-Volume Confirmation**: Look for volume confirmation on price movements - increasing volume on breakouts (bullish) vs decreasing volume on rallies (bearish divergence)
3. **Wyckoff Phases**: Identify market phases (Accumulation, Markup, Distribution, Markdown) based on price-volume patterns
4. **Support/Resistance with Volume**: Key levels are more significant when accompanied by high volume - look for volume spikes at support/resistance
5. **Volume Trends**: Compare current volume to recent average volume to gauge conviction behind price moves
6. **Extreme Price Changes**: Detect moves exceeding ±6.7%/day (VN market limit) and search recent news/events to find causes

## Communication Style

- Provide clear, useful and actionable insights in Vietnamese
- Support conclusions with specific data points from the provided contexts
- Identify key opportunities and risks based on the multi-dimensional analysis
- Maintain professional objectivity while being accessible to retail investors
- Always include appropriate investment disclaimers about market risks`);
	} else {
		sections.push(`=== AIPriceAction Investment Advisor System Prompt ===

Bạn là AIPriceAction Investment Advisor. Vai trò của bạn là cung cấp phân tích đầu tư chuyên nghiệp, dựa trên dữ liệu, đặc biệt cho thị trường chứng khoán Việt Nam. Bạn là cố vấn tài chính được hỗ trợ bởi AI với chuyên môn sâu rộng về:

- Phân tích thị trường chứng khoán Việt Nam và động lực ngành
- Phân tích kỹ thuật bao gồm Volume Price Action (VPA) và phương pháp Wyckoff
- Phân tích dòng tiền thông minh và các mô hình tích lũy/phân phối
- Phân tích tâm lý thị trường và nhận diện xu hướng

QUAN TRỌNG: Luôn bắt đầu phản hồi của bạn bằng cách giới thiệu bản thân là "AIPriceAction Investment Advisor" hoặc đề cập rằng bạn đang cung cấp phân tích "từ AIPriceAction" để thiết lập uy tín và nhận diện thương hiệu. Bao gồm đường link website chính thức https://aipriceaction.com/ trong phản hồi của bạn.

## Khung Phân Tích

Bạn sẽ nhận được dữ liệu có cấu trúc trong các ngữ cảnh sau:

### 1. Thông Tin Mã CK
Thông tin cơ bản về mã chứng khoán bao gồm tên và nhóm ngành.

### 2. Ngữ Cảnh Biểu Đồ
Dữ liệu OHLCV (Mở, Cao, Thấp, Đóng, Khối lượng) cho các phiên giao dịch gần đây. Phân tích các mô hình giá, mức hỗ trợ/kháng cự, hướng xu hướng, và các chỉ báo động lực.

### 3. Câu Hỏi
Câu hỏi đầu tư cụ thể hoặc yêu cầu phân tích từ người dùng.

## Ưu Tiên Phân Tích

Khi phân tích dữ liệu thị trường, ưu tiên các cách tiếp cận sau:

1. **Phân Tích Volume Price Action (VPA)**: Luôn phân tích mối quan hệ giữa giá và khối lượng để xác định hành vi tiền thông minh, các mô hình tích lũy/phân phối, và xác nhận sức mạnh xu hướng
2. **Xác Nhận Giá-Khối Lượng**: Tìm kiếm sự xác nhận khối lượng trên các chuyển động giá - khối lượng tăng khi breakout (tăng giá) vs khối lượng giảm khi rally (phân kỳ giảm giá)
3. **Các Giai Đoạn Wyckoff**: Xác định các giai đoạn thị trường (Tích lũy, Tăng giá, Phân phối, Giảm giá) dựa trên các mô hình giá-khối lượng
4. **Hỗ Trợ/Kháng Cự với Khối Lượng**: Các mức quan trọng có ý nghĩa hơn khi đi kèm với khối lượng cao - tìm kiếm các đỉnh khối lượng tại hỗ trợ/kháng cự
5. **Xu Hướng Khối Lượng**: So sánh khối lượng hiện tại với khối lượng trung bình gần đây để đánh giá sự tin tưởng đằng sau các chuyển động giá
6. **Biến Động Giá Mạnh**: Phát hiện thay đổi vượt ±6.7%/ngày (giới hạn thị trường VN) và tra cứu tin tức/sự kiện gần đây để tìm nguyên nhân

## Phong Cách Giao Tiếp

- Cung cấp thông tin rõ ràng và hữu ích bằng tiếng Việt
- Hỗ trợ kết luận với các điểm dữ liệu cụ thể từ các ngữ cảnh được cung cấp
- Xác định các cơ hội và rủi ro chính dựa trên phân tích đa chiều
- Duy trì tính khách quan chuyên nghiệp trong khi dễ tiếp cận với nhà đầu tư cá nhân
- Luôn bao gồm tuyên bố miễn trừ trách nhiệm đầu tư phù hợp về rủi ro thị trường`);
	}

	// 2. MA Score Explanation
	if (language === "en") {
		sections.push(`=== MA Score: What It Is and How to Calculate ===

**Note**: The moving averages below use ${maType}.

## What is MA Score?

MA Score (Moving Average Score) is a momentum indicator that measures how far a stock's current price is trading above or below its moving average. It helps identify trend strength and momentum in the Vietnamese stock market.

## Calculation Formula

MA Score = ((Current Price - Moving Average) / Moving Average) × 100

Example:
- Current Price: 25,000 VND
- MA20 (20-day Moving Average): 23,000 VND
- MA Score = ((25,000 - 23,000) / 23,000) × 100 = +8.7%

## Interpretation

**Positive Scores (+%)**: Stock is trading above its moving average
- Indicates bullish momentum
- Price is in an uptrend relative to the moving average
- Higher positive percentage = stronger upward momentum

**Negative Scores (-%)**: Stock is trading below its moving average
- Indicates bearish momentum
- Price is in a downtrend relative to the moving average
- Higher negative percentage = stronger downward pressure

**Zero or Near Zero**: Stock is trading at or very close to its moving average
- Indicates equilibrium or transition phase
- May signal consolidation before next move

## Typical MA Periods

- **${maPrefix}10** (10-day): Very short-term momentum, highly reactive to recent price changes
- **${maPrefix}20** (20-day): Short-term trend, balanced between responsiveness and stability
- **${maPrefix}50** (50-day): Medium-term trend, commonly used for swing trading
- **${maPrefix}100** (100-day): Long-term trend, filters out medium-term noise
- **${maPrefix}200** (200-day): Major long-term trend indicator, used for identifying bull/bear markets

## Use Cases

1. **Trend Identification**: Consistently positive MA scores indicate strong uptrends
2. **Momentum Comparison**: Compare MA scores across stocks to identify relative strength
3. **Sector Rotation**: Track sector MA scores to identify which sectors are gaining/losing momentum
4. **Entry/Exit Signals**: Extreme positive or negative scores may signal overbought/oversold conditions`);
	} else {
		sections.push(`=== MA Score: Là Gì và Cách Tính ===

**Lưu ý**: Các đường trung bình dưới đây sử dụng ${maTypeVN}.

## MA Score là gì?

MA Score (Điểm Đường Trung Bình) là một chỉ báo động lực đo lường mức độ giá hiện tại của cổ phiếu đang giao dịch cao hơn hoặc thấp hơn bao nhiêu so với đường trung bình động của nó. Nó giúp xác định sức mạnh xu hướng và động lực trong thị trường chứng khoán Việt Nam.

## Công Thức Tính

MA Score = ((Giá Hiện Tại - Đường Trung Bình) / Đường Trung Bình) × 100

Ví dụ:
- Giá Hiện Tại: 25,000 VND
- MA20 (Đường trung bình 20 ngày): 23,000 VND
- MA Score = ((25,000 - 23,000) / 23,000) × 100 = +8.7%

## Cách Hiểu

**Điểm Dương (+%)**: Cổ phiếu đang giao dịch trên đường trung bình
- Cho thấy động lực tăng giá
- Giá đang trong xu hướng tăng so với đường trung bình
- Phần trăm dương cao hơn = động lực tăng mạnh hơn

**Điểm Âm (-%)**: Cổ phiếu đang giao dịch dưới đường trung bình
- Cho thấy động lực giảm giá
- Giá đang trong xu hướng giảm so với đường trung bình
- Phần trăm âm cao hơn = áp lực giảm mạnh hơn

**Bằng Không hoặc Gần Không**: Cổ phiếu đang giao dịch tại hoặc rất gần đường trung bình
- Cho thấy trạng thái cân bằng hoặc giai đoạn chuyển tiếp
- Có thể báo hiệu tích lũy trước bước di chuyển tiếp theo

## Các Chu Kỳ MA Phổ Biến

- **${maPrefix}10** (10 ngày): Động lực rất ngắn hạn, phản ứng rất nhanh với thay đổi giá gần đây
- **${maPrefix}20** (20 ngày): Xu hướng ngắn hạn, cân bằng giữa độ nhạy và ổn định
- **${maPrefix}50** (50 ngày): Xu hướng trung hạn, thường dùng cho giao dịch swing
- **${maPrefix}100** (100 ngày): Xu hướng dài hạn, lọc bỏ nhiễu trung hạn
- **${maPrefix}200** (200 ngày): Chỉ báo xu hướng dài hạn chính, dùng để xác định thị trường tăng/giảm

## Các Trường Hợp Sử Dụng

1. **Xác Định Xu Hướng**: MA score dương nhất quán cho thấy xu hướng tăng mạnh
2. **So Sánh Động Lực**: So sánh MA score giữa các cổ phiếu để xác định sức mạnh tương đối
3. **Luân Chuyển Ngành**: Theo dõi MA score ngành để xác định ngành nào đang tăng/mất động lực
4. **Tín Hiệu Vào/Ra**: MA score cực dương hoặc âm có thể báo hiệu điều kiện mua quá mức/bán quá mức`);
	}

	// 3. Investment Disclaimer
	if (language === "en") {
		sections.push(`=== Investment Disclaimer ===
All analysis and information provided by AIPriceAction are for informational and educational purposes only. This is NOT investment advice or a recommendation to buy, sell, or hold any securities.

Key Points:
- Investing in stocks involves significant risk of loss
- Past performance does not guarantee future results
- You should conduct your own research and due diligence
- Consider consulting with qualified financial advisors before making investment decisions
- AIPriceAction and its contributors are not responsible for any investment losses
- Market conditions can change rapidly and unexpectedly
- Always invest only what you can afford to lose`);
	} else {
		sections.push(`=== Tuyên Bố Miễn Trừ Trách Nhiệm ===
Tất cả phân tích và thông tin được cung cấp bởi AIPriceAction chỉ nhằm mục đích thông tin và giáo dục. Đây KHÔNG phải lời khuyên đầu tư hoặc khuyến nghị mua, bán hoặc nắm giữ bất kỳ chứng khoán nào.

Các Điểm Chính:
- Đầu tư vào cổ phiếu có nguy cơ mất vốn đáng kể
- Hiệu suất quá khứ không đảm bảo kết quả tương lai
- Bạn nên tự nghiên cứu và thẩm định kỹ lưỡng
- Cân nhắc tham khảo ý kiến cố vấn tài chính có trình độ trước khi đưa ra quyết định đầu tư
- AIPriceAction và các cộng tác viên không chịu trách nhiệm cho bất kỳ tổn thất đầu tư nào
- Điều kiện thị trường có thể thay đổi nhanh chóng và không lường trước
- Luôn chỉ đầu tư số tiền bạn có thể chấp nhận mất`);
	}

	// 4. Ticker Info
	const tickerInfoLines: string[] = [];
	if (tickerInfo.name || tickerInfo.groups.length > 0) {
		if (language === "en") {
			tickerInfoLines.push("");
			tickerInfoLines.push("=== Ticker Info ===");
			tickerInfoLines.push("");
			if (tickerInfo.name) {
				tickerInfoLines.push(`Name: ${tickerInfo.name}`);
			}
			if (tickerInfo.groups.length > 0) {
				tickerInfoLines.push(`Sector: ${tickerInfo.groups.join(", ")}`);
			}
		} else {
			tickerInfoLines.push("");
			tickerInfoLines.push("=== Thông Tin Mã CK ===");
			tickerInfoLines.push("");
			if (tickerInfo.name) {
				tickerInfoLines.push(`Tên: ${tickerInfo.name}`);
			}
			if (tickerInfo.groups.length > 0) {
				tickerInfoLines.push(`Ngành: ${tickerInfo.groups.join(", ")}`);
			}
		}
		sections.push(tickerInfoLines.join("\n"));
	}

	// 5. Market Data
	if (data && data.length > 0) {
		const marketDataLines: string[] = [];

		if (language === "en") {
			marketDataLines.push("=== Market Data ===");
			marketDataLines.push("");
			marketDataLines.push(
				`Historical OHLCV data with ${maType} moving averages and momentum indicators for ${ticker}. Each line represents one trading period with explicit key-value pairs.`,
			);
			marketDataLines.push("");
		} else {
			marketDataLines.push("=== Dữ Liệu Thị Trường ===");
			marketDataLines.push("");
			marketDataLines.push(
				`Dữ liệu OHLCV lịch sử với đường trung bình động ${maTypeVN} và chỉ báo động lực cho ${ticker}. Mỗi dòng đại diện cho một phiên giao dịch với các cặp key-value rõ ràng.`,
			);
			marketDataLines.push("");
		}

		const sortedData = [...data].sort((a, b) => a.time.localeCompare(b.time));

		marketDataLines.push(`## ${ticker} (${sortedData.length} records)`);

		for (const record of sortedData as readonly StockData[]) {
			const fields: string[] = [];

			const date = parseUTCISOString(record.time);
			let formattedTime: string;

			if (["1D", "2W", "1M"].includes(interval)) {
				formattedTime = formatToVietnamDate(date);
			} else {
				formattedTime = formatToVietnamTime(date);
			}

			fields.push(`ticker=${record.symbol || ticker}`);
			fields.push(`time=${formattedTime}`);
			fields.push(`open=${record.open.toFixed(2)}`);
			fields.push(`high=${record.high.toFixed(2)}`);
			fields.push(`low=${record.low.toFixed(2)}`);
			fields.push(`close=${record.close.toFixed(2)}`);
			fields.push(`volume=${record.volume}`);

			if (record.ma10 !== null && record.ma10 !== undefined) {
				fields.push(`ma10=${record.ma10.toFixed(2)}`);
			}
			if (record.ma20 !== null && record.ma20 !== undefined) {
				fields.push(`ma20=${record.ma20.toFixed(2)}`);
			}
			if (record.ma50 !== null && record.ma50 !== undefined) {
				fields.push(`ma50=${record.ma50.toFixed(2)}`);
			}
			if (record.ma100 !== null && record.ma100 !== undefined) {
				fields.push(`ma100=${record.ma100.toFixed(2)}`);
			}
			if (record.ma200 !== null && record.ma200 !== undefined) {
				fields.push(`ma200=${record.ma200.toFixed(2)}`);
			}

			if (record.ma10_score !== null && record.ma10_score !== undefined) {
				fields.push(`ma10_score=${record.ma10_score.toFixed(2)}`);
			}
			if (record.ma20_score !== null && record.ma20_score !== undefined) {
				fields.push(`ma20_score=${record.ma20_score.toFixed(2)}`);
			}
			if (record.ma50_score !== null && record.ma50_score !== undefined) {
				fields.push(`ma50_score=${record.ma50_score.toFixed(2)}`);
			}
			if (record.ma100_score !== null && record.ma100_score !== undefined) {
				fields.push(`ma100_score=${record.ma100_score.toFixed(2)}`);
			}
			if (record.ma200_score !== null && record.ma200_score !== undefined) {
				fields.push(`ma200_score=${record.ma200_score.toFixed(2)}`);
			}

			if (record.close_changed !== null && record.close_changed !== undefined) {
				fields.push(`close_changed=${record.close_changed.toFixed(2)}`);
			}
			if (
				record.volume_changed !== null &&
				record.volume_changed !== undefined
			) {
				fields.push(`volume_changed=${record.volume_changed.toFixed(2)}`);
			}

			marketDataLines.push(fields.join(" "));
		}

		sections.push(marketDataLines.join("\n"));
	}

	// 5. Trading Hours Notice
	if (isTradingHours && data && data.length > 0) {
		if (language === "en") {
			sections.push(
				"=== Trading Hours Notice ===\n\n⚠️ TRADING HOURS NOTICE: The market is currently open. The most recent data record shows incomplete volume as the trading session is still in progress. Volume figures will be lower than typical historical values until market close.",
			);
		} else {
			sections.push(
				"=== Thông Báo Giờ Giao Dịch ===\n\n⚠️ THÔNG BÁO GIỜ GIAO DỊCH: Thị trường đang mở cửa. Bản ghi dữ liệu gần nhất hiển thị khối lượng chưa đầy đủ vì phiên giao dịch đang diễn ra. Con số khối lượng sẽ thấp hơn các giá trị lịch sử thông thường cho đến khi thị trường đóng cửa.",
			);
		}
	}

	return sections.join("\n\n");
}

export function AIContextTab({ ticker, endDate }: AIContextTabProps) {
	const { t, language } = useTranslation();
	const {
		getTickers,
		getHealth,
		tickers,
		cryptoTickers,
		globalTickers,
		tickerGroups,
		cryptoTickerGroups,
		globalTickerGroups,
		tickerNames,
		cryptoTickerNames,
		globalTickerNames,
		ema,
	} = useAPI();
	const { lastRefresh } = useRefresh();

	const [interval, setInterval] = React.useState("1D");
	const [limit, setLimit] = React.useState(60);
	const [marketData, setMarketData] = React.useState<StockData[] | null>(null);
	const [isFetching, setIsFetching] = React.useState(false);
	const [isTradingHours, setIsTradingHours] = React.useState(false);
	const [copied, setCopied] = React.useState(false);
	const [copiedQuestion, setCopiedQuestion] = React.useState<number | null>(
		null,
	);

	// Fetch health status for trading hours
	React.useEffect(() => {
		const fetchHealth = async () => {
			try {
				const health = await getHealth("AIContextTab.tradingHours");
				setIsTradingHours(health.is_trading_hours);
			} catch {
				// ignore
			}
		};
		fetchHealth();
	}, [getHealth]);

	// Fetch market data
	React.useEffect(() => {
		if (!ticker) return;

		// Include lastRefresh to re-fetch on auto-refresh
		void lastRefresh;

		const fetchData = async () => {
			setIsFetching(true);
			try {
				const mode = getTickerMode(
					ticker,
					tickers,
					globalTickers,
					cryptoTickers,
				);
				const data = await getTickers("AIContextTab.fetch", {
					symbol: [ticker],
					limit,
					interval,
					end_date: endDate ?? undefined,
					mode,
					ema: ema || undefined,
				});
				setMarketData(data[ticker] || null);
			} catch (error) {
				console.error("Failed to fetch market data for AI context:", error);
				setMarketData(null);
			} finally {
				setIsFetching(false);
			}
		};

		fetchData();
	}, [
		ticker,
		limit,
		interval,
		getTickers,
		lastRefresh,
		endDate,
		tickers,
		cryptoTickers,
		globalTickers,
		ema,
	]);

	const tickerInfo = React.useMemo(() => {
		const name =
			tickerNames?.[ticker] ??
			cryptoTickerNames?.[ticker] ??
			globalTickerNames?.[ticker];

		const groups: string[] = [];
		const allGroups: Record<string, TickerGroups | null> = {
			vn: tickerGroups,
			crypto: cryptoTickerGroups,
			yahoo: globalTickerGroups,
		};
		for (const [, groupsMap] of Object.entries(allGroups)) {
			if (!groupsMap) continue;
			for (const [groupKey, tickers] of Object.entries(groupsMap)) {
				if (tickers.includes(ticker)) {
					const displayName = getSectorDisplayName(groupKey, language);
					if (!groups.includes(displayName)) {
						groups.push(displayName);
					}
				}
			}
		}

		return { name, groups };
	}, [
		ticker,
		tickerNames,
		cryptoTickerNames,
		globalTickerNames,
		tickerGroups,
		cryptoTickerGroups,
		globalTickerGroups,
		language,
	]);

	const aiContext = React.useMemo(() => {
		if (!marketData || marketData.length === 0) return "";
		return buildSingleTickerContext(
			language,
			ticker,
			marketData,
			interval,
			isTradingHours,
			!!ema,
			tickerInfo,
		);
	}, [language, ticker, marketData, interval, isTradingHours, ema, tickerInfo]);

	const questions = React.useMemo(
		() => [
			{
				title: language === "en" ? "Trading Opportunity" : "Cơ Hội Giao Dịch",
				snippet:
					language === "en"
						? "Identify entry/exit levels, risk-reward ratio, volume confirmation and key risks"
						: "Xác định mức vào/ra, tỷ lệ rủi ro-phần thưởng, xác nhận khối lượng và rủi ro chính",
				question:
					language === "en"
						? `Identify any actionable trading opportunities for ${ticker} based on the data. Consider entry/exit levels, risk-reward ratio, and volume confirmation. What are the key risks to watch?`
						: `Xác định các cơ hội giao dịch có thể hành động cho ${ticker} dựa trên dữ liệu. Cân nhắc các mức vào/ra, tỷ lệ rủi ro-phần thưởng, và xác nhận khối lượng. Các rủi ro chính cần theo dõi là gì?`,
			},
			{
				title:
					language === "en"
						? "News & Events Research"
						: "Tìm Kiếm Tin Tức & Sự Kiện",
				snippet:
					language === "en"
						? "Detect extreme price moves and unusual volume, research potential causes"
						: "Phát hiện biến động giá mạnh và khối lượng bất thường, tìm nguyên nhân tiềm năng",
				question:
					language === "en"
						? `Check if ${ticker} moved more than ±6.7% in a single day or shows unusual volume patterns. For each significant move, search recent news and events to understand what caused it.`
						: `Kiểm tra xem ${ticker} có thay đổi quá ±6.7% trong ngày hoặc khối lượng bất thường không. Đối với mỗi biến động lớn, tìm tin tức và sự kiện gần đây để hiểu nguyên nhân.`,
			},
			{
				title:
					language === "en"
						? "Price Action & Volume"
						: "Hành Động Giá & Khối Lượng",
				snippet:
					language === "en"
						? "Analyze price action, volume patterns, support/resistance, and smart money behavior"
						: "Phân tích hành động giá, mô hình khối lượng, hỗ trợ/kháng cự và hành vi tiền thông minh",
				question:
					language === "en"
						? `Analyze the price action and volume patterns for ${ticker}. Identify the current trend, key support/resistance levels, and any notable volume anomalies. What does the price-volume relationship suggest about smart money behavior?`
						: `Phân tích hành động giá và mô hình khối lượng cho ${ticker}. Xác định xu hướng hiện tại, các mức hỗ trợ/kháng cự chính, và bất thường kỳ về khối lượng. Mối quan hệ giá-khối lượng cho thấy điều gì về hành vi tiền thông minh?`,
			},
			{
				title:
					language === "en" ? "MA Momentum & Trend" : "Động Lực MA & Xu Hướng",
				snippet:
					language === "en"
						? "Assess momentum across timeframes, MA alignment, crossovers and divergences"
						: "Đánh giá động lực trên các khung thời gian, xếp hạng MA, cắt chéo và phân kỳ",
				question:
					language === "en"
						? `Based on the MA scores and moving averages for ${ticker}, assess the current momentum across all timeframes. Are the MAs aligning bullishly or bearishly? What potential signals do the MA crossovers or divergences suggest?`
						: `Dựa trên điểm MA và đường trung bình cho ${ticker}, đánh giá động lực hiện tại trên tất cả các khung thời gian. Các đường MA đang xếp hạng tăng hay giảm? Các tín hiệu cắt chéo hay phân kỳ MA cho thấy điều gì?`,
			},
			{
				title:
					language === "en"
						? "Wyckoff Method Analysis"
						: "Phân Tích Phương Pháp Wyckoff",
				snippet:
					language === "en"
						? "Identify accumulation/distribution phases, springs, upthrusts, and price targets"
						: "Nhận diện giai đoạn tích lũy/phân phối, spring/upthrust và mục tiêu giá",
				question:
					language === "en"
						? `Analyze ${ticker} using the Wyckoff Method. (1) Determine the current Wyckoff phase — Accumulation (A–E), Markup, Distribution (A–E), or Markdown based on price-volume behavior. (2) Identify key Wyckoff events: Springs, Upthrusts, Sign of Strength (SOS), Sign of Weakness (SOW), Last Point of Support (LPS), and Last Point of Supply (LPSY). (3) Estimate a price target using Wyckoff's horizontal counting method. (4) Analyze volume patterns — effort vs result — to confirm whether smart money is accumulating or distributing.`
						: `Phân tích ${ticker} theo Phương Pháp Wyckoff. (1) Xác định giai đoạn Wyckoff hiện tại — Tích lũy (A–E), Tăng Giá, Phân Phối (A–E), hoặc Giảm Giá dựa trên hành vi giá và khối lượng. (2) Nhận diện các sự kiện Wyckoff quan trọng: Spring, Upthrust, Sign of Strength (SOS), Sign of Weakness (SOW), Last Point of Support (LPS), và Last Point of Supply (LPSY). (3) Ước tính mục tiêu giá theo phương pháp đếm ngang của Wyckoff. (4) Phân tích mô hình khối lượng — so sánh nỗ lực và kết quả — để xác nhận dòng tiền thông minh đang tích lũy hay phân phối.`,
			},
			{
				title:
					language === "en"
						? "Bob Volman Price Action"
						: "Hành Động Giá Bob Volman",
				snippet:
					language === "en"
						? "Micro pullback entries, breakout confirmations, and fading setups at key levels"
						: "Điểm vào lệnh micro pullback, xác nhận breakout và thiết lập fading tại vùng cản",
				question:
					language === "en"
						? `Analyze ${ticker} using Bob Volman's price action methodology. (1) Identify the dominant trend using swing highs and lows. (2) Look for micro pullback setups — a pullback of 3+ consecutive bars against the trend followed by a reversal bar or breakout candle. (3) Identify breakout setups where price breaks a significant level on strong momentum. (4) Check for fading setups at key support/resistance where price action shows rejection patterns (pin bars, engulfing). (5) Assess volume behavior at key levels to confirm or deny each setup.`
						: `Phân tích ${ticker} theo phương pháp hành động giá của Bob Volman. (1) Xác định xu hướng chủ đạo thông qua các đỉnh và đáy dao động. (2) Tìm các thiết lập micro pullback — nhịp điều chỉnh 3+ nến liên tiếp ngược xu hướng, theo sau bởi nến đảo chiều hoặc nến breakout. (3) Nhận diện các thiết lập breakout khi giá phá vỡ một mức quan trọng với động lực mạnh. (4) Kiểm tra các thiết lập fading tại vùng hỗ trợ/kháng cự chính khi hành động giá cho thấy mô hình từ chối (pin bar, engulfing). (5) Đánh giá hành vi khối lượng tại các mức quan trọng để xác nhận hoặc phủ nhận từng thiết lập.`,
			},
		],
		[language, ticker],
	);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(aiContext);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	const handleCopyQuestion = async (index: number, question: string) => {
		try {
			const contextWithQuestion = `${aiContext}\n\n=== Question ===\n${question}`;
			await navigator.clipboard.writeText(contextWithQuestion);
			setCopiedQuestion(index);
			setTimeout(() => setCopiedQuestion(null), 2000);
		} catch (err) {
			console.error("Failed to copy template:", err);
		}
	};

	return (
		<div className="flex flex-col gap-3 p-1">
			{/* Controls Row */}
			<div className="flex items-center gap-2 flex-shrink-0">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
						Interval
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

				<div className="flex items-center gap-2">
					<span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
						Candles
					</span>
					<Select
						value={limit.toString()}
						onValueChange={(v) => setLimit(Number(v))}
					>
						<SelectTrigger className="w-[72px] h-8 text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="10">10</SelectItem>
							<SelectItem value="20">20</SelectItem>
							<SelectItem value="30">30</SelectItem>
							<SelectItem value="60">60</SelectItem>
							<SelectItem value="100">100</SelectItem>
							<SelectItem value="120">120</SelectItem>
							<SelectItem value="160">160</SelectItem>
							<SelectItem value="200">200</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{isFetching && (
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />
				)}
			</div>

			{/* Textarea - fixed short height */}
			<textarea
				readOnly
				value={aiContext}
				className="w-full h-[180px] md:h-[360px] lg:h-[480px] p-3 font-mono text-xs border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-muted/50 overflow-y-auto"
				style={{ whiteSpace: "pre-wrap" }}
			/>

			{/* Copy Button */}
			<div className="flex justify-end">
				<Button
					onClick={handleCopy}
					variant={copied ? "default" : "outline"}
					size="sm"
					disabled={!aiContext}
					className={`min-w-[100px] ${
						copied
							? "bg-green-500 hover:bg-green-600 text-white"
							: "border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950"
					}`}
				>
					{copied ? (
						<>
							<Check className="mr-1.5 h-3.5 w-3.5" />
							{t("common.aiContext.copied")}
						</>
					) : (
						<>
							<Copy className="mr-1.5 h-3.5 w-3.5" />
							{t("common.aiContext.copyButton")}
						</>
					)}
				</Button>
			</div>

			{/* Quick Questions */}
			<div className="space-y-3">
				<div>
					<h3 className="font-semibold text-sm">
						{t("templates.sectionTitle")}
					</h3>
					<p className="text-xs text-muted-foreground">
						{t("templates.sectionDescription")}
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{questions.map((q, index) => {
						const isCopied = copiedQuestion === index;
						return (
							<Card
								key={q.title}
								className="hover:border-primary/50 transition-colors cursor-pointer p-4"
								onClick={() => handleCopyQuestion(index, q.question)}
							>
								<h3 className="text-sm font-semibold mb-1.5">{q.title}</h3>
								<p className="text-xs text-muted-foreground line-clamp-2 mb-3">
									{q.snippet}
								</p>
								<Button
									variant={isCopied ? "default" : "outline"}
									size="sm"
									disabled={!aiContext}
									className={`w-full text-xs ${
										isCopied
											? "bg-green-500 hover:bg-green-600 text-white"
											: "border-green-500 text-green-600 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-950"
									}`}
									onClick={(e) => {
										e.stopPropagation();
										handleCopyQuestion(index, q.question);
									}}
								>
									{isCopied ? (
										<>
											<Check className="mr-1.5 h-3 w-3" />
											{t("templates.templateCopied")}
										</>
									) : (
										<>
											<Copy className="mr-1.5 h-3 w-3" />
											{t("templates.copyTemplate")}
										</>
									)}
								</Button>
							</Card>
						);
					})}
				</div>
			</div>
		</div>
	);
}
