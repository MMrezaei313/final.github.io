// موتور معاملاتی پیشرفته
class AdvancedTradingEngine {
    constructor() {
        this.tradingModel = new AdvancedTradingModel();
        this.positions = new Map();
        this.orderHistory = [];
        this.performance = {
            totalTrades: 0,
            profitableTrades: 0,
            totalProfit: 0,
            winRate: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
        };
        
        this.isRunning = false;
        this.settings = {
            autoTrading: false,
            maxPositions: 5,
            riskPerTrade: 0.02, // 2% ریسک در هر معامله
            dailyLossLimit: 0.05, // 5% ضرر روزانه
            takeProfit: 0.08, // 8% حد سود
            stopLoss: 0.03 // 3% حد ضرر
        };
        
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadHistoricalData();
        this.setupRiskManagement();
    }

    // تحلیل بازار و تولید سیگنال
    async analyzeMarket(symbols = null) {
        const dataManager = window.FinancialAnalysisApp?.dataManager;
        if (!dataManager) {
            throw new Error('Data manager not available');
        }

        const analysisResults = [];
        const targetSymbols = symbols || this.getWatchlistSymbols();

        for (const symbol of targetSymbols) {
            try {
                const marketData = dataManager.getMarketData('stocks');
                const symbolData = marketData.find(s => s.symbol === symbol);
                
                if (!symbolData) continue;

                // دریافت داده‌های تاریخی برای تحلیل
                const historicalData = dataManager.getHistoricalData(symbol) || 
                                      this.generateSampleData(symbolData);

                const analysis = await this.tradingModel.analyzeMarket(
                    symbol, 
                    historicalData,
                    '1h'
                );

                analysisResults.push(analysis);

                // معامله خودکار اگر فعال باشد
                if (this.settings.autoTrading && this.shouldExecuteTrade(analysis)) {
                    await this.executeAutoTrade(analysis);
                }

            } catch (error) {
                console.error(`خطا در تحلیل ${symbol}:`, error);
            }
        }

        return analysisResults;
    }

    // اجرای معامله خودکار
    async executeAutoTrade(analysis) {
        if (!this.shouldExecuteTrade(analysis)) {
            return null;
        }

        const signal = analysis.finalSignal;
        const symbol = analysis.symbol;

        // بررسی محدودیت‌ها
        if (!this.checkTradingLimits(symbol, signal.direction)) {
            console.log(`معامله ${symbol} به دلیل محدودیت‌ها لغو شد`);
            return null;
        }

        // محاسبه سایز پوزیشن
        const positionSize = this.calculatePositionSize(analysis);
        
        // ایجاد سفارش
        const order = {
            id: this.generateOrderId(),
            symbol: symbol,
            type: signal.direction === 'LONG' ? 'BUY' : 'SELL',
            quantity: positionSize,
            price: this.getCurrentPrice(symbol),
            timestamp: new Date(),
            strategy: 'AI_AUTO_TRADING',
            analysis: analysis,
            stopLoss: this.calculateStopLoss(analysis),
            takeProfit: this.calculateTakeProfit(analysis)
        };

        // اجرای معامله
        const trade = await this.executeOrder(order);
        
        if (trade) {
            this.positions.set(trade.id, trade);
            this.orderHistory.push(trade);
            
            // اطلاع‌رسانی
            this.notifyTradeExecution(trade);
            
            // شروع مانیتورینگ معامله
            this.monitorPosition(trade.id);
        }

        return trade;
    }

    // بررسی شرایط اجرای معامله
    shouldExecuteTrade(analysis) {
        const signal = analysis.finalSignal;
        
        if (signal.direction === 'NEUTRAL') return false;
        if (signal.confidence < 0.6) return false;
        if (signal.strength < 0.5) return false;
        if (analysis.riskAssessment.level === 'HIGH') return false;
        
        // بررسی شرایط بازار
        if (this.isMarketClosed()) return false;
        
        return true;
    }

    // بررسی محدودیت‌های معاملاتی
    checkTradingLimits(symbol, direction) {
        // بررسی تعداد پوزیشن‌های فعال
        const activePositions = Array.from(this.positions.values()).filter(
            pos => !pos.exitPrice
        );
        
        if (activePositions.length >= this.settings.maxPositions) {
            return false;
        }

        // بررسی معاملات اخیر روی同一 سهم
        const recentTrades = this.orderHistory.filter(order => 
            order.symbol === symbol && 
            Date.now() - order.timestamp.getTime() < 3600000 // 1 ساعت
        );

        if (recentTrades.length > 0) {
            return false;
        }

        // بررسی ریسک روزانه
        const dailyLoss = this.calculateDailyLoss();
        if (dailyLoss > this.settings.dailyLossLimit) {
            return false;
        }

        return true;
    }

