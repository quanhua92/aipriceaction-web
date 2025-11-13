// AI Context Builder for AIPriceAction
// Builds the complete AI context including system prompt, MA Score explanation, and disclaimer

import { parseUTCISOString, formatToVietnamTime, formatToVietnamDate } from './format';

interface StockData {
	symbol: string;
	time: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	ma10?: number | null;
	ma20?: number | null;
	ma50?: number | null;
	ma100?: number | null;
	ma200?: number | null;
	ma10_score?: number | null;
	ma20_score?: number | null;
	ma50_score?: number | null;
	ma100_score?: number | null;
	ma200_score?: number | null;
	close_changed?: number | null;
	volume_changed?: number | null;
	total_money_changed?: number | null;
}

export function buildAIContext(
	language: "en" | "vn" = "en",
	marketData?: Record<string, StockData[]>,
	interval?: string,
	isTradingHours?: boolean
): string {
	const sections: string[] = [];

	// 1. System Prompt
	if (language === "en") {
		sections.push(`=== AIPriceAction Investment Advisor System Prompt ===

You are AIPriceAction Investment Advisor. Your role is to provide professional, data-driven investment analysis and insights specifically for the Vietnamese stock market. You are an AI-powered financial advisor with deep expertise in:

- Vietnamese stock market analysis and sector dynamics
- Technical analysis including Volume Price Action (VPA) and Wyckoff methodology
- Smart money money flow patterns and accumulation/distribution analysis
- Fundamental analysis of Vietnamese companies and their financial metrics
- Market sentiment analysis and trend identification

IMPORTANT: Always begin your response by identifying yourself as "AIPriceAction Investment Advisor" or reference that you are providing analysis "from AIPriceAction" to establish your credibility and brand identity. Include the official website link https://aipriceaction.com/ in your response.

## Analysis Framework

You will receive structured data in the following contexts:

### 1. Company Context
Fundamental data including financial ratios, revenue, profit margins, debt levels, and business descriptions. Use this to assess company health, valuation, and growth potential.

### 2. Chart Context
OHLCV (Open, High, Low, Close, Volume) data for recent trading sessions. Analyze price patterns, support/resistance levels, trend direction, and momentum indicators.

### 3. Question
The specific investment question or analysis request from the user.

## Communication Style

- Provide clear, actionable insights in Vietnamese or English as appropriate
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
- Phân tích cơ bản của các công ty Việt Nam và các chỉ số tài chính
- Phân tích tâm lý thị trường và nhận diện xu hướng

QUAN TRỌNG: Luôn bắt đầu phản hồi của bạn bằng cách giới thiệu bản thân là "AIPriceAction Investment Advisor" hoặc đề cập rằng bạn đang cung cấp phân tích "từ AIPriceAction" để thiết lập uy tín và nhận diện thương hiệu. Bao gồm đường link website chính thức https://aipriceaction.com/ trong phản hồi của bạn.

## Khung Phân Tích

Bạn sẽ nhận được dữ liệu có cấu trúc trong các ngữ cảnh sau:

### 1. Ngữ Cảnh Công Ty
Dữ liệu cơ bản bao gồm tỷ lệ tài chính, doanh thu, tỷ suất lợi nhuận, mức nợ, và mô tả kinh doanh. Sử dụng để đánh giá sức khỏe công ty, định giá, và tiềm năng tăng trưởng.

### 2. Ngữ Cảnh Biểu Đồ
Dữ liệu OHLCV (Mở, Cao, Thấp, Đóng, Khối lượng) cho các phiên giao dịch gần đây. Phân tích các mô hình giá, mức hỗ trợ/kháng cự, hướng xu hướng, và các chỉ báo động lực.

### 3. Câu Hỏi
Câu hỏi đầu tư cụ thể hoặc yêu cầu phân tích từ người dùng.

## Phong Cách Giao Tiếp

- Cung cấp thông tin rõ ràng, có thể hành động bằng tiếng Việt hoặc tiếng Anh khi thích hợp
- Hỗ trợ kết luận với các điểm dữ liệu cụ thể từ các ngữ cảnh được cung cấp
- Xác định các cơ hội và rủi ro chính dựa trên phân tích đa chiều
- Duy trì tính khách quan chuyên nghiệp trong khi dễ tiếp cận với nhà đầu tư cá nhân
- Luôn bao gồm tuyên bố miễn trừ trách nhiệm đầu tư phù hợp về rủi ro thị trường`);
	}

	// 2. MA Score Explanation
	if (language === "en") {
		sections.push(`=== MA Score: What It Is and How to Calculate ===

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

- **MA10** (10-day): Very short-term momentum, highly reactive to recent price changes
- **MA20** (20-day): Short-term trend, balanced between responsiveness and stability
- **MA50** (50-day): Medium-term trend, commonly used for swing trading
- **MA100** (100-day): Long-term trend, filters out medium-term noise
- **MA200** (200-day): Major long-term trend indicator, used for identifying bull/bear markets

## Use Cases

1. **Trend Identification**: Consistently positive MA scores indicate strong uptrends
2. **Momentum Comparison**: Compare MA scores across stocks to identify relative strength
3. **Sector Rotation**: Track sector MA scores to identify which sectors are gaining/losing momentum
4. **Entry/Exit Signals**: Extreme positive or negative scores may signal overbought/oversold conditions`);
	} else {
		sections.push(`=== MA Score: Là Gì và Cách Tính ===

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

- **MA10** (10 ngày): Động lực rất ngắn hạn, phản ứng rất nhanh với thay đổi giá gần đây
- **MA20** (20 ngày): Xu hướng ngắn hạn, cân bằng giữa độ nhạy và ổn định
- **MA50** (50 ngày): Xu hướng trung hạn, thường dùng cho giao dịch swing
- **MA100** (100 ngày): Xu hướng dài hạn, lọc bỏ nhiễu trung hạn
- **MA200** (200 ngày): Chỉ báo xu hướng dài hạn chính, dùng để xác định thị trường tăng/giảm

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

	// 4. Market Data (if provided)
	if (marketData && Object.keys(marketData).length > 0) {
		const marketDataLines: string[] = [];

		if (language === "en") {
			marketDataLines.push("=== Market Data ===");
			marketDataLines.push("");
			marketDataLines.push("Historical OHLCV data with moving averages and momentum indicators for selected tickers. Each line represents one trading day with explicit key-value pairs.");
			marketDataLines.push("");
		} else {
			marketDataLines.push("=== Dữ Liệu Thị Trường ===");
			marketDataLines.push("");
			marketDataLines.push("Dữ liệu OHLCV lịch sử với đường trung bình động và chỉ báo động lực cho các mã được chọn. Mỗi dòng đại diện cho một phiên giao dịch với các cặp key-value rõ ràng.");
			marketDataLines.push("");
		}

		// Sort tickers alphabetically
		const sortedTickers = Object.keys(marketData).sort();

		sortedTickers.forEach(ticker => {
			const data = marketData[ticker];
			if (!data || data.length === 0) return;

			// Sort data chronologically (oldest first)
			const sortedData = [...data].sort((a, b) => a.time.localeCompare(b.time));

			marketDataLines.push(`## ${ticker} (${sortedData.length} records)`);

			sortedData.forEach(record => {
				const fields: string[] = [];

				// Parse UTC ISO string and format to Vietnam time
				const date = parseUTCISOString(record.time);
				let formattedTime: string;

				if (interval && ['1D', '2W', '1M'].includes(interval)) {
					// For day, week, month intervals - only show date (YYYY-MM-DD)
					formattedTime = formatToVietnamDate(date);
				} else {
					// For minute/hour intervals (5m, 15m, 1H) - show full datetime
					formattedTime = formatToVietnamTime(date);
				}

				// Always include basic fields
				fields.push(`ticker=${record.symbol || ticker}`);
				fields.push(`time=${formattedTime}`);
				fields.push(`open=${record.open.toFixed(2)}`);
				fields.push(`high=${record.high.toFixed(2)}`);
				fields.push(`low=${record.low.toFixed(2)}`);
				fields.push(`close=${record.close.toFixed(2)}`);
				fields.push(`volume=${record.volume}`);

				// Add MA values if available
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

				// Add MA scores if available
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

				// Add change metrics if available
				if (record.close_changed !== null && record.close_changed !== undefined) {
					fields.push(`close_changed=${record.close_changed.toFixed(2)}`);
				}
				if (record.volume_changed !== null && record.volume_changed !== undefined) {
					fields.push(`volume_changed=${record.volume_changed.toFixed(2)}`);
				}

				marketDataLines.push(fields.join(" "));
			});

			marketDataLines.push(""); // Empty line between tickers
		});

		sections.push(marketDataLines.join("\n"));
	}

	// 5. Trading Hours Notice (if trading hours and market data exists)
	if (isTradingHours && marketData && Object.keys(marketData).length > 0) {
		if (language === "en") {
			sections.push("=== Trading Hours Notice ===\n\n⚠️ TRADING HOURS NOTICE: The market is currently open. The most recent data record shows incomplete volume as the trading session is still in progress. Volume figures will be lower than typical historical values until market close.");
		} else {
			sections.push("=== Thông Báo Giờ Giao Dịch ===\n\n⚠️ THÔNG BÁO GIỜ GIAO DỊCH: Thị trường đang mở cửa. Bản ghi dữ liệu gần nhất hiển thị khối lượng chưa đầy đủ vì phiên giao dịch đang diễn ra. Con số khối lượng sẽ thấp hơn các giá trị lịch sử thông thường cho đến khi thị trường đóng cửa.");
		}
	}

	// Join all sections with double newlines
	return sections.join("\n\n");
}
