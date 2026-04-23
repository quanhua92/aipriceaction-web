export default {
  sectionTitle: 'Quick Analysis Templates',
  sectionDescription: 'One-click to copy AI context with pre-written analysis questions',
  copyTemplate: 'Copy with Question',
  templateCopied: 'Copied!',
  templates: [
    {
      title: 'Stock Performance Comparison',
      snippet: 'Compare selected stocks by price action, volume trends, and MA momentum to identify the strongest technical setups',
      question: 'Compare the selected stocks based on their price action, volume trends, and MA score momentum. Rank all selected stocks from strongest to weakest based on their technical setup and explain why each stands out or falls behind from a price action perspective.',
    },
    {
      title: 'Market Trend Analysis',
      snippet: 'Analyze current market trends, momentum patterns, and identify potential trading opportunities based on MA scores and volume trends',
      question: 'Based on the provided market data, analyze the current market trends from a price action perspective and highlight any notable patterns in the MA scores that suggest potential trading opportunities. What is the overall market sentiment based on price action and volume?',
    },
    {
      title: 'Risk & Support/Resistance Analysis',
      snippet: 'Identify key support and resistance levels, analyze risk-reward ratios, and spot potential warning signs or bullish confirmations',
      question: 'For each selected ticker, identify the key support and resistance levels based on recent price action. Analyze the current risk-reward ratio from a price action perspective and highlight any potential warning signs or bullish confirmations in the data.',
    },
    {
      title: 'News & Events Research',
      snippet: 'Find recent news and events that explain extreme price movements or unusual volume activity',
      question: 'Check if any stocks moved more than ±6.7% in a single day or show unusual volume patterns. For each significant move, you MUST actively search the internet to gather recent news and events to understand what caused it. Start your analysis by saying "I\'ve begun searching for recent news, focusing on earnings, corporate events, and broader market context for [TICKER]." Then proceed to search and report findings.',
    },
    {
      title: 'Bob Volman Price Action Analysis',
      snippet: 'Apply Bob Volman\'s scalping price action techniques to identify micro pullback entries, breakout confirmations, and fading setups',
      question: 'Analyze each selected ticker using Bob Volman\'s price action methodology from "Forex Price Action Scalping". For each ticker: (1) Identify the dominant trend on the current timeframe using swing highs and lows. (2) Look for micro pullback setups — a pullback of 3+ consecutive bars against the trend followed by a reversal bar or breakout candle. (3) Identify any 50-pip (or equivalent) breakout setups where price breaks a significant level on strong momentum. (4) Check for fading setups at key support/resistance where price action shows rejection patterns (pin bars, engulfing). (5) Assess volume behavior at key levels to confirm or deny each setup. Rank each ticker by setup quality and provide specific entry, stop-loss, and take-profit levels.',
    },
    {
      title: 'Wyckoff Method Price Action Analysis',
      snippet: 'Apply the Wyckoff Method to identify accumulation/distribution phases, spring/upthrust patterns, and price targets',
      question: 'Analyze each selected ticker using the Wyckoff Method. For each ticker: (1) Determine the current Wyckoff phase — Accumulation (A–E), Markup, Distribution (A–E), or Markdown based on price-volume behavior. (2) Identify key Wyckoff events: Springs (false breakdowns below support), Upthrusts (false breakouts above resistance), Sign of Strength (SOS), Sign of Weakness (SOW), Last Point of Support (LPS), and Last Point of Supply (LPSY). (3) Map out the cause (trading range width) and estimate a price target using Wyckoff\'s horizontal counting method. (4) Analyze volume patterns — effort vs result — to confirm whether smart money is accumulating or distributing. (5) Compare the Wyckoff structures across selected tickers and identify which ones offer the clearest actionable setups.',
    },
  ],
}
