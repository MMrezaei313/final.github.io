// مدیر داده‌های پیشرفته
class DataManager {
    constructor() {
        this.apiService = new AdvancedAPIService();
        this.cacheService = new CacheService();
        this.marketData = {
            stocks: [],
            indices: [],
            crypto: [],
            gold: [],
            currency: [],
            commodities: [],
            farabourseIndices: []
        };
        
        this.historicalData = new Map();
        this.portfolioData = [];
        this.analysisResults = new Map();
        
        this.init();
    }

    init() {
        this.setupDataSync();
        this.loadInitialData();
        this.setupDataValidation();
    }

    setupDataSync() {
        // همگام‌سازی دوره‌ای داده‌ها
        setInterval(() => {
            this.syncMarketData();
        }, 60000); // هر 1 دقیقه

        // همگام‌سازی داده‌های تاریخی
        setInterval(() => {
            this.syncHistoricalData();
        }, 300000); // هر 5 دقیقه
    }

    async loadInitialData() {
        try {
            await this.loadAllMarketData();
            await this.loadTechnicalIndicators();
            await this.loadRiskMetrics();
            
            console.log('✅ داده‌های اولیه با موفقیت بارگذاری شدند');
            
        } catch (error) {
            console.error('❌ خطا در بارگذاری داده‌های اولیه:', error);
        }
    }

    async loadAllMarketData() {
        const dataTypes = [
            'STOCK_SYMBOLS',
            'STOCK_INDEX', 
            'FARABOURSE_INDEX',
            'CRYPTO',
            'GOLD',
            'CURRENCY',
            'COMMODITY_METALS'
        ];

        const requests = dataTypes.map(type => 
            this.apiService.fetchMarketData(type, { useCache: true })
        );

        try {
            const results = await Promise.allSettled(requests);
            this.processMarketDataResults(results, dataTypes);
            
        } catch (error) {
            console.error('خطا در دریافت داده‌های بازار:', error);
            this.useFallbackData();
        }
    }

    processMarketDataResults(results, dataTypes) {
        results.forEach((result, index) => {
            const type = dataTypes[index];
            
            if (result.status === 'fulfilled' && result.value) {
                const dataKey = this.getDataKey(type);
                this.marketData[dataKey] = result.value;
                
                // پردازش و بهبود داده‌ها
                this.enhanceMarketData(dataKey, result.value);
                
            } else {
                console.warn(`داده‌های ${type} در دسترس نیست`);
                const dataKey = this.getDataKey(type);
                this.marketData[dataKey] = this.apiService.getFallbackData(type);
            }
        });

        // به‌روزرسانی UI
        this.updateUIWithMarketData();
    }

    getDataKey(type) {
        const keyMap = {
            'STOCK_SYMBOLS': 'stocks',
            'STOCK_INDEX': 'indices',
            'FARABOURSE_INDEX': 'farabourseIndices',
            'CRYPTO': 'crypto',
            'GOLD': 'gold',
            'CURRENCY': 'currency',
            'COMMODITY_METALS': 'commodities'
        };
        
        return keyMap[type] || type.toLowerCase();
    }

    enhanceMarketData(dataKey, data) {
        // بهبود داده‌ها با اطلاعات اضافی
        switch(dataKey) {
            case 'stocks':
                data.forEach(stock => {
                    stock.technicalScore = this.calculateTechnicalScore(stock);
                    stock.sentimentScore = this.calculateSentimentScore(stock);
                    stock.riskLevel = this.calculateRiskLevel(stock);
                });
                break;
                
            case 'crypto':
                data.forEach(crypto => {
                    crypto.volatility = this.calculateVolatility(crypto);
                    crypto.trend = this.analyzeTrend(crypto);
                });
                break;
        }
    }

    calculateTechnicalScore(stock) {
        // محاسبه امتیاز تکنیکال
        const factors = {
            volume: stock.volume > 1000000 ? 1 : 0,
            momentum: stock.changePercent > 0 ? 1 : 0,
            stability: Math.abs(stock.changePercent) < 5 ? 1 : 0
        };
        
        return Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length;
    }

