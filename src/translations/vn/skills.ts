export default {
	pageTitle: "AI Agent Skills — AIPriceAction",
	hero: {
		badge: "100% MIỄN PHÍ",
		headline1: "Thị trường đang thế nào?",
		headline2: "Cổ phiếu nào mạnh nhất?",
		subtitle: "Hỏi AI — có câu trả lời ngay.",
		description:
			"AI Agent Skills kết nối trợ lý AI của bạn với dữ liệu thị trường. Không cần đăng ký, không cần API Key, không cần tài khoản chứng khoán. Cài một lần — dùng mọi nơi.",
		cta: "Cài đặt ngay",
	},
	install: {
		sectionTitle: "Cài đặt trong 30 giây",
		tabCLI: "Skills CLI",
		tabCLIshort: "CLI",
		tabAgents: "AGENTS.md",
		method1Title: "Cách 1: Skills CLI (Khuyến nghị)",
		method1Desc: "Cài nhanh nhất — tự nhận diện trợ lý AI",
		method1Step1: "Chạy lệnh trên trong terminal",
		method1Step2: "Chọn skills (aipa-data, aipa-analyze, aipa-research)",
		method1Step3: "Chọn trợ lý AI (Claude Code, Gemini CLI, Codex, Cursor...)",
		method1Step4: "Xong — khởi động lại trợ lý AI và bắt đầu hỏi",
		method2Title: "Cách 2: AGENTS.md",
		method2Desc: "Không cần cài skill — tương thích mọi trợ lý AI",
		method2Note: "Với Claude Code: đổi tên AGENTS.md thành CLAUDE.md",
		method2Note2: "Gemini CLI tự nhận diện AGENTS.md. Trợ lý AI tự cài",
		method2Note2End: "ở lần chạy đầu.",
		prerequisites: "Yêu cầu trước",
		prereq1: "Python 3.10+ (cho aipa-cli, tự cài bởi trợ lý AI qua",
		prereq2NoApiKey:
			"Không cần API Key khi dùng với trợ lý AI — trợ lý tự đọc dữ liệu và phân tích",
		prereq3: "chỉ cần nếu chạy",
		prereq3End: "trực tiếp từ terminal (không qua trợ lý AI)",
	},
	why: {
		sectionTitle: "Tại sao chọn AIPriceAction?",
		feature1Title: "Không cần tài khoản",
		feature1Desc:
			"Không đăng ký, không cần API Key, không xác thực. Cài và dùng ngay — dữ liệu công khai, truy cập tự do.",
		feature2Title: "4 thị trường, 1 công cụ",
		feature2Desc:
			"Cổ phiếu Việt Nam, tiền điện tử (BTC, ETH, SOL...), chứng khoán quốc tế (AAPL, NVDA...), và vàng SJC — tất cả trong một CLI.",
		feature3Title: "Phân tích chuyên sâu",
		feature3Desc:
			"Wyckoff, Volume Price Action (VPA), Smart Money, Volume Profile, MA Momentum — không chỉ số liệu, mà là insight thực sự.",
		feature4Title: "Nghiên cứu chuyên sâu tự động",
		feature4Desc:
			"Supervisor → Workers song song → Tổng hợp → Kiểm tra — phân tích toàn ngành trong 1 câu lệnh, bao gồm cả bước kiểm tra chất lượng.",
	},
	skillsSectionTitle: "3 Skills cho mọi nhu cầu phân tích",
	skillsData: {
		data: {
			heading: "Dữ liệu thị trường mới nhất",
			description:
				"Nến OHLCV, Volume Profile, cổ phiếu nổi bật, dữ liệu gần thời gian thực (độ trễ dưới 5 phút), danh sách theo dõi — tất cả dữ liệu thô, không cần AI, không cần API Key.",
			tag: "Không cần API Key",
			prompt1: "Lấy dữ liệu giá VCB 50 nến gần nhất",
			prompt2: "Top 10 cổ phiếu có giá trị giao dịch cao nhất",
			prompt3: "Volume profile cho BTCUSDT",
			prompt4: "Volume profile cho VNINDEX — POC và vùng giá trị",
		},
		analyze: {
			heading: "Phân tích kỹ thuật bằng AI",
			description:
				"Phân tích một hoặc nhiều cổ phiếu cùng lúc với Wyckoff, VPA, Smart Money, Volume Profile, MA Momentum. Hỗ trợ phân tích đơn mã, so sánh nhiều mã, và câu hỏi tùy ý.",
			tag: "Hỗ trợ AI",
			prompt1: "Phân tích VCB, TCB, MBB — ngân hàng nào có xu hướng mạnh nhất?",
			prompt2: "Phân tích Wyckoff cho HPG",
			prompt3: "Phân tích BTCUSDT khung 4h",
			prompt4: "Phân tích VCB bằng Volume Profile — các mức hỗ trợ/kháng cự",
		},
		research: {
			heading: "Nghiên cứu thị trường toàn diện",
			description:
				"Phân tích đa ngành với quy trình nhiều agent: Supervisor chia việc, Workers phân tích song song, Tổng hợp kết quả, Reviewer kiểm tra chất lượng.",
			tag: "Nhiều Agent",
			prompt1: "Nghiên cứu sâu ngành ngân hàng",
			prompt2: "Phân tích toàn diện thị trường chứng khoán Việt Nam",
			prompt3: "Nghiên cứu tiền điện tử: Layer 1, DeFi, AI tokens",
			pipelineStep1: "Supervisor → Phân tách thành 3-5 công việc",
			pipelineStep2: "Workers → Phân tích song song từng ngành",
			pipelineStep3: "Tổng hợp → Gom kết quả lại",
			pipelineStep4: "Reviewer → Kiểm tra chất lượng",
			pipelineStep5: "Báo cáo cuối cùng",
		},
	},
	markets: {
		sectionTitle: "4 thị trường, 1 công cụ",
		labelProvider: "Nguồn:",
		labelExamples: "Ví dụ:",
		labelIntervals: "Khung thời gian:",
		labelWatchlists: "Danh sách theo dõi:",
		vnStocks: "Cổ phiếu Việt Nam",
		crypto: "Tiền điện tử",
		globalStocks: "Thị trường quốc tế",
		sjcGold: "Vàng SJC",
		market247: "24/7",
	},
	agents: {
		sectionTitle: "Tương thích với trợ lý AI yêu thích của bạn",
		sectionDesc: "tự động nhận diện và hỏi bạn chọn trợ lý AI",
		primaryBadge: "Chính",
		anyAgent: "Trợ lý AI khác",
	},
	comparison: {
		sectionTitle: "Tại sao chọn chúng tôi?",
		colFeature: "Tiêu chí",
		colUs: "AIPriceAction AI Agent Skills",
		colOthers: "Giải pháp khác",
		price: {
			feature: "Giá",
			us: "Miễn phí vĩnh viễn",
			them: "Miễn phí (Beta), chưa rõ sau này",
		},
		auth: {
			feature: "Đăng ký / Xác thực",
			us: "Không cần",
			them: "Cần tài khoản + API Key",
		},
		vnStocks: {
			feature: "Cổ phiếu Việt Nam",
			us: "Có (VCI, Vietstock, VNDirect, VPS)",
			them: "Có",
		},
		crypto: {
			feature: "Tiền điện tử",
			us: "Có (Binance)",
			them: "Chưa rõ",
		},
		intlStocks: {
			feature: "Thị trường quốc tế",
			us: "Có (Yahoo Finance)",
			them: "Chưa rõ",
		},
		sjcGold: { feature: "Vàng SJC", us: "Có", them: "Chưa rõ" },
		technicalAnalysis: {
			feature: "Phân tích kỹ thuật",
			us: "Wyckoff, VPA, Smart Money, Bob Volman",
			them: "Tóm tắt thị trường",
		},
		volumeProfile: {
			feature: "Volume Profile",
			us: "Có (POC, Value Area, nhiều ngày)",
			them: "Không",
		},
		deepResearch: {
			feature: "Nghiên cứu chuyên sâu",
			us: "Có (quy trình nhiều agent)",
			them: "Không",
		},
		agentsSupported: {
			feature: "Trợ lý AI hỗ trợ",
			us: "Claude, Gemini, Codex, Cursor, openCode",
			them: "Claude Code, Cursor, Codex (MCP)",
		},
		cli: {
			feature: "CLI",
			us: "uvx aipa-cli (Python)",
			them: "Shell script",
		},
		openSource: { feature: "Nguồn mở", us: "Có (MIT)", them: "Có (MIT)" },
	},
	prompts: {
		sectionTitle: "Thử ngay — ví dụ câu lệnh",
		dataPrompts: [
			"Giá VCB hôm nay là bao nhiêu?",
			"Top 10 cổ phiếu có giá trị giao dịch cao nhất",
			"So sánh giá vàng SJC với vàng quốc tế GC=F",
			"Volume profile cho BTCUSDT — POC ở đâu?",
			"Liệt kê các cổ phiếu ngành ngân hàng",
		],
		analyzePrompts: [
			"Phân tích VCB, TCB, MBB, CTG — ngân hàng nào có xu hướng mạnh nhất?",
			"Phân tích Wyckoff cho HPG",
			"Phân tích BTCUSDT khung 4h",
			"Phát hiện cổ phiếu có biến động bất thường và tìm nguyên nhân",
			"So sánh FPT, VNM, VIC với phân tích MA Momentum",
			"Phân tích FPT với volume profile — vùng giá trị và các mức giá quan trọng",
		],
		researchPrompts: [
			"Nghiên cứu sâu ngành ngân hàng: top 10 ngân hàng, xu hướng, tín hiệu VPA",
			"Phân tích toàn diện thị trường chứng khoán Việt Nam",
			"Nghiên cứu tiền điện tử: Layer 1 so với DeFi so với AI tokens",
			"Ngành nào đang dẫn đầu thị trường?",
		],
	},
	faq: {
		sectionTitle: "Câu hỏi thường gặp",
		q1: {
			q: "AI Agent Skills có miễn phí không?",
			a: "Hoàn toàn miễn phí. Không phí ẩn, không cần đăng ký. Khi dùng với trợ lý AI như Claude Code hay Gemini CLI, trợ lý tự đọc dữ liệu và phân tích — không cần API Key. OPENAI_API_KEY chỉ cần nếu bạn chạy aipa analyze --run trực tiếp từ terminal mà không qua trợ lý AI.",
		},
		q2: {
			q: "Tại sao không cần API Key cho dữ liệu?",
			a: 			"Dữ liệu OHLCV được cung cấp qua kho lưu trữ S3 công khai — truy cập bằng HTTP đơn giản, không cần xác thực. Volume Profile, cổ phiếu nổi bật, dữ liệu trực tiếp đều hoạt động mà không cần thông tin đăng nhập.",
		},
		q3: {
			q: "Tôi có cần cài đặt Python không?",
			a: "Có, aipa-cli cần Python 3.10+. Nhưng bạn không cần cài thủ công — trợ lý AI sẽ tự cài aipa-cli qua uvx khi chạy lần đầu. uvx quản lý môi trường ảo riêng, không ảnh hưởng đến hệ thống.",
		},
		q4: {
			q: "Cập nhật skills khi có bản mới?",
			a: "Chạy npx skills update. CLI luôn tự cập nhật khi dùng uvx aipa-cli — luôn là bản mới nhất.",
		},
		q5: {
			q: "AI Agent Skills hỗ trợ trợ lý AI nào?",
			a: "Claude Code, Gemini CLI, Codex, Cursor, openCode. Thông qua AGENTS.md, tương thích với bất kỳ trợ lý AI nào có thể đọc file và chạy lệnh terminal.",
		},
		q6: {
			q: "Sự khác biệt giữa 3 skills là gì?",
			a: "aipa-data: Dữ liệu thô — nến OHLCV, Volume Profile, cổ phiếu nổi bật, dữ liệu trực tiếp. Không cần AI, không cần API Key.\naipa-analyze: Phân tích bằng AI — phân tích một hoặc nhiều mã với Wyckoff, VPA, Smart Money, Volume Profile. Khi dùng với trợ lý AI, trợ lý tự đọc dữ liệu và phân tích, không cần API Key.\naipa-research: Nghiên cứu chuyên sâu — quy trình nhiều agent phân tích toàn ngành. Chế độ qua trợ lý AI (khuyến nghị) không cần API Key.",
		},
		q7: {
			q: "Dữ liệu có chính xác không?",
			a: "Dữ liệu được tổng hợp từ nhiều nguồn uy tín (VCI, Vietstock, VNDirect, Binance, Yahoo Finance, sjc.com.vn). Tuy nhiên, phân tích do AI tạo ra nên có thể có sai sót. Luôn kiểm chứng trước khi ra quyết định giao dịch.",
		},
		q8: {
			q: "Dữ liệu có cập nhật trực tiếp không?",
			a: "Dữ liệu được cập nhật tối đa trong vòng 5 phút trong giờ giao dịch. Cổ phiếu giao dịch mạnh (khối lượng cao) được ưu tiên cập nhật thường xuyên hơn nên tần suất không đồng đều giữa các mã. Để ra quyết định giao dịch, luôn xác nhận giá với công ty chứng khoán.",
		},
		q9: {
			q: "Có đặt lệnh giao dịch được không?",
			a: "Không. AI Agent Skills tập trung vào phân tích dữ liệu thị trường, không thực hiện lệnh mua bán. Đây là công cụ thông tin, không phải nền tảng giao dịch.",
		},
	},
	disclaimer: {
		text1:
			"AI Agent Skills là công cụ thông tin và phân tích. Kết quả phân tích do AI tạo ra và có thể chứa sai sót. Không phải tư vấn đầu tư, không phải khuyến nghị mua bán.",
		text2:
			"Giao dịch chứng khoán, tiền điện tử và các sản phẩm tài chính đều có rủi ro. Giá trị đầu tư có thể tăng hoặc giảm. Bạn tự chịu trách nhiệm với mọi quyết định giao dịch.",
		text3: "Hiệu suất trong quá khứ không đảm bảo kết quả trong tương lai.",
	},
};
