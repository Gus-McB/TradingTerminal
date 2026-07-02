/**
 * newsFetcher — mock news article store and fetcher.
 * In production this would call backend APIs or RSS endpoints.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface NewsArticle {
    id:        string;
    sourceId:  string;
    source:    string;
    headline:  string;
    snippet:   string;
    body:      string;
    timestamp: string;   // ISO
    tickers:   string[]; // Mentioned tickers
    sentiment: Sentiment;
    category:  string;
    url:       string;
    imageUrl?: string;
    read:      boolean;
}

// ─── Mock Articles ────────────────────────────────────────────────────────────

const now = Date.now();

export const MOCK_ARTICLES: NewsArticle[] = [
    {
        id: 'art-1', sourceId: 'reuters', source: 'Reuters', category: 'MACRO', sentiment: 'bullish',
        headline: 'Fed signals potential rate pause as inflation cools toward 2% target',
        snippet: 'Federal Reserve officials indicated a pause in rate hikes may be appropriate as core PCE data showed further moderation.',
        body: 'Federal Reserve officials indicated a pause in rate hikes may be appropriate as core PCE data showed further moderation toward the 2% target. Markets priced a 78% chance of no action at the next FOMC meeting. Chairman Powell noted that policy is "well into restrictive territory" and that further tightening may not be necessary if inflation continues declining. The 10-year Treasury yield dropped 8 basis points on the news to 4.34%, and the S&P 500 gained 0.4%.',
        timestamp: new Date(now - 900000).toISOString(), tickers: ['SPY', 'TLT', 'DXY'], url: '#', read: false,
    },
    {
        id: 'art-2', sourceId: 'bloomberg', source: 'Bloomberg', category: 'CRYPTO', sentiment: 'bullish',
        headline: 'Bitcoin surges past $63,000 as spot ETF inflows hit weekly record of $1.2B',
        snippet: 'Spot Bitcoin ETFs recorded $1.2B in net inflows this week, the highest since launch. Analysts cite institutional re-allocation from gold.',
        body: 'Spot Bitcoin ETFs recorded $1.2 billion in net inflows this week, the highest figure since the products launched in January. BlackRock\'s iShares Bitcoin Trust led the week with $520M in new assets. Analysts at Galaxy Digital attribute the surge to institutional re-allocation away from gold ETFs following stronger-than-expected CPI data. BTC/USD traded above $63,000 for the first time in three weeks, with options markets pricing a 65% probability of reaching $70,000 by end of quarter.',
        timestamp: new Date(now - 1920000).toISOString(), tickers: ['BTC/USD', 'IBIT', 'GBTC'], url: '#', read: false,
    },
    {
        id: 'art-3', sourceId: 'marketwatch', source: 'MarketWatch', category: 'EARNINGS', sentiment: 'bullish',
        headline: 'NVIDIA Q1 earnings demolish estimates; data-center revenue up 427% year-over-year',
        snippet: 'NVIDIA reported Q1 revenue of $26B, smashing the $24.6B consensus. Data-center segment alone contributed $22.6B driven by H100 GPU demand.',
        body: 'NVIDIA Corporation reported first-quarter revenue of $26.04 billion, far exceeding the Wall Street consensus of $24.65 billion and its own guidance of $24 billion. The data-center segment — fuelled by insatiable demand for its H100 and upcoming Blackwell architecture GPUs — contributed $22.6 billion, up 427% year-over-year. CEO Jensen Huang called the results "extraordinary" and said the company had entered "the next industrial revolution." EPS of $6.12 beat estimates by $0.47. The stock jumped 9.3% in after-hours trading.',
        timestamp: new Date(now - 3540000).toISOString(), tickers: ['NVDA', 'AMD', 'INTC'], url: '#', read: true,
    },
    {
        id: 'art-4', sourceId: 'cnbc', source: 'CNBC', category: 'MACRO', sentiment: 'neutral',
        headline: 'ECB holds rates steady; Lagarde non-committal on June cut timeline',
        snippet: 'The European Central Bank left its key rate at 4.0% and President Lagarde stopped short of committing to a June reduction.',
        body: 'The European Central Bank left its key deposit rate unchanged at 4.0% at its April meeting, in line with market expectations. President Christine Lagarde stressed that rate decisions will remain data-dependent and declined to pre-commit to any specific path, including the June meeting widely expected by markets. Headline inflation in the eurozone fell to 2.4% in March, but services inflation remains sticky at 4.0%, complicating the ECB\'s calculus. EUR/USD rose 0.15% following the statement.',
        timestamp: new Date(now - 5760000).toISOString(), tickers: ['EUR/USD', 'EWG', 'FXE'], url: '#', read: false,
    },
    {
        id: 'art-5', sourceId: 'bloomberg', source: 'Bloomberg', category: 'TECH', sentiment: 'bullish',
        headline: 'Apple plans AI-powered Siri overhaul ahead of WWDC; on-device LLM confirmed',
        snippet: 'Internal documents indicate Apple will unveil a generative AI layer for Siri at its annual developer conference.',
        body: 'Apple is preparing a comprehensive overhaul of its Siri voice assistant powered by an on-device large language model, according to internal documents and supply-chain sources. The revamped assistant — codenamed "Project Loquat" internally — will debut at WWDC in June and ship with iOS 18 this autumn. Unlike cloud-based AI approaches, Apple\'s model will process most queries locally to preserve privacy, a key differentiator from ChatGPT and Google Gemini integrations. Apple shares rose 1.2% on the news.',
        timestamp: new Date(now - 7080000).toISOString(), tickers: ['AAPL', 'MSFT', 'GOOGL'], url: '#', read: false,
    },
    {
        id: 'art-6', sourceId: 'reuters', source: 'Reuters', category: 'COMMODITIES', sentiment: 'bearish',
        headline: 'Oil retreats on surprise US inventory build; WTI falls below $78 per barrel',
        snippet: 'EIA data showed a surprise build of 4.2M barrels, pushing WTI crude down 1.3%. OPEC+ compliance remains above 90%.',
        body: 'West Texas Intermediate crude oil fell 1.3% to $77.85 per barrel after the Energy Information Administration reported a surprise inventory build of 4.2 million barrels for the week ended April 5, versus analyst expectations of a 1.5M barrel draw. The larger-than-expected build raised concerns about demand softness in the US, the world\'s largest consumer. OPEC+ production compliance remained above 90% in March, suggesting supply discipline is holding. Brent crude fell 1.1% to $82.40.',
        timestamp: new Date(now - 9000000).toISOString(), tickers: ['USO', 'XLE', 'CL'], url: '#', read: true,
    },
    {
        id: 'art-7', sourceId: 'marketwatch', source: 'MarketWatch', category: 'AUTOS', sentiment: 'bearish',
        headline: 'Tesla Autopilot probe widened by NHTSA to cover 2.5 million vehicles',
        snippet: 'The NHTSA expanded its probe after 20 additional incidents. Shares fell 2.1% in pre-market trading.',
        body: 'The National Highway Traffic Safety Administration said it was expanding its investigation into Tesla\'s Autopilot driver-assistance system to cover approximately 2.5 million vehicles after 20 additional incidents were reported involving the system operating in conditions for which it was not designed. The agency is specifically examining whether Tesla\'s recent over-the-air software updates adequately addressed prior safety concerns. Tesla shares fell 2.1% in pre-market trading to $162.40. CEO Elon Musk dismissed the investigation on social media.',
        timestamp: new Date(now - 11520000).toISOString(), tickers: ['TSLA', 'GM', 'F'], url: '#', read: false,
    },
    {
        id: 'art-8', sourceId: 'cnbc', source: 'CNBC', category: 'RATES', sentiment: 'neutral',
        headline: 'Treasury yields steady ahead of pivotal CPI print Thursday; 10-year at 4.42%',
        snippet: "The 10-year yield held at 4.42% as investors positioned for Thursday's CPI. A reading above 3.5% could revive rate-hike expectations.",
        body: 'Treasury yields held steady on Wednesday as investors positioned ahead of Thursday\'s Consumer Price Index release, widely seen as the most important macro data point of the month. The 10-year yield traded at 4.42%, unchanged from Tuesday\'s close. Wall Street consensus expects headline CPI of +3.4% year-over-year. A reading above 3.5% would likely push yields higher and weigh on equities, potentially reviving bets on additional rate hikes. A print below 3.2% could reignite rate-cut expectations.',
        timestamp: new Date(now - 14400000).toISOString(), tickers: ['TLT', 'IEF', 'SPY'], url: '#', read: false,
    },
    {
        id: 'art-9', sourceId: 'morningstar', source: 'Morningstar', category: 'RESEARCH', sentiment: 'bullish',
        headline: 'Microsoft Azure growth reaccelerates in Q3; AI services now >10% of cloud revenue',
        snippet: 'Azure grew 31% in Q3, beating estimates of 28%. Microsoft attributed the beat to strong AI workload adoption.',
        body: 'Microsoft reported third-quarter Azure cloud revenue growth of 31% year-over-year, exceeding analyst expectations of 28% and showing a re-acceleration from 28% in the prior quarter. CEO Satya Nadella said AI services now represent more than 10% of total Azure revenue, up from 6% six months ago. The company\'s Copilot AI integration across Office 365 has driven a meaningful uplift in per-seat pricing. Microsoft raised its full-year cloud revenue guidance by $2 billion. Morningstar maintained its Outperform rating with a $450 price target.',
        timestamp: new Date(now - 18000000).toISOString(), tickers: ['MSFT', 'AMZN', 'GOOGL'], url: '#', read: false,
    },
    {
        id: 'art-10', sourceId: 'edgar', source: 'SEC EDGAR', category: 'REGULATORY', sentiment: 'neutral',
        headline: 'Amazon files 8-K: Announces $10B share buyback program and new AWS data-center expansion',
        snippet: 'Amazon disclosed a $10 billion share repurchase authorization and plans for 5 new AWS data centers in the US and Europe.',
        body: 'Amazon.com Inc. filed an 8-K with the Securities and Exchange Commission disclosing a new $10 billion share repurchase program, the company\'s third buyback authorization in two years. The filing also announced Amazon Web Services would establish five new data centers in Northern Virginia, Ohio, Ireland, Germany, and Japan over the next 18 months, representing an estimated capital expenditure of $18 billion. The buyback authorization has no expiration date. Amazon shares rose 1.8% in after-hours trading following the filing.',
        timestamp: new Date(now - 21600000).toISOString(), tickers: ['AMZN', 'MSFT', 'GOOGL'], url: '#', read: true,
    },
];

// ─── Fetcher ──────────────────────────────────────────────────────────────────

class NewsFetcher {
    private articles: NewsArticle[] = [...MOCK_ARTICLES];
    private fetchTime: string = new Date().toISOString();

    getArticles(sourceIds?: string[]): NewsArticle[] {
        if (!sourceIds || sourceIds.length === 0) return [...this.articles];
        return this.articles.filter(a => sourceIds.includes(a.sourceId));
    }

    getBySymbol(symbol: string): NewsArticle[] {
        return this.articles.filter(a => a.tickers.some(t => t.toLowerCase() === symbol.toLowerCase()));
    }

    markRead(id: string): void {
        this.articles = this.articles.map(a => a.id === id ? { ...a, read: true } : a);
    }

    getFetchTime(): string { return this.fetchTime; }

    getUnreadCount(sourceId: string): number {
        return this.articles.filter(a => a.sourceId === sourceId && !a.read).length;
    }

    /** Simulate a manual fetch — adds a mock new article. */
    fetchNow(_sourceId: string): Promise<number> {
        return new Promise(resolve => {
            setTimeout(() => {
                this.fetchTime = new Date().toISOString();
                resolve(Math.floor(Math.random() * 5) + 1);
            }, 800);
        });
    }
}

export const newsFetcher = new NewsFetcher();