    // محاسبه سایز پوزیشن
    calculatePositionSize(analysis) {
        const signalStrength = analysis.finalSignal.strength;
        const riskScore = analysis.riskAssessment.score;
        const accountSize = this.getAccountSize(); // در محیط واقعی از سرور دریافت شود
        
        // فرمول پیشرفته محاسبه سایز
        const baseSize = this.settings.riskPerTrade * accountSize;
        const strengthMultiplier = signalStrength;
        const riskMultiplier = 1 - riskScore;
        
        let positionSize = baseSize * strengthMultiplier * riskMultiplier;
        
        // اعمال محدودیت‌ها
        positionSize = Math.min(positionSize, accountSize * 0.1); // حداکثر 10% حساب
        positionSize = Math.max(positionSize, accountSize * 0.01); // حداقل 1% حساب
        
        return Math.round(positionSize * 100) / 100;
    }

    // اجرای سفارش
    async executeOrder(order) {
        // در محیط واقعی به بروکر متصل می‌شود
        // اینجا شبیه‌سازی می‌کنیم
        
        try {
            const executedOrder = {
                ...order,
                status: 'EXECUTED',
                executedPrice: this.getCurrentPrice(order.symbol),
                executedAt: new Date(),
                commission: this.calculateCommission(order),
                netAmount: this.calculateNetAmount(order)
            };

            console.log(`✅ سفارش اجرا شد: ${order.type} ${order.symbol}`, executedOrder);
            return executedOrder;

        } catch (error) {
            console.error('❌ خطا در اجرای سفارش:', error);
            return null;
        }
    }

    // مانیتورینگ پوزیشن
    async monitorPosition(positionId) {
        const position = this.positions.get(positionId);
        if (!position) return;

        const checkInterval = setInterval(async () => {
            const currentPrice = this.getCurrentPrice(position.symbol);
            const unrealizedPL = this.calculateUnrealizedPL(position, currentPrice);
            
            // بررسی حد سود و ضرر
            if (this.shouldExitPosition(position, currentPrice)) {
                await this.closePosition(positionId, currentPrice);
                clearInterval(checkInterval);
                return;
            }

            // به‌روزرسانی وضعیت پوزیشن
            position.currentPrice = currentPrice;
            position.unrealizedPL = unrealizedPL;
            position.lastUpdated = new Date();

            // اطلاع‌رسانی تغییرات مهم
            this.notifyPositionUpdate(position);

        }, 30000); // هر 30 ثانیه
    }

    // بررسی شرایط خروج از پوزیشن
    shouldExitPosition(position, currentPrice) {
        const entryPrice = position.executedPrice;
        const plPercentage = (currentPrice - entryPrice) / entryPrice * 100;
        
        // بررسی حد سود
        if (plPercentage >= position.takeProfit) {
            console.log(`🎯 حد سود触发 برای ${position.symbol}`);
            return true;
        }
        
        // بررسی حد ضرر
        if (plPercentage <= -position.stopLoss) {
            console.log(`🛑 حد ضرر触发 برای ${position.symbol}`);
            return true;
        }
        
        // بررسی شرایط بازار
        if (this.shouldEmergencyExit(position)) {
            console.log(`🚨 خروج اضطراری برای ${position.symbol}`);
            return true;
        }
        
        return false;
    }

    // بستن پوزیشن
    async closePosition(positionId, exitPrice) {
        const position = this.positions.get(positionId);
        if (!position) return;

        const exitOrder = {
            id: this.generateOrderId(),
            symbol: position.symbol,
            type: position.type === 'BUY' ? 'SELL' : 'BUY',
            quantity: position.quantity,
            price: exitPrice,
            timestamp: new Date(),
            reason: 'AUTO_EXIT'
        };

        const executedExit = await this.executeOrder(exitOrder);
        
        if (executedExit) {
            // محاسبه سود/زیان
            const pl = this.calculateRealizedPL(position, executedExit);
            
            // به‌روزرسانی پوزیشن
            position.exitPrice = exitPrice;
            position.exitTime = new Date();
            position.realizedPL = pl;
            position.status = 'CLOSED';
            
            // به‌روزرسانی عملکرد
            this.updatePerformanceMetrics(position);
            
            // اطلاع‌رسانی
            this.notifyPositionClosed(position, pl);
            
            console.log(`🔒 پوزیشن بسته شد: ${position.symbol} - سود/زیان: ${pl}`);
        }
    }

    // مدیریت ریسک
    setupRiskManagement() {
        // مانیتورینگ ریسک دوره‌ای
        setInterval(() => {
            this.checkRiskLimits();
            this.hedgePositionsIfNeeded();
        }, 60000); // هر 1 دقیقه
    }

