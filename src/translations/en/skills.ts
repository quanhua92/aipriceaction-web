export default {
	pageTitle: "AI Agent Skills — AIPriceAction",
	hero: {
		badge: "100% FREE",
		headline1: "How is the market doing?",
		headline2: "Which stocks are strongest?",
		subtitle: "Ask AI — get answers instantly.",
		description:
			"AIPriceAction AI Agent Skills connects your AI agent with live market data. No signup, no API Key, no brokerage account needed. Install once — use everywhere.",
		cta: "Install Now",
	},
	install: {
		sectionTitle: "Install in 30 seconds",
		tabCLI: "Skills CLI",
		tabCLIshort: "CLI",
		tabAgents: "AGENTS.md",
		method1Title: "Method 1: Skills CLI (Recommended)",
		method1Desc: "Fastest install — auto-detects your AI agent",
		method1Step1: "Run the command above in your terminal",
		method1Step2: "Select skills (aipa-data, aipa-analyze, aipa-research)",
		method1Step3: "Select AI agent (Claude Code, Gemini CLI, Codex, Cursor...)",
		method1Step4: "Done — restart your AI agent and start asking",
		method2Title: "Method 2: AGENTS.md",
		method2Desc: "No skill install needed — compatible with all AI agents",
		method2Note: "For Claude Code: rename AGENTS.md to CLAUDE.md",
		method2Note2:
			"Gemini CLI auto-detects AGENTS.md. The AI agent auto-installs",
		method2Note2End: "on first use.",
		prerequisites: "Prerequisites",
		prereq1: "Python 3.10+ (for aipa-cli, auto-installed by your AI agent via",
		prereq2NoApiKey:
			"No API Key needed when using with an AI agent — the agent reads data and analyzes for you",
		prereq3: "only needed if you run",
		prereq3End: "directly from terminal (not via AI agent)",
	},
	why: {
		sectionTitle: "Why AIPriceAction?",
		feature1Title: "No Account Needed",
		feature1Desc:
			"No signup, no API Key, no authentication. Install and use immediately — public data, free access.",
		feature2Title: "4 Markets, 1 Tool",
		feature2Desc:
			"Vietnamese stocks, Crypto (BTC, ETH, SOL...), international securities (AAPL, NVDA...), and SJC gold — all in one CLI.",
		feature3Title: "Deep Analysis",
		feature3Desc:
			"Wyckoff, Volume Price Action (VPA), Smart Money, Volume Profile, MA Momentum — not just numbers, but insights.",
		feature4Title: "Deep Research Pipeline",
		feature4Desc:
			"Supervisor → Parallel Workers → Aggregator → Reviewer — analyze entire sectors in one command, including quality checks.",
	},
	skillsSectionTitle: "3 Skills for every analysis need",
	skillsData: {
		data: {
			heading: "Live Market Data",
			description:
				"OHLCV candles, volume profile, top performers, live data (under 5 min delay), watchlists, fundamental data (PE, ROE, NPL, CAR, screening/ranking) — all raw data, no AI, no API Key needed.",
			tag: "No API Key needed",
			prompt1: "Get VCB price data for the last 50 candles",
			prompt2: "Top 10 stocks with highest trading value",
			prompt3: "Volume profile for BTCUSDT",
			prompt4: "Volume profile for VNINDEX — POC and value area",
			prompt5: "What is VCB's PE ratio?",
			prompt6: "Rank all banks by ROE",
			prompt7: "Screen for low PE stocks with high ROE",
		},
		analyze: {
			heading: "AI-Powered Technical Analysis",
			description:
				"Analyze single or multiple stocks with Wyckoff, VPA, Smart Money, Volume Profile, MA Momentum. Can also incorporate fundamental data (PE, PB, ROE, NPL, CAR) to enrich technical analysis.",
			tag: "AI-powered",
			prompt1: "Analyze VCB, TCB, MBB — which bank has the strongest trend?",
			prompt2: "Wyckoff analysis for HPG",
			prompt3: "Analyze BTCUSDT on 4h timeframe",
			prompt4: "Analyze VCB with Volume Profile — support/resistance levels",
			prompt5: "Compare bank NPL and CAR with technical analysis",
			prompt6: "Analyze FPT fundamentals — is it overvalued?",
			prompt7: "Which banks have the best asset quality? Combine fundamentals + technicals",
		},
		research: {
			heading: "Comprehensive Market Research",
			description:
				"Multi-sector analysis with multi-agent pipeline: Supervisor splits tasks, Workers analyze in parallel, Aggregator synthesizes, Reviewer checks quality.",
			tag: "Multi-Agent Pipeline",
			prompt1: "Deep research the banking sector",
			prompt2: "Comprehensive analysis of the Vietnamese stock market",
			prompt3: "Research crypto: Layer 1 vs DeFi vs AI tokens",
			pipelineStep1: "Supervisor → Decomposes into 3-5 subtasks",
			pipelineStep2: "Parallel Workers → Each analyzes one sector",
			pipelineStep3: "Aggregator → Synthesizes findings",
			pipelineStep4: "Reviewer → Quality check",
			pipelineStep5: "Final Report",
		},
	},
	markets: {
		sectionTitle: "4 Markets, 1 Tool",
		labelProvider: "Provider:",
		labelExamples: "Examples:",
		labelIntervals: "Intervals:",
		labelWatchlists: "Watchlists:",
		vnStocks: "Vietnamese Stocks",
		crypto: "Crypto",
		globalStocks: "International Stocks",
		sjcGold: "SJC Gold",
		market247: "24/7 market",
	},
	agents: {
		sectionTitle: "Compatible with your favorite AI Agent",
		sectionDesc: "auto-detects and prompts you to choose your AI agent",
		primaryBadge: "primary",
		anyAgent: "Any AI agent",
	},
	comparison: {
		sectionTitle: "Why choose us?",
		colFeature: "Feature",
		colUs: "AIPriceAction AI Agent Skills",
		colOthers: "Other Solutions",
		price: {
			feature: "Price",
			us: "Free forever",
			them: "Free (Beta), unclear later",
		},
		auth: {
			feature: "Signup / Auth",
			us: "Not needed",
			them: "Requires account + API Key",
		},
		vnStocks: {
			feature: "Vietnamese Stocks",
			us: "Yes (VCI, Vietstock, VNDirect, VPS)",
			them: "Yes",
		},
		crypto: {
			feature: "Crypto",
			us: "Yes (Binance)",
			them: "Unclear",
		},
		intlStocks: {
			feature: "International Stocks",
			us: "Yes (Yahoo Finance)",
			them: "Unclear",
		},
		sjcGold: {
			feature: "SJC Gold",
			us: "Yes",
			them: "Unclear",
		},
		technicalAnalysis: {
			feature: "Technical Analysis",
			us: "Wyckoff, VPA, Smart Money, Bob Volman",
			them: "Market summary",
		},
		fundamentals: {
			feature: "Fundamental Data",
			us: "Yes (PE, PB, ROE, NPL, CAR, screening/ranking)",
			them: "Limited or no screening/ranking",
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
			feature: "AI Agents Supported",
			us: "Claude, Gemini, Codex, Cursor, openCode",
			them: "Claude Code, Cursor, Codex (MCP)",
		},
		cli: {
			feature: "CLI",
			us: "uvx aipa-cli (Python)",
			them: "Shell script",
		},
		openSource: {
			feature: "Open Source",
			us: "Yes (MIT)",
			them: "Yes (MIT)",
		},
	},
	prompts: {
		sectionTitle: "Try it now — example prompts",
		dataPrompts: [
			"What is the VCB price today?",
			"Top 10 stocks with highest trading value",
			"Compare SJC gold price with international gold GC=F",
			"Volume profile for BTCUSDT — where is the POC?",
			"List all banking sector stocks",
			"What is VCB's PE ratio?",
			"Rank all banks by ROE",
			"Screen for low PE stocks with high ROE",
		],
		analyzePrompts: [
			"Analyze VCB, TCB, MBB, CTG — which bank has the strongest trend?",
			"Wyckoff analysis for HPG",
			"Analyze BTCUSDT on 4h timeframe",
			"Detect stocks with unusual volatility and find the cause",
			"Compare FPT, VNM, VIC with MA Momentum analysis",
			"Analyze FPT with volume profile — value area and key levels",
			"Compare bank NPL and CAR with technical analysis",
		],
		researchPrompts: [
			"Deep research banking sector: top 10 banks, trends, VPA signals",
			"Comprehensive analysis of the Vietnamese stock market",
			"Research crypto: Layer 1 vs DeFi vs AI tokens",
			"Which sector is leading the market?",
		],
	},
	faq: {
		sectionTitle: "Frequently Asked Questions",
		q1: {
			q: "Is AIPriceAction AI Agent Skills free?",
			a: "Completely free. No hidden fees, no account registration needed. When using with an AI agent like Claude Code or Gemini CLI, the agent reads data and analyzes it — no API Key needed. OPENAI_API_KEY is only needed if you run aipa analyze --run directly from terminal without an AI agent.",
		},
		q2: {
			q: "Why no API Key for data?",
			a: "OHLCV data is served via a public S3 archive — accessible via plain HTTP, no authentication needed. Volume profile, performers, and live-data all work without any credentials.",
		},
		q3: {
			q: "Do I need to install Python?",
			a: "Yes, aipa-cli requires Python 3.10+. However, you don't need to install it manually — your AI agent will auto-install aipa-cli via uvx on first run. uvx manages its own virtual environment, no impact on your system.",
		},
		q4: {
			q: "How to update skills when a new version is available?",
			a: "Run npx skills update. The CLI is always auto-updated when using uvx aipa-cli — always the latest version.",
		},
		q5: {
			q: "Which AI Agents does AIPriceAction AI Agent Skills support?",
			a: "Claude Code, Gemini CLI, Codex, Cursor, openCode. Via AGENTS.md, it's compatible with any AI agent that can read files and run terminal commands.",
		},
		q6: {
			q: "What's the difference between the 3 skills?",
			a: "aipa-data: Raw data — OHLCV candles, volume profile, performers, live data, fundamental data (PE, ROE, NPL, CAR, company info). No AI, no API Key needed.\naipa-analyze: AI-powered analysis — single/multi-ticker with Wyckoff, VPA, Smart Money + optional fundamental context. When used with an AI agent (Claude Code, Gemini CLI...), the agent reads data and analyzes, no API Key needed.\naipa-research: In-depth research — multi-agent pipeline for sector-wide analysis with optional fundamental screening. Agent-driven mode (recommended) needs no API Key.",
		},
		q7: {
			q: "Is the data accurate?",
			a: "Data is aggregated from reputable sources (VCI, Vietstock, VNDirect, Binance, Yahoo Finance, sjc.com.vn). However, analysis is generated by AI and may contain errors. Always verify before making trading decisions.",
		},
		q8: {
			q: "Is the data real-time?",
			a: "Data is best-effort with updates typically under 5 minutes during market hours. Active stocks (high trading volume) are prioritized and updated more frequently, so refresh intervals are not equal across all tickers. For trading decisions, always verify prices with your broker.",
		},
		q9: {
			q: "Can I place trades?",
			a: "No. AIPriceAction AI Agent Skills focuses on market data analysis, it does not execute buy/sell orders. This is an informational tool, not a trading platform.",
		},
	},
	disclaimer: {
		text1:
			"AIPriceAction AI Agent Skills is an informational and analytical tool. Analysis results are generated by AI and may contain errors. Not investment advice, not a buy/sell recommendation.",
		text2:
			"Trading stocks, crypto, and financial products all carry risk. Investment value may increase or decrease. You are solely responsible for your trading decisions.",
		text3: "Past performance does not guarantee future results.",
	},
};
