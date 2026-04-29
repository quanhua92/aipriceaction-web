import { Check, Copy, Globe, Loader2 } from "lucide-react";
import * as React from "react";
import { SelectTickerDialog } from "@/components/dialogs/SelectTickerDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAPI } from "@/contexts/APIContext";
import { useRefresh } from "@/contexts/RefreshContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { useTranslation } from "@/hooks/useTranslation";
import type { StockData, TickerGroups } from "@/integrations/aipriceaction/src";
import { AI_CONTEXT_REFERENCE_STORAGE_KEY } from "@/lib/constants";
import {
	formatToVietnamDate,
	formatToVietnamTime,
	parseUTCISOString,
} from "@/lib/format";
import { SafeLocalStorage } from "@/lib/localStorage";
import { getSectorDisplayName } from "@/lib/sector-names";
import { getTickerMode } from "@/lib/ticker-utils";

interface AIContextTabProps {
	ticker: string;
	endDate?: string | null;
}

interface ReferenceState {
	enabled: boolean;
	ticker: string;
}

function loadReferenceState(): ReferenceState {
	const defaults: ReferenceState = { enabled: true, ticker: "VNINDEX" };
	const stored = SafeLocalStorage.getItem(AI_CONTEXT_REFERENCE_STORAGE_KEY);
	if (stored) {
		try {
			const parsed = JSON.parse(stored);
			return {
				enabled:
					typeof parsed.enabled === "boolean"
						? parsed.enabled
						: defaults.enabled,
				ticker:
					typeof parsed.ticker === "string" && parsed.ticker
						? parsed.ticker
						: defaults.ticker,
			};
		} catch {
			// fall through
		}
	}
	return { ...defaults };
}