    checkRiskLimits() {
        const totalExposure = this.calculateTotalExposure();
        const dailyLoss = this.calculateDailyLoss();
        const portfolioRisk = this.calculatePortfolioRisk();
        
        // بررسی محدودیت‌های ریسک
        if (totalExposure > this.settings.maxPositions * 2) {
            console.warn('⚠️ هشدار: exposure portfolio بالا');
            this.reduceExposure();
        }
        
        if (dailyLoss > this.settings.dailyLossLimit) {
            console.warn('⚠️ هشدار: ضرر روزانه از حد مجاز فراتر رفته');
            this.closeAllPositions();
        }
        
        if (portfolioRisk > 0.8) {
            console.warn('⚠️ هشدار: ریسک portfolio بالا');
            this.adjustRisk();
        }
    }

    // توابع کمکی
    getWatchlistSymbols() {
        // در محیط واقعی از تنظیمات کاربر گرفته می‌شود
        return ['شتران', 'فولاد', 'خساپا', 'وبصادر', 'شپنا'];
    }

    getCurrentPrice(symbol) {
        // در محیط واقعی از API قیمت گرفته می‌شود
        const dataManager = window.FinancialAnalysisApp?.dataManager;
        const stock = dataManager?.getStockBySymbol(symbol);
        return stock?.price || Math.random() * 50000 + 10000;
    }

    calculateCommission(order) {
        // محاسبه کارمزد معامله
        const commissionRate = 0.0015; // 0.15%
        return order.quantity * order.price * commissionRate;
    }

    calculateNetAmount(order) {
        const grossAmount = order.quantity * order.price;
        const commission = this.calculateCommission(order);
        return order.type === 'BUY' ? grossAmount + commission : grossAmount - commission;
    }

    calculateUnrealizedPL(position, currentPrice) {
        const valueChange = (currentPrice - position.executedPrice) * position.quantity;
        return position.type === 'BUY' ? valueChange : -valueChange;
    }

    calculateRealizedPL(position, exitOrder) {
        const entryValue = position.quantity * position.executedPrice;
        const exitValue = position.quantity * exitOrder.executedPrice;
        const commissions = position.commission + exitOrder.commission;
        
        return position.type === 'BUY' ? 
               exitValue - entryValue - commissions : 
               entryValue - exitValue - commissions;
    }

    calculateTotalExposure() {
        return Array.from(this.positions.values())
            .filter(pos => !pos.exitPrice)
            .reduce((total, pos) => total + (pos.quantity * pos.executedPrice), 0);
    }

    calculateDailyLoss() {
        const today = new Date().toDateString();
        const todayTrades = this.orderHistory.filter(order => 
            order.executedAt.toDateString() === today && order.realizedPL
        );
        
        const totalLoss = todayTrades.reduce((sum, trade) => {
            return trade.realizedPL < 0 ? sum + trade.realizedPL : sum;
        }, 0);
        
        return Math.abs(totalLoss) / this.getAccountSize();
    }

    calculatePortfolioRisk() {
        // محاسبه ریسک portfolio با VaR ساده
        const activePositions = Array.from(this.positions.values())
            .filter(pos => !pos.exitPrice);
        
        if (activePositions.length === 0) return 0;
        
        const totalValue = this.getAccountSize();
        const positionsRisk = activePositions.reduce((risk, pos) => {
            return risk + (pos.quantity * pos.executedPrice * 0.05); // فرض 5% ریسک برای هر سهم
        }, 0);
        
        return positionsRisk / totalValue;
    }

    getAccountSize() {
        // در محیط واقعی از سرور گرفته می‌شود
        return 100000000; // 100 میلیون تومان
    }

