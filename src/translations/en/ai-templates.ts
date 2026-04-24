export default {
	sectionTitle: "Quick Analysis Templates",
	sectionDescription:
		"One-click to copy AI context with pre-written analysis questions",
	copyTemplate: "Copy with Question",
	templateCopied: "Copied!",
	templates: [
		{
			title: "Trading Opportunity",
			snippet:
				"Identify opportunities, supply-demand analysis, position sizing roadmap, and risk management for each selected ticker",
			question:
				"For each selected ticker:\n\n1. Identify actionable trading opportunities based on current data and overall market context.\n\n2. Identify 'Smart Money' behavior: Specify confirmation signals (No Supply, Test for Supply, Spring, Upthrust, or SOS) at key price zones, along with an assessment of the asymmetry between Effort (Volume) and Result (Price).\n\nIMPORTANT: If the market is currently open, the Volume of the latest bar must be considered incomplete. In this case, NEVER assertively conclude 'Supply Exhaustion'. Instead, note that the signal is still forming and needs confirmation after the ATC session closes.\n\n3. Establish a practical deployment roadmap: Clearly differentiate between exploratory position sizing (at low Volume zones) and scaled-up positions (upon Effort-Result confirmation), with specific Stop Loss (SL) levels based on Wyckoff structure violations.\n\n4. Consider the risk-reward ratio and key risks to monitor (Buying Climax, Upthrust, or VNINDEX-related risks).\n\nRank the selected tickers from strongest to weakest opportunity.",
		},
		{
			title: "Stock Performance Comparison",
			snippet:
				"Compare price action strength, MA momentum alignment, Volume behavior, and rank by best technical setup",
			question:
				"For each selected ticker:\n\n1. Assess price action strength and structure: Compare each ticker's recent price performance — trend direction, volatility, and the quality of its swing structure (clean Higher Highs/Higher Lows vs. choppy action). Identify which ticker shows the cleanest trend structure.\n\n2. Compare MA momentum alignment: For each ticker, evaluate the MA Score profile across all periods (MA10, MA50, MA100, MA200). Which ticker has the most bullish (or least bearish) MA alignment? Are any tickers showing MA Score divergence that warns of trend exhaustion?\n\n3. Analyze Volume behavior and supply-demand balance: Compare Volume trends across tickers. Which ticker shows the healthiest Volume confirmation on up-moves (Volume increasing on green days, decreasing on red days)? Which shows warning signs of Distribution (high Volume on down-days, low Volume on up-days)?\n\n4. Rank and recommend: Rank all selected tickers from strongest to weakest based on the combined price action, MA momentum, and Volume analysis. For the top-ranked ticker, provide a specific trading plan with entry zone, Stop Loss, and target.\n\nSummarize with a comparison table showing each ticker's ranking scores.",
		},
		{
			title: "Market Trend Analysis",
			snippet:
				"Analyze sector rotation via MA scores, detect smart money accumulation/distribution patterns, and identify leading tickers",
			question:
				"For each selected ticker:\n\n1. Map the current market trend via MA Score analysis: For each ticker, report the MA Score profile and determine the prevailing trend direction. Group tickers by trend strength — which ones are in confirmed uptrends (all MA Scores positive), which are in downtrends (all negative), and which are in transition (mixed signals)?\n\n2. Detect smart money accumulation and distribution patterns: Look for Wyckoff-style volume footprints across the group. Are multiple tickers showing signs of Accumulation (Volume drying up on declines, increasing on rallies) or Distribution (Volume expanding on declines, shrinking on rallies)?\n\n3. Identify sector rotation and leading tickers: Compare MA Score momentum across all selected tickers to detect rotation — which tickers are gaining momentum (MA Score improving) and which are losing momentum (MA Score deteriorating)? Identify the leading ticker (strongest MA alignment + Volume confirmation) and the lagging ticker.\n\n4. Actionable market outlook and trading plan: Based on the group analysis, state whether the overall market sentiment is bullish, bearish, or mixed. For the strongest setup identified, provide a concrete trading plan with entry, Stop Loss, and target. Identify the key risk that would shift the outlook (e.g., VNINDEX breaking below a key support).\n\nRank all selected tickers from most bullish to most bearish.",
		},
		{
			title: "Risk & Support/Resistance Analysis",
			snippet:
				"Map support/resistance with Volume context, quantify risk-reward ratios, detect Wyckoff danger signals, and define Stop Loss levels",
			question:
				"For each selected ticker:\n\n1. Map key support and resistance levels with Volume context: Identify the most significant support and resistance levels based on recent price action. For each level, note the Volume that occurred there — levels formed on high Volume (>150% MA20) are stronger structural boundaries than those formed on low Volume. Flag any levels that have been tested multiple times.\n\n2. Quantify the risk-reward ratio for current price position: Calculate the distance from current price to the nearest support (downside risk) and nearest resistance (upside potential). Express this as a risk-reward ratio. A ratio below 1:2 suggests the risk outweighs the reward at current levels.\n\n3. Detect Wyckoff danger signals and Volume warnings: Scan for bearish warnings — Upthrust After Distribution (UTAD), Volume expanding on down-days while shrinking on up-days, or price failing to make new highs on decreasing Volume. Also scan for bullish recovery signals — Spring at support with low Volume on the breakdown bar and high Volume on the recovery bar, or Test for Supply (No Supply Bar).\n\n4. Define the risk management plan: For each ticker, establish specific Stop Loss levels based on Wyckoff structure (below Spring low, below Accumulation range, above Upthrust high) rather than arbitrary percentages. Identify the price action or Volume pattern that would trigger an early exit.\n\nRank the selected tickers from safest to riskiest based on their risk-reward profile and structural integrity.",
		},
		{
			title: "News & Events Research",
			snippet:
				"Detect extreme moves, research causes, combine with VPA/Wyckoff analysis",
			question:
				'For each selected ticker:\n\n1. Detect extreme moves: Check if the ticker changed more than ±6.7% or Volume exceeded >150% of the 20-period average.\n\n2. CRITICAL — Perform a real internet search NOW: If significant moves are detected, you MUST use your web search tool RIGHT NOW to search for recent news about [TICKER]. Search queries must include the ticker name, date, and keywords like "earnings", "financial report", or "corporate event". DO NOT generate or hallucinate news — only report facts from actual search results. Cite the source URL for each piece of information. If your search tool returns no results, say so explicitly.\n\n3. VPA & Wyckoff analysis: Combine ONLY verified search findings with price/volume data. Is this Effort or Result? Is the news being used to "rationalize" an Accumulation or Distribution process?\n\n4. Action & risk management: Based on verified news and technicals, identify supply exhaustion zones (quantified), entry/exit levels, and Stop Loss.',
		},
		{
			title: "Bob Volman Price Action Analysis",
			snippet:
				"Identify dominant trend, micro pullback entries, breakout/fading setups with Volume confirmation, and risk-managed exit levels",
			question:
				"For each selected ticker:\n\n1. Establish the dominant trend and market structure: Define the current trend using swing highs and lows. Identify the most recent Break of Structure (BOS) or Change of Character (CHoCH).\n\n2. Identify Volman-style entry setups: Scan for micro pullback setups (3+ bars against trend + reversal bar). For each, specify the entry price and assess Volume at the pullback zone for supply/demand exhaustion.\n\n3. Evaluate breakout and fading setups: Identify breakout setups at significant swing levels (wide-range bar, Volume >MA20). Check for fading setups at supply/demand zones with rejection patterns (pin bars, engulfing).\n\n4. Define the complete trade plan: For the best setup, provide exact entry, Stop Loss (beyond invalidation level), and take-profit targets (minimum 2:1 risk-reward). State Volume confirmation criteria and early exit signals.\n\nRank the selected tickers by setup quality and clarity.",
		},
		{
			title: "Wyckoff Method Price Action Analysis",
			snippet:
				"Identify Wyckoff phases, key events (Spring/Upthrust/SOS), horizontal price targets, and Effort-Result volume confirmation",
			question:
				"For each selected ticker:\n\n1. Determine the current Wyckoff phase: Classify into Accumulation (A-E), Markup, Distribution (A-E), or Markdown. Support your classification with specific evidence from price and volume data.\n\n2. Identify key Wyckoff events and structures: Scan for Springs, Upthrusts, Signs of Strength (SOS), Signs of Weakness (SOW), Last Point of Support (LPS), and Last Point of Supply (LPSY). Mark each event with the date.\n\n3. Calculate price targets using Wyckoff's horizontal counting method — measure the Cause (trading range width) and project the Effect (price target). Verify if Volume at key levels supports the projected move.\n\n4. Confirm with Effort vs Result analysis and provide an action plan: A large-effort/small-result divergence at resistance warns of Distribution; the same at support warns of Accumulation absorption. Provide entry zone, Stop Loss, position sizing guidance, and the specific price action that would invalidate the Wyckoff thesis.\n\nRank the selected tickers by the clarity and quality of their Wyckoff structure.",
		},
	],
};