    calculateSentimentScore(stock) {
        // تحلیل احساسات بر اساس تغییرات قیمت و حجم
        let score = 0.5; // نمره پایه
        
        if (stock.changePercent > 2) score += 0.2;
        if (stock.changePercent < -2) score -= 0.2;
        if (stock.volume > stock.previousVolume * 1.5) score += 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    calculateRiskLevel(stock) {
        // محاسبه سطح ریسک
        const volatility = Math.abs(stock.changePercent);
        
        if (volatility < 2) return 'low';
        if (volatility < 5) return 'medium';
        return 'high';
    }

    updateUIWithMarketData() {
        // به‌روزرسانی رابط کاربری با داده‌های جدید
        if (window.UIManager) {
            window.UIManager.updateMarketDisplay();
            window.UIManager.updateCharts();
            window.UIManager.updateTechnicalIndicators();
            window.UIManager.updateRiskMetrics();
        }
    }

    async syncMarketData() {
        console.log('🔄 همگام‌سازی داده‌های بازار...');
        
        try {
            await this.loadAllMarketData();
            console.log('✅ داده‌های بازار همگام‌سازی شدند');
            
        } catch (error) {
            console.warn('⚠️ خطا در همگام‌سازی داده‌های بازار:', error);
        }
    }

    async syncHistoricalData() {
        // همگام‌سازی داده‌های تاریخی برای تحلیل‌های پیشرفته
        const symbols = this.marketData.stocks.slice(0, 10).map(stock => stock.symbol);
        
        for (const symbol of symbols) {
            try {
                const historicalData = await this.fetchHistoricalData(symbol);
                this.historicalData.set(symbol, historicalData);
            } catch (error) {
                console.warn(`خطا در دریافت داده‌های تاریخی ${symbol}:`, error);
            }
        }
    }

    async fetchHistoricalData(symbol, period = '1y') {
        // شبیه‌سازی دریافت داده‌های تاریخی
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = this.generateMockHistoricalData(symbol, period);
                resolve(data);
            }, 1000);
        });
    }

    generateMockHistoricalData(symbol, period) {
        const dataPoints = period === '1y' ? 365 : 30;
        const basePrice = this.marketData.stocks.find(s => s.symbol === symbol)?.price || 10000;
        
        const data = [];
        let currentPrice = basePrice;
        
        for (let i = dataPoints; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // شبیه‌سازی نوسانات قیمت
            const change = (Math.random() - 0.5) * 0.1; // ±5%
            currentPrice = currentPrice * (1 + change);
            
            data.push({
                date: date.toISOString().split('T')[0],
                price: Math.round(currentPrice),
                volume: Math.floor(Math.random() * 1000000),
                high: Math.round(currentPrice * (1 + Math.random() * 0.05)),
                low: Math.round(currentPrice * (1 - Math.random() * 0.05)),
                open: Math.round(currentPrice * (1 + (Math.random() - 0.5) * 0.02))
            });
        }
        
        return data;
    }

    async loadTechnicalIndicators() {
        // محاسبه اندیکاتورهای تکنیکال
        const indicators = {};
        
        this.marketData.stocks.forEach(stock => {
            indicators[stock.symbol] = this.calculateTechnicalIndicators(stock);
        });
        
        this.analysisResults.set('technicalIndicators', indicators);
        return indicators;
    }

    calculateTechnicalIndicators(stock) {
        return {
            rsi: this.calculateRSI(stock),
            macd: this.calculateMACD(stock),
            bollingerBands: this.calculateBollingerBands(stock),
            movingAverages: this.calculateMovingAverages(stock),
            support: this.calculateSupportLevel(stock),
            resistance: this.calculateResistanceLevel(stock)
        };
    }

    calculateRSI(stock) {
        // شبیه‌سازی محاسبه RSI
        return 30 + Math.random() * 40; // بین 30 تا 70
    }

    calculateMACD(stock) {
        return {
            macd: (Math.random() - 0.5) * 2,
            signal: (Math.random() - 0.5) * 1.5,
            histogram: (Math.random() - 0.5) * 0.5
        };
    }

    async loadRiskMetrics() {
        // محاسبه معیارهای ریسک
        const riskMetrics = {
            portfolioVar: this.calculatePortfolioVaR(),
            maxDrawdown: this.calculateMaxDrawdown(),
            volatility: this.calculatePortfolioVolatility(),
            beta: this.calculatePortfolioBeta(),
            sharpeRatio: this.calculateSharpeRatio()
        };
        
        this.analysisResults.set('riskMetrics', riskMetrics);
        return riskMetrics;
    }

    calculatePortfolioVaR() {
        // شبیه‌سازی محاسبه Value at Risk
        return (Math.random() * 5).toFixed(2) + '%';
    }

    calculateMaxDrawdown() {
        return (Math.random() * 15).toFixed(2) + '%';
    }

    setupDataValidation() {
        // راه‌اندازی اعتبارسنجی دوره‌ای داده‌ها
        setInterval(() => {
            this.validateDataQuality();
        }, 300000); // هر 5 دقیقه
    }

    validateDataQuality() {
        const validations = {
            stocks: this.validateStockData(),
            indices: this.validateIndexData(),
            crypto: this.validateCryptoData()
        };
        
        const issues = Object.entries(validations)
            .filter(([_, isValid]) => !isValid)
            .map(([type]) => type);
        
        if (issues.length > 0) {
            console.warn(`مسائل کیفیت داده در: ${issues.join(', ')}`);
            this.handleDataQualityIssues(issues);
        }
    }

    validateStockData() {
        const stocks = this.marketData.stocks;
        
        if (!Array.isArray(stocks) || stocks.length === 0) return false;
        
        // بررسی نمونه‌ای از داده‌ها
        const sample = stocks.slice(0, 5);
        return sample.every(stock => 
            stock.symbol && 
            stock.price > 0 && 
            !isNaN(stock.changePercent)
        );
    }

    handleDataQualityIssues(issues) {
        issues.forEach(issue => {
            // تلاش برای ترمیم داده‌ها
            this.attemptDataRecovery(issue);
            
            // اطلاع‌رسانی به کاربر
            if (window.UIManager) {
                window.UIManager.showNotification(
                    `مشکل در داده‌های ${issue} - در حال ترمیم...`,
                    'warning'
                );
            }
        });
    }

    attemptDataRecovery(dataType) {
        // تلاش برای بازیابی داده‌های مشکل‌دار
        switch(dataType) {
            case 'stocks':
                this.marketData.stocks = this.apiService.getFallbackData('STOCK_SYMBOLS');
                break;
            case 'crypto':
                this.marketData.crypto = this.apiService.getFallbackData('CRYPTO');
                break;
        }
    }

    useFallbackData() {
        // استفاده از داده‌های نمونه در صورت خطا
        console.log('🔄 استفاده از داده‌های نمونه...');
        
        this.marketData.stocks = this.apiService.getFallbackData('STOCK_SYMBOLS');
        this.marketData.indices = this.apiService.getFallbackData('STOCK_INDEX');
        this.marketData.crypto = this.apiService.getFallbackData('CRYPTO');
        this.marketData.gold = this.apiService.getFallbackData('GOLD');
        this.marketData.currency = this.apiService.getFallbackData('CURRENCY');
        
        this.updateUIWithMarketData();
    }

    // متدهای دسترسی به داده‌ها
    getMarketData(type) {
        return this.marketData[type] || [];
    }

    getStockBySymbol(symbol) {
        return this.marketData.stocks.find(stock => stock.symbol === symbol);
    }

    getHistoricalData(symbol) {
        return this.historicalData.get(symbol) || [];
    }

    getAnalysisResult(type) {
        return this.analysisResults.get(type);
    }

    getPortfolioData() {
        return this.portfolioData;
    }

    // متدهای مدیریت پرتفوی
    addToPortfolio(symbol, quantity, price) {
        const existingItem = this.portfolioData.find(item => item.symbol === symbol);
        
        if (existingItem) {
            // به‌روزرسانی موجودی
            const totalCost = existingItem.quantity * existingItem.averagePrice + quantity * price;
            existingItem.quantity += quantity;
            existingItem.averagePrice = totalCost / existingItem.quantity;
        } else {
            // افزودن جدید
            this.portfolioData.push({
                symbol,
                quantity,
                averagePrice: price,
                entryDate: new Date(),
                currentPrice: price
            });
        }
        
        this.savePortfolioData();
        return true;
    }

    removeFromPortfolio(symbol, quantity) {
        const itemIndex = this.portfolioData.findIndex(item => item.symbol === symbol);
        
        if (itemIndex === -1) return false;
        
        const item = this.portfolioData[itemIndex];
        
        if (item.quantity <= quantity) {
            // حذف کامل
            this.portfolioData.splice(itemIndex, 1);
        } else {
            // کاهش موجودی
            item.quantity -= quantity;
        }
        
        this.savePortfolioData();
        return true;
    }

    calculatePortfolioValue() {
        return this.portfolioData.reduce((total, item) => {
            const currentPrice = this.getStockBySymbol(item.symbol)?.price || item.currentPrice;
            return total + (item.quantity * currentPrice);
        }, 0);
    }

    calculatePortfolioPerformance() {
        const totalCost = this.portfolioData.reduce((total, item) => 
            total + (item.quantity * item.averagePrice), 0
        );
        
        const currentValue = this.calculatePortfolioValue();
        const profit = currentValue - totalCost;
        const profitPercentage = (profit / totalCost) * 100;
        
        return {
            totalCost,
            currentValue,
            profit,
            profitPercentage,
            items: this.portfolioData.length
        };
    }

    savePortfolioData() {
        try {
            const encrypted = this.apiService.securityService.encryptData(
                JSON.stringify(this.portfolioData)
            );
            localStorage.setItem('portfolio_data', encrypted);
        } catch (error) {
            console.error('خطا در ذخیره‌سازی پرتفوی:', error);
        }
    }

    loadPortfolioData() {
        try {
            const encrypted = localStorage.getItem('portfolio_data');
            if (encrypted) {
                const decrypted = this.apiService.securityService.decryptData(encrypted);
                this.portfolioData = JSON.parse(decrypted);
            }
        } catch (error) {
            console.error('خطا در بارگذاری پرتفوی:', error);
            this.portfolioData = [];
        }
    }

    // متدهای گزارش‌گیری
    generatePortfolioReport() {
        const performance = this.calculatePortfolioPerformance();
        const holdings = this.portfolioData.map(item => {
            const currentPrice = this.getStockBySymbol(item.symbol)?.price || item.currentPrice;
            const currentValue = item.quantity * currentPrice;
            const profit = currentValue - (item.quantity * item.averagePrice);
            
            return {
                symbol: item.symbol,
                quantity: item.quantity,
                averagePrice: item.averagePrice,
                currentPrice: currentPrice,
                currentValue: currentValue,
                profit: profit,
                profitPercentage: (profit / (item.quantity * item.averagePrice)) * 100
            };
        });

        return {
            summary: performance,
            holdings: holdings,
            generatedAt: new Date(),
            reportType: 'portfolio'
        };
    }

    getDataStats() {
        return {
            marketData: {
                stocks: this.marketData.stocks.length,
                indices: this.marketData.indices.length,
                crypto: this.marketData.crypto.length,
                gold: this.marketData.gold.length,
                currency: this.marketData.currency.length,
                commodities: this.marketData.commodities.length
            },
            historicalData: this.historicalData.size,
            portfolio: this.portfolioData.length,
            analysisResults: this.analysisResults.size,
            cache: this.cacheService.getStats()
        };
    }
}
