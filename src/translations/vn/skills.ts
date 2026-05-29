export default {
	pageTitle: "AI Agent Skills — AIPriceAction",
	hero: {
		badge: "100% FREE",
		headline1: "Thị trường đang thế nào?",
		headline2: "Cổ phiếu nào mạnh nhất?",
		subtitle: "Hỏi AI — có câu trả lời ngay.",
		description:
			"AIPriceAction AI Agent Skills kết nối AI Agent của bạn với dữ liệu thị trường thời gian thực. Không cần đăng ký, không cần API Key, không cần tài khoản chứng khoán. Cài một lần — dùng mọi nơi.",
		cta: "Cài đặt ngay",
	},
	install: {
		sectionTitle: "Cài đặt trong 30 giây",
		tabCLI: "Skills CLI",
		tabCLIshort: "CLI",
		tabAgents: "AGENTS.md",
		method1Title: "Method 1: Skills CLI (Khuyến nghị)",
		method1Desc: "Cài đặt nhanh nhất — tự động detect AI agent",
		method1Step1: "Chạy lệnh trên trong terminal",
		method1Step2: "Chọn skills (aipa-data, aipa-analyze, aipa-research)",
		method1Step3: "Chọn AI agent (Claude Code, Gemini CLI, Codex, Cursor...)",
		method1Step4: "Xong — restart AI agent và bắt đầu hỏi",
		method2Title: "Method 2: AGENTS.md",
		method2Desc: "Không cần skill install — tương thích mọi AI agent",
		method2Note: "Cho Claude Code: đổi tên AGENTS.md thành CLAUDE.md",
		method2Note2: "Gemini CLI tự động nhận diện AGENTS.md. AI agent tự cài",
		method2Note2End: "ở lần chạy đầu.",
		prerequisites: "Prerequisites",
		prereq1: "Python 3.10+ (cho aipa-cli, tự cài bởi AI agent qua",
		prereq2NoApiKey:
			"Không cần API Key khi dùng với AI agent — agent tự đọc dữ liệu và phân tích",
		prereq3: "chỉ cần nếu chạy",
		prereq3End: "trực tiếp từ terminal (không qua AI agent)",
	},
	why: {
		sectionTitle: "Tại sao chọn AIPriceAction?",
		feature1Title: "Không cần tài khoản",
		feature1Desc:
			"Không đăng ký, không API Key, không xác thực. Cài và dùng ngay — dữ liệu công khai, truy cập tự do.",
		feature2Title: "4 thị trường, 1 công cụ",
		feature2Desc:
			"Cổ phiếu Việt Nam, Crypto (BTC, ETH, SOL...), chứng khoán quốc tế (AAPL, NVDA...), và vàng SJC — tất cả trong một CLI.",
		feature3Title: "Phân tích chuyên sâu",
		feature3Desc:
			"Wyckoff, Volume Price Action (VPA), Smart Money, Volume Profile, MA Momentum — không chỉ là số liệu, mà là insight.",
		feature4Title: "Deep Research Pipeline",
		feature4Desc:
			"Supervisor → Parallel Workers → Aggregator → Reviewer — phân tích toàn ngành trong 1 câu lệnh, bao gồm cả kiểm tra chất lượng.",
	},
	skillsSectionTitle: "3 Skills cho mọi nhu cầu phân tích",
	skillsData: {
		data: {
			heading: "Dữ liệu thị trường thời gian thực",
			description:
				"OHLCV candles, volume profile, top performers, live data, watchlists — tất cả dữ liệu thô, không cần AI, không cần API Key.",
			tag: "No API Key needed",
			prompt1: "Lấy dữ liệu giá VCB 50 nến gần nhất",
			prompt2: "Top 10 cổ phiếu có giá trị giao dịch cao nhất",
			prompt3: "Volume profile cho BTCUSDT",
		},
		analyze: {
			heading: "Phân tích kỹ thuật bằng AI",
			description:
				"Phân tích đơn hoặc nhiều cổ phiếu cùng lúc với Wyckoff, VPA, Smart Money, MA Momentum. Single ticker, multi-ticker comparison, custom questions.",
			tag: "AI-powered",
			prompt1: "Phân tích VCB, TCB, MBB — ngân hàng nào có xu hướng mạnh nhất?",
			prompt2: "Wyckoff analysis cho HPG",
			prompt3: "Phân tích BTCUSDT khung 4h",
		},
		research: {
			heading: "Nghiên cứu thị trường toàn diện",
			description:
				"Phân tích đa ngành với pipeline multi-agent: Supervisor chia task, Workers phân tích song song, Aggregator tổng hợp, Reviewer kiểm tra chất lượng.",
			tag: "Multi-Agent Pipeline",
			prompt1: "Deep research ngành ngân hàng",
			prompt2: "Phân tích toàn diện thị trường chứng khoán Việt Nam",
			prompt3: "Nghiên cứu crypto: Layer 1, DeFi, AI tokens",
			pipelineStep1: "Supervisor → Phân tách thành 3-5 công việc",
			pipelineStep2: "Parallel Workers → Phân tích song song từng ngành",
			pipelineStep3: "Aggregator → Tổng hợp kết quả",
			pipelineStep4: "Reviewer → Kiểm tra chất lượng",
			pipelineStep5: "Báo cáo cuối cùng",
		},
	},
	markets: {
		sectionTitle: "4 thị trường, 1 công cụ",
		labelProvider: "Provider:",
		labelExamples: "Examples:",
		labelIntervals: "Intervals:",
		labelWatchlists: "Watchlists:",
		vnStocks: "Cổ phiếu Việt Nam",
		crypto: "Crypto",
		globalStocks: "Thị trường quốc tế",
		sjcGold: "Vàng SJC",
		market247: "24/7 market",
	},
	agents: {
		sectionTitle: "Tương thích với AI Agent yêu thích của bạn",
		sectionDesc: "tự động nhận diện và hỏi bạn chọn AI agent",
		primaryBadge: "primary",
		anyAgent: "Any AI agent",
	},
	comparison: {
		sectionTitle: "Tại sao chọn chúng tôi?",
		colFeature: "Feature",
		colUs: "AIPriceAction AI Agent Skills",
		colOthers: "Giải pháp khác",
		price: {
			feature: "Giá",
			us: "Miễn phí vĩnh viễn",
			them: "Miễn phí (Beta), chưa rõ sau này",
		},
		auth: {
			feature: "Đăng ký / Auth",
			us: "Không cần",
			them: "Cần tài khoản + API Key",
		},
		vnStocks: {
			feature: "Cổ phiếu Việt Nam",
			us: "Yes (VCI, Vietstock, VNDirect, VPS)",
			them: "Yes",
		},
		crypto: { feature: "Crypto", us: "Yes (Binance)", them: "Chưa rõ" },
		intlStocks: {
			feature: "Thị trường quốc tế",
			us: "Yes (Yahoo Finance)",
			them: "Chưa rõ",
		},
		sjcGold: { feature: "Vàng SJC", us: "Yes", them: "Chưa rõ" },
		technicalAnalysis: {
			feature: "Phân tích kỹ thuật",
			us: "Wyckoff, VPA, Smart Money, Bob Volman",
			them: "Tóm tắt thị trường",
		},
		volumeProfile: {
			feature: "Volume Profile",
			us: "Yes (POC, Value Area, multi-day)",
			them: "No",
		},
		deepResearch: {
			feature: "Deep Research",
			us: "Yes (multi-agent pipeline)",
			them: "No",
		},
		agentsSupported: {
			feature: "AI Agents hỗ trợ",
			us: "Claude, Gemini, Codex, Cursor, openCode",
			them: "Claude Code, Cursor, Codex (MCP)",
		},
		cli: {
			feature: "CLI",
			us: "uvx aipa-cli (Python)",
			them: "Shell script",
		},
		openSource: { feature: "Nguồn mở", us: "Yes (MIT)", them: "Yes (MIT)" },
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
			"Wyckoff analysis cho HPG",
			"Phân tích BTCUSDT khung 4h",
			"Phát hiện cổ phiếu có biến động bất thường và tìm nguyên nhân",
			"So sánh FPT, VNM, VIC với phân tích MA Momentum",
		],
		researchPrompts: [
			"Deep research ngành ngân hàng: top 10 ngân hàng, xu hướng, VPA signals",
			"Phân tích toàn diện thị trường chứng khoán Việt Nam",
			"Nghiên cứu crypto: Layer 1 vs DeFi vs AI tokens",
			"Ngành nào đang dẫn đầu thị trường?",
		],
	},
	faq: {
		sectionTitle: "Câu hỏi thường gặp",
		q1: {
			q: "AIPriceAction AI Agent Skills có miễn phí không?",
			a: "Hoàn toàn miễn phí. Không có phí ẩn, không cần đăng ký tài khoản. Khi dùng với AI agent như Claude Code hay Gemini CLI, agent tự đọc dữ liệu và phân tích — không cần API Key nào cả. OPENAI_API_KEY chỉ cần nếu bạn chạy aipa analyze --run trực tiếp từ terminal mà không qua AI agent.",
		},
		q2: {
			q: "Tại sao không cần API Key cho dữ liệu?",
			a: "Dữ liệu OHLCV được cung cấp qua S3 archive công khai — truy cập bằng HTTP đơn giản, không cần xác thực. Volume profile, performers, live-data đều hoạt động mà không cần bất kỳ credential nào.",
		},
		q3: {
			q: "Tôi có cần cài đặt Python không?",
			a: "Có, aipa-cli cần Python 3.10+. Tuy nhiên, bạn không cần cài đặt thủ công — AI agent sẽ tự động cài đặt aipa-cli qua uvx khi chạy lệnh lần đầu. uvx quản lý môi trường ảo riêng, không ảnh hưởng đến hệ thống.",
		},
		q4: {
			q: "Cập nhật skills khi có bản mới?",
			a: "Chạy npx skills update. CLI luôn được cập nhật tự động khi dùng uvx aipa-cli — luôn là bản mới nhất.",
		},
		q5: {
			q: "AIPriceAction AI Agent Skills hỗ trợ AI Agent nào?",
			a: "Claude Code, Gemini CLI, Codex, Cursor, openCode. Thông qua AGENTS.md, tương thích với bất kỳ AI agent nào có khả năng đọc file và chạy terminal.",
		},
		q6: {
			q: "Sự khác biệt giữa 3 skills là gì?",
			a: "aipa-data: Dữ liệu thô — OHLCV candles, volume profile, performers, live data. Không cần AI, không cần API Key.\naipa-analyze: Phân tích bằng AI — single/multi-ticker với Wyckoff, VPA, Smart Money. Khi dùng với AI agent (Claude Code, Gemini CLI...), agent tự đọc dữ liệu và phân tích, không cần API Key.\naipa-research: Nghiên cứu chuyên sâu — multi-agent pipeline phân tích toàn ngành. Agent-driven mode (khuyến nghị) không cần API Key.",
		},
		q7: {
			q: "Dữ liệu có chính xác không?",
			a: "Dữ liệu được tổng hợp từ nhiều nguồn uy tín (VCI, Vietstock, VNDirect, Binance, Yahoo Finance, sjc.com.vn). Tuy nhiên, phân tích là do AI tạo ra và có thể chứa sai sót. Luôn kiểm chứng trước khi ra quyết định giao dịch.",
		},
		q8: {
			q: "Có đặt lệnh giao dịch được không?",
			a: "Không. AIPriceAction AI Agent Skills tập trung vào phân tích dữ liệu thị trường, không thực hiện lệnh mua bán. Đây là công cụ thông tin, không phải nền tảng giao dịch.",
		},
	},
	disclaimer: {
		text1:
			"AIPriceAction AI Agent Skills là công cụ thông tin và phân tích. Kết quả phân tích do AI tạo ra và có thể chứa sai sót. Không phải là tư vấn đầu tư, không phải khuyến nghị mua bán.",
		text2:
			"Giao dịch chứng khoán, crypto và các sản phẩm tài chính đều có rủi ro. Giá trị đầu tư có thể tăng hoặc giảm. Bạn tự chịu trách nhiệm với mọi quyết định giao dịch của mình.",
		text3: "Hiệu suất trong quá khứ không đảm bảo kết quả trong tương lai.",
	},
};