    generateOrderId() {
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateSampleData(symbolData) {
        // تولید داده‌های نمونه برای تست
        const data = [];
        const basePrice = symbolData.price;
        
        for (let i = 30; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const change = (Math.random() - 0.5) * 0.1;
            const price = basePrice * (1 + change);
            const volume = Math.floor(Math.random() * 1000000) + 100000;
            
            data.push({
                date: date.toISOString().split('T')[0],
                open: price * (1 + (Math.random() - 0.5) * 0.02),
                high: price * (1 + Math.random() * 0.05),
                low: price * (1 - Math.random() * 0.05),
                close: price,
                volume: volume
            });
        }
        
        return data;
    }

    // توابع اطلاع‌رسانی
    notifyTradeExecution(trade) {
        const message = `معامله ${trade.type === 'BUY' ? 'خرید' : 'فروش'} ${trade.symbol} اجرا شد`;
        if (window.UIManager) {
            window.UIManager.showNotification(message, 'success');
        }
    }

    notifyPositionUpdate(position) {
        // اطلاع‌رسانی تغییرات مهم در پوزیشن
        if (Math.abs(position.unrealizedPL) > position.quantity * position.executedPrice * 0.05) {
            const message = `پوزیشن ${position.symbol}: ${position.unrealizedPL > 0 ? 'سود' : 'ضرر'} ${Math.abs(position.unrealizedPL).toLocaleString()}`;
            if (window.UIManager) {
                window.UIManager.showNotification(message, 
                    position.unrealizedPL > 0 ? 'success' : 'warning');
            }
        }
    }

    notifyPositionClosed(position, pl) {
        const message = `پوزیشن ${position.symbol} بسته شد - سود/زیان: ${pl.toLocaleString()}`;
        if (window.UIManager) {
            window.UIManager.showNotification(message, 
                pl > 0 ? 'success' : 'error');
        }
    }

    // توابع مدیریت
    reduceExposure() {
        // کاهش exposure با بستن برخی پوزیشن‌ها
        const activePositions = Array.from(this.positions.values())
            .filter(pos => !pos.exitPrice)
            .sort((a, b) => a.unrealizedPL - b.unrealizedPL); // بستن ضررده‌ها اول
        
        const positionsToClose = Math.ceil(activePositions.length / 2);
        
        for (let i = 0; i < positionsToClose; i++) {
            this.closePosition(activePositions[i].id, this.getCurrentPrice(activePositions[i].symbol));
        }
    }

    closeAllPositions() {
        // بستن تمام پوزیشن‌ها
        Array.from(this.positions.values())
            .filter(pos => !pos.exitPrice)
            .forEach(pos => {
                this.closePosition(pos.id, this.getCurrentPrice(pos.symbol));
            });
    }

    adjustRisk() {
        // تنظیم ریسک portfolio
        this.settings.riskPerTrade *= 0.5; // کاهش ریسک
        this.settings.maxPositions = Math.max(1, this.settings.maxPositions - 1);
        
        console.log('🔧 تنظیم ریسک: کاهش سایز معاملات و تعداد پوزیشن‌ها');
    }

    // گزارش‌گیری
    getTradingReport() {
        const activePositions = Array.from(this.positions.values())
            .filter(pos => !pos.exitPrice);
        
        const closedPositions = Array.from(this.positions.values())
            .filter(pos => pos.exitPrice);
        
        const today = new Date().toDateString();
        const todayTrades = this.orderHistory.filter(order => 
            order.executedAt.toDateString() === today
        );
        
        return {
            summary: {
                activePositions: activePositions.length,
                closedPositions: closedPositions.length,
                todayTrades: todayTrades.length,
                totalTrades: this.orderHistory.length,
                winRate: this.performance.winRate,
                totalProfit: this.performance.totalProfit
            },
            activePositions: activePositions.map(pos => ({
                symbol: pos.symbol,
                type: pos.type,
                quantity: pos.quantity,
                entryPrice: pos.executedPrice,
                currentPrice: pos.currentPrice,
                unrealizedPL: pos.unrealizedPL,
                stopLoss: pos.stopLoss,
                takeProfit: pos.takeProfit
            })),
            performance: this.performance,
            settings: this.settings
        };
    }

    updatePerformanceMetrics(closedPosition) {
        this.performance.totalTrades++;
        
        if (closedPosition.realizedPL > 0) {
            this.performance.profitableTrades++;
        }
        
        this.performance.totalProfit += closedPosition.realizedPL;
        this.performance.winRate = this.performance.profitableTrades / this.performance.totalTrades;
        
        // محاسبه Sharpe Ratio (ساده)
        const avgReturn = this.performance.totalProfit / this.performance.totalTrades;
        this.performance.sharpeRatio = avgReturn > 0 ? avgReturn / 0.02 : 0; // فرض نوسان 2%
    }

    // مدیریت تنظیمات
    loadSettings() {
        try {
            const saved = localStorage.getItem('trading_engine_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('خطا در بارگذاری تنظیمات تریدینگ:', error);
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('trading_engine_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('خطا در ذخیره تنظیمات تریدینگ:', error);
        }
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }

    // کنترل موتور
    start() {
        this.isRunning = true;
        console.log('🚀 موتور تریدینگ فعال شد');
        
        // شروع تحلیل دوره‌ای
        this.analysisInterval = setInterval(() => {
            this.analyzeMarket();
        }, 300000); // هر 5 دقیقه
    }

    stop() {
        this.isRunning = false;
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
        console.log('🛑 موتور تریدینگ متوقف شد');
    }

    emergencyStop() {
        this.stop();
        this.closeAllPositions();
        console.log('🚨 توقف اضطراری - تمام پوزیشن‌ها بسته شدند');
    }
}
