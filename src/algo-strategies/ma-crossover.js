function main() {
  const symbol = params.symbol || 'VCB';
  const data = getTicker(symbol);
  if (data.length < 5) { log('Not enough data'); return; }

  for (let i = 1; i < data.length; i++) {
    const date = data[i].time.split('T')[0];
    if (data[i].close > data[i - 1].close) {
      buy(symbol, date);
    } else {
      sell(symbol, date);
    }
  }
}
