# AIPriceAction Web

Professional-grade Vietnamese stock market analysis platform combining modern web technologies with sophisticated financial analysis tools.

## ✨ Features

### 📊 Market Analysis
- **Real-time Vietnamese Stock Data** - Complete coverage of HOSE, HNX, UPCOM markets
- **Cryptocurrency Support** - Major crypto markets alongside traditional stocks
- **Market Indices** - VNINDEX and VN30 tracking with advanced indicators
- **Sector Analysis** - Banking, Securities, Real Estate, Construction, and more

### 📈 Advanced Charting
- **TradingView Integration** - Professional charts with multiple timeframes
- **Technical Indicators** - Moving averages (MA10-200), volume analysis, price indicators
- **Multi-Chart Layouts** - 1-10 simultaneous charts with customizable arrangements
- **Fullscreen Mode** - Immersive chart analysis experience

### 🤖 AI-Powered Analysis
- **AI Context Builder** - Generates professional analysis prompts
- **Volume Price Action (VPA)** - Advanced trading methodology
- **Wyckoff Analysis** - Market cycle and smart money detection
- **Multi-language Support** - English and Vietnamese with financial terminology

### 📋 Portfolio Management
- **Custom Watchlists** - Create, organize, and export watchlists
- **Price Alerts** - Set target prices with intelligent notifications
- **Market Matrix** - Color-coded sector performance analysis
- **Trend Signals** - Buy/sell signal distribution across markets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended)

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd aipriceaction-web
pnpm install

# Start development server
pnpm dev
```

Visit `http://localhost:5173` to access the application.

### Production Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm serve
```

## 🛠️ Development

### Available Scripts

```bash
pnpm dev          # Development server (0.0.0.0:5173)
pnpm build        # Production build
pnpm test         # Run Vitest tests
pnpm format       # Format with Biome
pnpm lint         # Lint with Biome
pnpm check        # Full Biome check
```

### Adding Components

This project uses Shadcn UI components:

```bash
pnpx shadcn@latest add [component-name]
```

## 🏗️ Architecture

### Tech Stack
- **React 19** - Latest React with modern hooks
- **TypeScript** - Full type safety
- **Vite 7** - Fast build tool and dev server
- **TanStack Router** - File-based routing
- **TailwindCSS 4** - Modern styling
- **Shadcn/ui** - High-quality UI components

### State Management
- **Context Architecture** - Hierarchical providers with specific dependencies
- **Smart Caching** - 15-second cache windows with intelligent request handling
- **Retry Logic** - Exponential backoff for API reliability
- **Auto-refresh** - 30-second data updates with manual controls

### API Integration
- **AIPriceAction API** - Custom REST API for Vietnamese market data
- **Dual Mode Support** - Stocks (`vn`) and cryptocurrencies (`crypto`)
- **Error Handling** - Comprehensive error types and recovery
- **Performance Optimized** - CSV parsing, request deduplication, thundering herd prevention

## 📁 Project Structure

```
src/
├── routes/           # File-based routing
├── contexts/         # React contexts for state management
├── components/       # Reusable UI components
├── lib/             # Utilities and API clients
├── translations/    # i18n language files
└── hooks/           # Custom React hooks
```

## 🌐 Available Routes

- `/` - Dashboard with market overview
- `/chart` - Advanced multi-chart analysis
- `/matrix` - Market sector analysis matrix
- `/ai` - AI-powered analysis tools
- `/alert` - Price alert management
- `/crypto` - Cryptocurrency analysis
- `/watch` - Customizable watchlists

## 🔧 Configuration

### Environment Variables

```bash
VITE_GA_MEASUREMENT_ID  # Google Analytics (optional)
```

### API Endpoints
- Development: `/aipriceaction-api` (Vite proxy to localhost:3000)

## 📚 Key Concepts

### Refresh System
The application uses a 30-second auto-refresh system. Components automatically update when new data is available, with manual override options.

### Moving Average Scores
Percentage-based scoring system showing distance from moving averages, used for momentum and trend analysis.

### Market Hours
The application detects Vietnamese market hours and adjusts behavior accordingly for optimal user experience.

## 🧪 Testing

Uses Vitest for unit and integration testing:

```bash
pnpm test          # Run all tests
pnpm test --watch  # Watch mode
```

## 📖 Documentation

For detailed development guides and API documentation, see the `/docs` directory or visit the project wiki.

---

**Built with ❤️ for the Vietnamese investment community**