function buildTickerDataLines(
	ticker: string,
	data: StockData[],
	interval: string,
): string[] {
	const lines: string[] = [];
	const sortedData = [...data].sort((a, b) => a.time.localeCompare(b.time));

	lines.push(`## ${ticker} (${sortedData.length} records)`);

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
		if (record.volume_changed !== null && record.volume_changed !== undefined) {
			fields.push(`volume_changed=${record.volume_changed.toFixed(2)}`);
		}

		lines.push(fields.join(" "));
	}

	return lines;
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
	referenceData?: StockData[] | null,
	referenceTicker?: string,
	referenceInfo?: {
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

IMPORTANT: You MUST respond entirely in English.

## Data Usage Policy (CRITICAL — YOU MUST FOLLOW THIS STRICTLY)

1. **ONLY use data explicitly provided in the context below.** You must NEVER generate, guess, estimate, or hallucinate any numbers — prices, volumes, MA values, MA scores, percentages, dates, or any financial data.
2. **NEVER mention a specific number unless it appears verbatim in the provided context.** If you are unsure whether a number is correct, do NOT mention it. Say "Based on the provided data..." to make clear your analysis is scoped to what was given.
3. **When the user asks about something NOT covered by the provided data** (e.g., other tickers, different timeframes, news, macro data), respond by asking the user to copy-paste the relevant data from the **"AI Context" tab** at https://aipriceaction.com/ and paste it here. Do NOT attempt to answer from memory.
4. **Do NOT ask follow-up questions** like "Do you want me to compare with other stocks?", "Do you need analysis of another ticker?", "Should I analyze another sector?". These questions imply you can provide data you do not actually have. Instead, guide the user to paste more data from the AI Context UI if they need broader analysis.
5. **After completing your analysis, stop.** Do not offer to analyze additional tickers, timeframes, or data that was not provided. Your role is to analyze the data the user gave you — nothing more.
6. **When researching news or events, ALWAYS include the source name for every piece of information.** Every news finding must be accompanied by the source (e.g., "Nguồn: CafeF", "Nguồn: VNExpress", "Nguồn: Báo Đầu Tư"). If a URL is available, include it as well. If your search tool returns no results, you must say so explicitly — never fabricate news or cite non-existent sources.

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

- Provide clear, useful and actionable insights in English
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

QUAN TRỌNG: Bạn PHẢI trả lời hoàn toàn bằng tiếng Việt.

## Chính Sách Sử Dụng Dữ Liệu (QUAN TRỌNG — BẮT BUỘC TUÂN THỦ)

1. **CHỈ sử dụng dữ liệu được cung cấp rõ ràng trong ngữ cảnh bên dưới.** Bạn KHÔNG ĐƯỢC tự tạo, đoán, ước tính, hoặc bịa ra bất kỳ con số nào — giá, khối lượng, giá trị đường trung bình, điểm MA, phần trăm, ngày tháng, hoặc bất kỳ dữ liệu tài chính nào.
2. **KHÔNG ĐƯỢC nhắc đến một con số cụ thể nếu nó không xuất hiện nguyên văn trong ngữ cảnh được cung cấp.** Nếu bạn không chắc một con số có chính xác không, tuyệt đối KHÔNG nhắc đến nó. Hãy nói "Dựa trên dữ liệu được cung cấp..." để làm rõ rằng phân tích của bạn chỉ giới hạn trong những gì đã được cung cấp.
3. **Khi người dùng hỏi về nội dung KHÔNG nằm trong dữ liệu đã cung cấp** (ví dụ: mã chứng khoán khác, khung thời gian khác, tin tức, dữ liệu vĩ mô), hãy yêu cầu người dùng sao chép và dán dữ liệu liên quan từ mục **"AI Context"** trên website https://aipriceaction.com/ vào đây. KHÔNG cố gắng trả lời từ trí nhớ.
4. **KHÔNG đặt câu hỏi mở rộng** như "Bạn có muốn tôi so sánh với mã khác không?", "Bạn cần tôi phân tích thêm mã nào không?", "Bạn có cần tôi phân tích thêm ngành nào không?". Những câu hỏi này ngụ ý rằng bạn có thể cung cấp dữ liệu mà thực tế bạn không có. Thay vào đó, hãy hướng dẫn người dùng sao chép thêm dữ liệu từ mục "AI Context" nếu họ cần phân tích rộng hơn.
5. **Sau khi hoàn thành phân tích, hãy dừng lại.** KHÔNG đề nghị phân tích thêm mã chứng khoán, khung thời gian, hoặc dữ liệu không được cung cấp. Vai trò của bạn là phân tích dữ liệu người dùng đã cung cấp — không hơn.
6. **Khi tìm kiếm tin tức hoặc sự kiện, LUÔN đính kèm tên nguồn cho mọi thông tin.** Mọi thông tin tin tức phải đi kèm nguồn (ví dụ: "Nguồn: CafeF", "Nguồn: VNExpress", "Nguồn: Báo Đầu Tư"). Nếu có đường dẫn, hãy đưa thêm. Nếu công cụ tìm kiếm không trả về kết quả nào, bạn PHẢI nói rõ điều đó — tuyệt đối KHÔNG bịa tin tức hoặc trích dẫn nguồn không tồn tại.

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
	const hasReference =
		referenceData && referenceData.length > 0 && referenceTicker;
	if (tickerInfo.name || tickerInfo.groups.length > 0 || hasReference) {
		if (language === "en") {
			tickerInfoLines.push("");
			tickerInfoLines.push("=== Ticker Info ===");
			tickerInfoLines.push("");
			if (hasReference) {
				const refParts: string[] = [
					`${referenceTicker} — Reference Ticker (use for market context comparison)`,
				];
				if (referenceInfo?.name) refParts.push(referenceInfo.name);
				if (referenceInfo?.groups?.length)
					refParts.push(`[${referenceInfo.groups.join(", ")}]`);
				tickerInfoLines.push(refParts.join(" - "));
			}
			tickerInfoLines.push(
				`${ticker} — Primary Ticker (subject of analysis)${tickerInfo.name ? ` - ${tickerInfo.name}` : ""}${tickerInfo.groups.length > 0 ? ` [${tickerInfo.groups.join(", ")}]` : ""}`,
			);
		} else {
			tickerInfoLines.push("");
			tickerInfoLines.push("=== Thông Tin Mã CK ===");
			tickerInfoLines.push("");
			if (hasReference) {
				const refParts: string[] = [
					`${referenceTicker} — Mã Tham Chiếu (dùng để so sánh bối cảnh thị trường)`,
				];
				if (referenceInfo?.name) refParts.push(referenceInfo.name);
				if (referenceInfo?.groups?.length)
					refParts.push(`[${referenceInfo.groups.join(", ")}]`);
				tickerInfoLines.push(refParts.join(" - "));
			}
			tickerInfoLines.push(
				`${ticker} — Mã Chính (đối tượng phân tích)${tickerInfo.name ? ` - ${tickerInfo.name}` : ""}${tickerInfo.groups.length > 0 ? ` [${tickerInfo.groups.join(", ")}]` : ""}`,
			);
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
				`Historical OHLCV data with ${maType} moving averages and momentum indicators for ${hasReference ? `${referenceTicker} (reference) and ` : ""}${ticker}. Each line represents one trading period with explicit key-value pairs.`,
			);
			marketDataLines.push("");
		} else {
			marketDataLines.push("=== Dữ Liệu Thị Trường ===");
			marketDataLines.push("");
			marketDataLines.push(
				`Dữ liệu OHLCV lịch sử với đường trung bình động ${maTypeVN} và chỉ báo động lực cho ${hasReference ? `${referenceTicker} (tham chiếu) và ` : ""}${ticker}. Mỗi dòng đại diện cho một phiên giao dịch với các cặp key-value rõ ràng.`,
			);
			marketDataLines.push("");
		}

		// Reference ticker data FIRST (before main ticker)
		if (hasReference) {
			marketDataLines.push(
				...buildTickerDataLines(referenceTicker, referenceData, interval),
			);
			marketDataLines.push("");
		}

		// Main ticker data
		marketDataLines.push(...buildTickerDataLines(ticker, data, interval));

		sections.push(marketDataLines.join("\n"));
	}

	// 6. Trading Hours Notice
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
	const referenceSwitchId = React.useId();
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
	const { setLanguage } = useSiteSettings();

	const [interval, setInterval] = React.useState("1D");
	const [limit, setLimit] = React.useState(60);
	const [marketData, setMarketData] = React.useState<StockData[] | null>(null);
	const [referenceData, setReferenceData] = React.useState<StockData[] | null>(
		null,
	);
	const [isFetching, setIsFetching] = React.useState(false);
	const [isTradingHours, setIsTradingHours] = React.useState(false);
	const [copied, setCopied] = React.useState(false);
	const [copiedQuestion, setCopiedQuestion] = React.useState<number | null>(
		null,
	);

	// Reference ticker state (persisted)
	const [referenceState, setReferenceState] = React.useState<ReferenceState>(
		() => loadReferenceState(),
	);

	const updateReferenceState = (partial: Partial<ReferenceState>) => {
		setReferenceState((prev) => {
			const next = { ...prev, ...partial };
			SafeLocalStorage.setItem(
				AI_CONTEXT_REFERENCE_STORAGE_KEY,
				JSON.stringify(next),
			);
			return next;
		});
	};

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

	// Fetch market data (main + optional reference)
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

				// Fetch reference ticker data if enabled
				if (
					referenceState.enabled &&
					referenceState.ticker &&
					referenceState.ticker !== ticker
				) {
					const refMode = getTickerMode(
						referenceState.ticker,
						tickers,
						globalTickers,
						cryptoTickers,
					);
					const refData = await getTickers("AIContextTab.fetchReference", {
						symbol: [referenceState.ticker],
						limit,
						interval,
						end_date: endDate ?? undefined,
						mode: refMode,
						ema: ema || undefined,
					});
					setReferenceData(refData[referenceState.ticker] || null);
				} else {
					setReferenceData(null);
				}
			} catch (error) {
				console.error("Failed to fetch market data for AI context:", error);
				setMarketData(null);
				setReferenceData(null);
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
		referenceState.enabled,
		referenceState.ticker,
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

	const referenceTickerInfo = React.useMemo(() => {
		if (!referenceState.ticker)
			return { name: undefined, groups: [] as string[] };
		const name =
			tickerNames?.[referenceState.ticker] ??
			cryptoTickerNames?.[referenceState.ticker] ??
			globalTickerNames?.[referenceState.ticker];

		const groups: string[] = [];
		const allGroups: Record<string, TickerGroups | null> = {
			vn: tickerGroups,
			crypto: cryptoTickerGroups,
			yahoo: globalTickerGroups,
		};
		for (const [, groupsMap] of Object.entries(allGroups)) {
			if (!groupsMap) continue;
			for (const [groupKey, tickers] of Object.entries(groupsMap)) {
				if (tickers.includes(referenceState.ticker)) {
					const displayName = getSectorDisplayName(groupKey, language);
					if (!groups.includes(displayName)) {
						groups.push(displayName);
					}
				}
			}
		}

		return { name, groups };
	}, [
		referenceState.ticker,
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
			referenceState.enabled ? referenceData : null,
			referenceState.ticker,
			referenceTickerInfo,
		);
	}, [
		language,
		ticker,
		marketData,
		interval,
		isTradingHours,
		ema,
		tickerInfo,
		referenceState.enabled,
		referenceState.ticker,
		referenceData,
		referenceTickerInfo,
	]);

	const questions = React.useMemo(
		() => [
			{
				title: language === "en" ? "Trading Opportunity" : "Cơ Hội Giao Dịch",
				snippet:
					language === "en"
						? "Identify opportunities, supply-demand analysis, position sizing roadmap, and risk management"
						: "Nhận diện cơ hội giao dịch, phân tích cung-cầu, lộ trình giải ngân và quản trị rủi ro",
				question:
					language === "en"
						? `1. Identify actionable trading opportunities for ${ticker} based on current data and overall market context.\n\n2. Identify 'Smart Money' behavior: Specify confirmation signals (No Supply, Test for Supply, Spring, Upthrust, or SOS) at key price zones, along with an assessment of the asymmetry between Effort (Volume) and Result (Price).\n\nIMPORTANT: If the market is currently open, the Volume of the latest bar must be considered incomplete. In this case, NEVER assertively conclude 'Supply Exhaustion'. Instead, note that the signal is still forming and needs confirmation after the ATC session closes.\n\n3. Establish a practical deployment roadmap: Clearly differentiate between exploratory position sizing (at low Volume zones) and scaled-up positions (upon Effort-Result confirmation), with specific Stop Loss (SL) levels based on Wyckoff structure violations.\n\n4. Consider the risk-reward ratio and key risks to monitor (Buying Climax, Upthrust, or VNINDEX-related risks).`
						: `1. Xác định các cơ hội giao dịch có thể hành động cho ${ticker} dựa trên dữ liệu hiện tại và bối cảnh thị trường chung.\n\n2. Nhận diện hành vi 'Smart Money': Chỉ rõ các tín hiệu xác nhận (No Supply, Test for Supply, Spring, Upthrust, hay SOS) tại các vùng giá then chốt, kèm theo đánh giá sự bất đối xứng giữa Nỗ lực (Volume) và Kết quả (Giá).\n\nLƯU Ý QUAN TRỌNG: Nếu có thông báo 'Thị trường đang mở cửa', phải coi dữ liệu Volume của bản ghi cuối cùng là chưa hoàn tất. Trong trường hợp này, tuyệt đối không kết luận 'Kiệt cung' một cách khẳng định. Thay vào đó, phải đưa ra ghi chú rằng đây là tín hiệu đang hình thành và cần được xác nhận lại sau khi đóng phiên ATC.\n\n3. Thiết lập lộ trình giải ngân thực chiến: Chia rõ tỷ lệ vị thế thăm dò (tại vùng Vol thấp) và vị thế gia tăng (khi có xác nhận Nỗ lực-Kết quả), kèm theo điểm Stop Loss (SL) cụ thể dựa trên vi phạm cấu trúc Wyckoff.\n\n4. Cân nhắc tỷ lệ rủi ro-phần thưởng và các rủi ro chính cần theo dõi (Buying Climax, Upthrust, hay rủi ro từ VNINDEX).`,
			},
			{
				title:
					language === "en"
						? "News & Events Research"
						: "Tìm Kiếm Tin Tức & Sự Kiện",
				snippet:
					language === "en"
						? "Detect extreme moves, research causes, combine with VPA/Wyckoff analysis"
						: "Phát hiện biến động giá mạnh, tra cứu nguyên nhân, kết hợp phân tích VPA & Wyckoff",
				question:
					language === "en"
						? `1. Detect extreme moves: Check if ${ticker} changed more than ±6.7% or Volume exceeded >150% of the 20-period average.\n\n2. CRITICAL — Perform a real internet search NOW: If significant moves are detected, you MUST use your web search tool RIGHT NOW to search for recent news about ${ticker}. Search queries must include the ticker name, date, and keywords like "earnings", "financial report", or "corporate event". DO NOT generate or hallucinate news — only report facts from actual search results. Cite the source URL for each piece of information. If your search tool returns no results, say so explicitly.\n\n3. VPA & Wyckoff analysis: Combine ONLY verified search findings with price/volume data. Is this Effort or Result? Is the news being used to "rationalize" an Accumulation or Distribution process?\n\n4. Action & risk management: Based on verified news and technicals, identify supply exhaustion zones (quantified), entry/exit levels, and Stop Loss.`
						: `1. Kiểm tra biến động cực đại: Xác định xem ${ticker} có thay đổi giá quá ±6.7% hoặc khối lượng (Volume) vượt >150% trung bình 20 phiên không.\n\n2. BẮT BUỘC — Thực hiện tìm kiếm internet thực tế NGAY LẬP TỨC: Nếu phát hiện biến động lớn, bạn PHẢI sử dụng công cụ tìm kiếm web NGAY LẬP TỨC để tìm tin tức gần đây về ${ticker}. Truy vấn tìm kiếm phải bao gồm tên mã, ngày và từ khóa như "báo cáo tài chính", "sự kiện doanh nghiệp", "tin tức vĩ mô". KHÔNG tự bịa hoặc bịa ra tin tức — chỉ báo cáo sự thật từ kết quả tìm kiếm thực tế. Trích dẫn URL nguồn cho mỗi thông tin. Nếu tìm kiếm không trả về kết quả nào, phải nói rõ điều đó.\n\n3. Phân tích VPA & Wyckoff: Kết hợp CHỈ thông tin đã xác minh từ tìm kiếm với dữ liệu giá/khối lượng. Đây là Nỗ lực (Effort) hay Kết quả (Result)? Đây là tin tức để "hợp thức hóa" quá trình Tích lũy hay Phân phối?\n\n4. Hành động & Quản trị: Dựa trên tin tức đã xác minh và kỹ thuật, xác định vùng kiệt cung (định lượng cụ thể), điểm vào/ra, và Stop Loss.`,
			},
			{
				title:
					language === "en"
						? "Price Action & Volume"
						: "Hành Động Giá & Khối Lượng",
				snippet:
					language === "en"
						? "Analyze price-volume relationship, identify smart money footprints, supply/demand zones, and actionable entry/exit levels"
						: "Phân tích mối quan hệ giá-khối lượng, nhận diện dấu chân tiền thông minh, vùng cung/cầu và điểm vào/ra cụ thể",
				question:
					language === "en"
						? `1. Read the price-volume narrative for ${ticker}: Identify the current trend phase (Accumulation, Markup, Distribution, or Markdown), and assess whether Volume confirms or diverges from price movement (e.g., rising price on declining Volume = potential weakness; falling price on declining Volume = supply drying up).\n\n2. Detect smart money footprints: Quantify Volume anomalies relative to MA20 (Volume >150% = high activity, Volume <50% = quiet/absorption). Look for Effort vs Result divergences — large Volume (Effort) with small price movement (no Result), indicating absorption by the opposite side.\n\n3. Map key supply and demand zones: Identify price levels where previous high Volume occurred (potential supply ceilings) and where low Volume support was established (demand floors). Flag any Test for Supply (No Supply Bar) or Signs of Strength (SOS) candlestick patterns at these zones.\n\n4. Synthesize into actionable plan: Based on the VPA analysis, identify specific entry zones (with Volume confirmation criteria), Stop Loss levels (below demand zones or Wyckoff structure lows), and realistic price targets. State whether the current setup favors buyers or sellers and what would invalidate the thesis.`
						: `1. Đọc câu chuyện giá-khối lượng cho ${ticker}: Xác định giai đoạn xu hướng hiện tại (Tích lũy, Tăng Giá, Phân Phối hay Giảm Giá), và đánh giá xem Khối lượng xác nhận hay phân kỳ với chuyển động giá (ví dụ: giá tăng nhưng khối lượng giảm = tiềm năng suy yếu; giá giảm nhưng khối lượng giảm = cung đang cạn kiệt).\n\n2. Phát hiện dấu chân tiền thông minh: Định lượng các bất thường khối lượng so với MA20 (Volume >150% = hoạt động mạnh, Volume <50% = yên tĩnh/tích lũy). Tìm kiếm phân kỳ Nỗ lực-Kết quả — khối lượng lớn (Nỗ lực) nhưng biến động giá nhỏ (không có Kết quả), cho thấy bên đối lập đang hấp thụ.\n\n3. Lập bản đồ vùng cung và cầu: Xác định các mức giá nơi khối lượng cao từng xảy ra (trần cung tiềm năng) và nơi hỗ trợ khối lượng thấp được thiết lập (sàn cầu). Đánh dấu các mô hình nến Test for Supply (No Supply Bar) hoặc Sign of Strength (SOS) tại các vùng này.\n\n4. Tổng hợp thành kế hoạch hành động: Dựa trên phân tích VPA, xác định vùng vào lệnh cụ thể (với tiêu chí xác nhận khối lượng), mức Stop Loss (dưới vùng cầu hoặc đáy cấu trúc Wyckoff), và mục tiêu giá thực tế. Nêu rõ thiết lập hiện tại ưu tiên người mua hay người bán và điều gì sẽ làm vô hiệu luận điểm.`,
			},
			{
				title:
					language === "en" ? "MA Momentum & Trend" : "Động Lực MA & Xu Hướng",
				snippet:
					language === "en"
						? "Assess MA alignment and momentum, detect crossovers with volume confirmation, and identify trend continuation/reversal signals"
						: "Đánh giá xếp hạng MA và động lực, phát hiện cắt chéo có xác nhận khối lượng, nhận diện tín hiệu tiếp tục/đảo chiều xu hướng",
				question:
					language === "en"
						? `1. Assess MA alignment and momentum profile for ${ticker}: Report the MA Score for each period (MA10, MA20, MA50, MA100, MA200). Determine if MAs are stacked bullishly (shorter above longer) or bearishly (shorter below longer), and how wide the spread is — a widening spread signals accelerating momentum.\n\n2. Detect MA crossover signals with Volume confirmation: Identify any recent or impending MA crossovers (e.g., MA10 crossing above MA20 = short-term bullish). For each crossover, check whether Volume was above MA20 at the time — crossovers with high Volume are far more reliable than those on low Volume (which often fail and become whipsaws).\n\n3. Interpret MA scores through a Wyckoff lens: Align MA Score behavior with Wyckoff phases. For example, MA Score turning positive after an extended negative period near support could indicate Accumulation Phase C-D (Sign of Strength). Conversely, MA Score diverging negatively while price remains near highs could signal Distribution (Sign of Weakness before an Upthrust).\n\n4. Actionable MA-based trading plan: Based on the MA analysis, identify whether ${ticker} is in a trending or mean-reverting regime. Provide specific entry triggers (e.g., buy on pullback to MA20 with Volume >MA20), Stop Loss levels (e.g., below MA50), and the MA structure violation that would invalidate the current trend.`
						: `1. Đánh giá xếp hạng MA và hồ sơ động lực cho ${ticker}: Báo cáo điểm MA Score cho từng chu kỳ (MA10, MA20, MA50, MA100, MA200). Xác định xem các MA đang xếp hạng tăng (MA ngắn ở trên MA dài) hay giảm (MA ngắn ở dưới MA dài), và khoảng cách giữa chúng — khoảng cách mở rộng báo hiệu động lực tăng tốc.\n\n2. Phát hiện tín hiệu cắt chéo MA có xác nhận khối lượng: Nhận diện cắt chéo MA gần đây hoặc sắp diễn ra (ví dụ: MA10 cắt lên trên MA20 = tăng giá ngắn hạn). Với mỗi cắt chéo, kiểm tra xem khối lượng có cao hơn MA20 tại thời điểm đó không — cắt chéo có khối lượng cao đáng tin cậy hơn nhiều so với cắt chéo khối lượng thấp (thường thất bại và trở thành whipsaw).\n\n3. Diễn giải điểm MA qua lăng kính Wyckoff: Liên kết hành vi điểm MA với các giai đoạn Wyckoff. Ví dụ, điểm MA chuyển dương sau giai đoạn âm kéo dài gần hỗ trợ có thể báo hiệu Tích lũy Giai đoạn C-D (Sign of Strength). Ngược lại, điểm MA phân kỳ âm trong khi giá vẫn gần đỉnh có thể báo hiệu Phân Phối (Sign of Weakness trước Upthrust).\n\n4. Kế hoạch giao dịch dựa trên MA: Dựa trên phân tích MA, xác định ${ticker} đang trong chế độ xu hướng hay hồi quy trung bình. Cung cấp điều kiện kích hoạt vào lệnh cụ thể (ví dụ: mua khi điều chỉnh về MA20 với Volume >MA20), mức Stop Loss (ví dụ: dưới MA50), và vi phạm cấu trúc MA nào sẽ làm vô hiệu xu hướng hiện tại.`,
			},
			{
				title:
					language === "en"
						? "Wyckoff Method Analysis"
						: "Phân Tích Phương Pháp Wyckoff",
				snippet:
					language === "en"
						? "Identify Wyckoff phases, key events (Spring/Upthrust/SOS), horizontal price targets, and Effort-Result volume confirmation"
						: "Nhận diện giai đoạn Wyckoff, sự kiện then chốt (Spring/Upthrust/SOS), mục tiêu giá ngang và xác nhận khối lượng Nỗ lực-Kết quả",
				question:
					language === "en"
						? `1. Determine the current Wyckoff phase for ${ticker}: Classify into Accumulation (A through E), Markup, Distribution (A through E), or Markdown. Support your classification with specific evidence from price and volume data (e.g., "Phase C — selling climax followed by increased Volume on up-days indicates potential Spring").\n\n2. Identify key Wyckoff events and structures: Scan for Springs (false breakdowns below support with quick reversal and low Volume on the breakdown bar), Upthrusts (false breakouts above resistance), Signs of Strength (SOS — wide-range up-bars on increasing Volume), Signs of Weakness (SOW — wide-range down-bars on increasing Volume), Last Point of Support (LPS), and Last Point of Supply (LPSY). Mark each event with the date.\n\n3. Calculate price targets and measure the Cause: Apply Wyckoff's horizontal counting method — measure the width of the Accumulation or Distribution trading range (the Cause) and project it upward (from breakout) or downward (from breakdown) to estimate the Effect (price target). Check if Volume at key levels supports the projected move.\n\n4. Confirm with Effort vs Result and provide action plan: Analyze whether Volume (Effort) is producing proportional price movement (Result). A large-effort/small-result divergence at resistance warns of Distribution; the same at support warns of Accumulation absorption. Provide a concrete trading plan with entry zone, Stop Loss (below Spring low or above Upthrust high), position sizing guidance, and the specific price action that would invalidate the Wyckoff thesis.`
						: `1. Xác định giai đoạn Wyckoff hiện tại cho ${ticker}: Phân loại vào Tích lũy (A đến E), Tăng Giá, Phân Phối (A đến E), hoặc Giảm Giá. Bổ sung phân loại bằng bằng chứng cụ thể từ dữ liệu giá và khối lượng (ví dụ: "Giai đoạn C — selling climax theo sau bởi khối lượng tăng trên các phiên tăng báo hiệu Spring tiềm năng").\n\n2. Nhận diện sự kiện và cấu trúc Wyckoff then chốt: Quét tìm Spring (phá vỡ giả dưới hỗ trợ với đảo chiều nhanh và khối lượng thấp trên thanh phá vỡ), Upthrust (phá vỡ giả trên kháng cự), Sign of Strength (SOS — thanh tăng biên rộng trên khối lượng tăng), Sign of Weakness (SOW — thanh giảm biên rộng trên khối lượng tăng), Last Point of Support (LPS), và Last Point of Supply (LPSY). Đánh dấu từng sự kiện với ngày.\n\n3. Tính toán mục tiêu giá và đo lường Nguyên nhân: Áp dụng phương pháp đếm ngang của Wyckoff — đo chiều rộng vùng giao dịch Tích lũy hoặc Phân Phối (Nguyên nhân) và chiếu lên trên (từ breakout) hoặc xuống dưới (từ breakdown) để ước tính Kết quả (mục tiêu giá). Kiểm tra xem khối lượng tại các mức then chốt có hỗ trợ chuyển động dự kiến không.\n\n4. Xác nhận bằng Nỗ lực vs Kết quả và cung cấp kế hoạch hành động: Phân tích xem khối lượng (Nỗ lực) có tạo ra chuyển động giá tỷ lệ (Kết quả) không. Phân kỳ nỗ lực lớn/kết quả nhỏ tại kháng cự cảnh báo Phân Phối; phân kỳ tương tự tại hỗ trợ cảnh báo hấp thụ Tích lũy. Cung cấp kế hoạch giao dịch cụ thể với vùng vào lệnh, Stop Loss (dưới đáy Spring hoặc trên đỉnh Upthrust), hướng dẫn tỷ lệ vị thế, và hành động giá cụ thể nào sẽ làm vô hiệu luận điểm Wyckoff.`,
			},
			{
				title:
					language === "en"
						? "Bob Volman Price Action"
						: "Hành Động Giá Bob Volman",
				snippet:
					language === "en"
						? "Identify dominant trend, micro pullback entries, breakout/fading setups with Volume confirmation, and risk-managed exit levels"
						: "Nhận diện xu hướng chủ đạo, điểm vào micro pullback, thiết lập breakout/fading có xác nhận Volume và mức cắt lỗ được quản trị rủi ro",
				question:
					language === "en"
						? `1. Establish the dominant trend and market structure for ${ticker}: Define the current trend using swing highs and lows (Higher Highs + Higher Lows = uptrend; Lower Highs + Lower Lows = downtrend). Identify the most recent Break of Structure (BOS) or Change of Character (CHoCH) to confirm whether the trend is intact or reversing.\n\n2. Identify Volman-style entry setups: Scan for micro pullback setups — a pullback of 3+ consecutive bars against the trend followed by a strong reversal bar or breakout candle. For each setup, specify the exact entry price and assess whether Volume at the pullback zone shows diminishing selling (in uptrend) or diminishing buying (in downtrend), indicating supply/demand exhaustion.\n\n3. Evaluate breakout and fading setups: Identify breakout setups where price breaks a significant swing level on strong momentum (wide-range bar with Volume >MA20). Separately, check for fading setups at key supply/demand zones where price action shows rejection patterns (pin bars, long wicks, engulfing candles) — these are counter-trend setups requiring tight Stop Losses.\n\n4. Define the complete trade plan: For the highest-probability setup identified, provide exact entry price, Stop Loss (placed beyond the setup's invalidation level), and take-profit targets (based on swing structure or minimum 2:1 risk-reward). State the Volume profile that would confirm the trade is working and the Volume/price action that signals early exit.`
						: `1. Thiết lập xu hướng chủ đạo và cấu trúc thị trường cho ${ticker}: Xác định xu hướng hiện tại thông qua các đỉnh và đáy dao động (Đỉnh Cao Hơn + Đáy Cao Hơn = xu hướng tăng; Đỉnh Thấp Hơn + Đáy Thấp Hơn = xu hướng giảm). Nhận diện Break of Structure (BOS) hoặc Change of Character (CHoCH) gần nhất để xác nhận xu hướng vẫn nguyên hay đang đảo chiều.\n\n2. Nhận diện thiết lập vào lệnh theo Volman: Quét tìm thiết lập micro pullback — nhịp điều chỉnh 3+ nến liên tiếp ngược xu hướng theo sau bởi nến đảo chiều mạnh hoặc nến breakout. Với mỗi thiết lập, xác định giá vào lệnh chính xác và đánh giá xem khối lượng tại vùng điều chỉnh có cho thấy lực bán giảm (trong xu hướng tăng) hay lực mua giảm (trong xu hướng giảm), báo hiệu kiệt cung/kiệt cầu.\n\n3. Đánh giá thiết lập breakout và fading: Nhận diện thiết lập breakout khi giá phá vỡ một mức dao động quan trọng với động lực mạnh (thanh biên rộng với Volume >MA20). Độc lập, kiểm tra thiết lập fading tại vùng cung/cầu then chốt khi hành động giá cho thấy mô hình từ chối (pin bar, bóng nến dài, engulfing) — đây là thiết lập ngược xu hướng yêu cầu Stop Loss chặt.\n\n4. Xác định kế hoạch giao dịch hoàn chỉnh: Với thiết lập có xác suất cao nhất, cung cấp giá vào lệnh chính xác, Stop Loss (đặt vượt mức vô hiệu hóa của thiết lập), và mục tiêu chốt lời (dựa trên cấu trúc dao động hoặc tỷ lệ rủi ro-phần thưởng tối thiểu 2:1). Nêu hồ sơ khối lượng xác nhận giao dịch đang hoạt động và hành động giá/khối lượng nào báo hiệu thoát sớm.`,
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
			<div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
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

				<div className="flex items-center gap-1.5">
					<Globe className="h-3.5 w-3.5 text-muted-foreground" />
					<div className="flex bg-muted rounded-md">
						<button
							onClick={() => setLanguage("en")}
							className={`h-8 px-2.5 text-xs font-medium rounded-md transition-colors ${
								language === "en"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{language === "en" ? "English" : "Tiếng Anh"}
						</button>
						<button
							onClick={() => setLanguage("vn")}
							className={`h-8 px-2.5 text-xs font-medium rounded-md transition-colors ${
								language === "vn"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							{language === "en" ? "Vietnamese" : "Tiếng Việt"}
						</button>
					</div>
				</div>

				{isFetching && (
					<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />
				)}
			</div>

			{/* Reference Ticker Row */}
			<div className="flex items-center gap-2 flex-shrink-0">
				<div className="flex items-center gap-2">
					<Switch
						id={referenceSwitchId}
						checked={referenceState.enabled}
						onCheckedChange={(checked) =>
							updateReferenceState({ enabled: checked === true })
						}
					/>
					<Label
						htmlFor={referenceSwitchId}
						className="text-xs text-muted-foreground cursor-pointer select-none"
					>
						{t("common.aiContext.includeReference")}
					</Label>
				</div>
				{referenceState.enabled && (
					<SelectTickerDialog
						onSelectTicker={(newTicker) =>
							updateReferenceState({ ticker: newTicker })
						}
					>
						<Button variant="outline" size="sm" className="h-6 text-xs px-2">
							{referenceState.ticker}
						</Button>
					</SelectTickerDialog>
				)}
			</div>

			{/* Textarea - fixed short height */}
			<textarea
				readOnly
				value={aiContext}
				className="w-full h-[100px] md:h-[180px] lg:h-[220px] p-3 font-mono text-xs border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-muted/50 overflow-y-auto"
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
