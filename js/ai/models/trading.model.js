// مدل پیشرفته تریدینگ هوش مصنوعی
class AdvancedTradingModel {
    constructor() {
        this.strategies = new Map();
        this.indicators = new Map();
        this.patterns = new Map();
        this.performanceHistory = [];
        
        this.initStrategies();
        this.initIndicators();
        this.initPatterns();
    }

    initStrategies() {
        // استراتژی بازگشت به میانگین پیشرفته
        this.strategies.set('mean_reversion_advanced', {
            name: 'بازگشت به میانگین پیشرفته',
            description: 'استراتژی پیشرفته با فیلتر نویز و تأیید چند timeframe',
            parameters: {
                shortPeriod: 10,
                longPeriod: 30,
                deviationThreshold: 2.0,
                confirmationPeriod: 3,
                volumeFilter: true
            },
            calculate: this.calculateMeanReversionAdvanced.bind(this)
        });

        // استراتژی شکست روند
        this.strategies.set('trend_breakout', {
            name: 'شکست روند',
            description: 'شناسایی نقاط شکست روند با حجم معاملات',
            parameters: {
                trendPeriod: 20,
                breakoutThreshold: 0.02,
                volumeSpike: 1.8,
                retestConfirmation: true
            },
            calculate: this.calculateTrendBreakout.bind(this)
        });

        // استراتژی مومنتوم ترکیبی
        this.strategies.set('composite_momentum', {
            name: 'مومنتوم ترکیبی',
            description: 'ترکیب چندین اندیکاتور مومنتوم',
            parameters: {
                rsiPeriod: 14,
                stochasticPeriod: 14,
                macdFast: 12,
                macdSlow: 26,
                macdSignal: 9
            },
            calculate: this.calculateCompositeMomentum.bind(this)
        });

        // استراتژی پرایس اکشن
        this.strategies.set('price_action', {
            name: 'پرایس اکشن',
            description: 'تحلیل الگوهای قیمتی و سطوح کلیدی',
            parameters: {
                supportLevels: 3,
                resistanceLevels: 3,
                patternConfirmation: 2,
                volumeConfirmation: true
            },
            calculate: this.calculatePriceAction.bind(this)
        });
    }

    initIndicators() {
        this.indicators.set('super_trend', {
            name: 'Super Trend',
            calculate: this.calculateSuperTrend.bind(this)
        });

        this.indicators.set('ichimoku', {
            name: 'Ichimoku Cloud',
            calculate: this.calculateIchimoku.bind(this)
        });

        this.indicators.set('volume_profile', {
            name: 'Volume Profile',
            calculate: this.calculateVolumeProfile.bind(this)
        });

        this.indicators.set('market_structure', {
            name: 'Market Structure',
            calculate: this.analyzeMarketStructure.bind(this)
        });
    }

    initPatterns() {
        this.patterns.set('double_top', {
            name: 'Double Top',
            description: 'الگوی سقف دوقلو - سیگنال نزولی',
            reliability: 0.75,
            detect: this.detectDoubleTop.bind(this)
        });

        this.patterns.set('double_bottom', {
            name: 'Double Bottom',
            description: 'الگوی کف دوقلو - سیگنال صعودی',
            reliability: 0.78,
            detect: this.detectDoubleBottom.bind(this)
        });

        this.patterns.set('head_shoulders', {
            name: 'Head and Shoulders',
            description: 'الگوی سر و شانه - سیگنال نزولی',
            reliability: 0.82,
            detect: this.detectHeadShoulders.bind(this)
        });

        this.patterns.set('bullish_flag', {
            name: 'Bullish Flag',
            description: 'الگوی پرچم صعودی',
            reliability: 0.70,
            detect: this.detectBullishFlag.bind(this)
        });
    }

    // تحلیل پیشرفته بازار
    async analyzeMarket(symbol, data, timeframe = '1h') {
        const analysis = {
            symbol: symbol,
            timeframe: timeframe,
            timestamp: new Date(),
            strategies: {},
            indicators: {},
            patterns: {},
            sentiment: {},
            riskAssessment: {},
            finalSignal: null
        };

        try {
            // اجرای تمام استراتژی‌ها
            for (const [strategyId, strategy] of this.strategies) {
                analysis.strategies[strategyId] = await strategy.calculate(data, strategy.parameters);
            }

            // محاسبه اندیکاتورها
            for (const [indicatorId, indicator] of this.indicators) {
                analysis.indicators[indicatorId] = await indicator.calculate(data);
            }

            // تشخیص الگوها
            for (const [patternId, pattern] of this.patterns) {
                analysis.patterns[patternId] = await pattern.detect(data);
            }

            // تحلیل احساسات
            analysis.sentiment = this.analyzeMarketSentiment(data);

            // ارزیابی ریسک
            analysis.riskAssessment = this.assessTradeRisk(data, analysis);

            // تولید سیگنال نهایی
            analysis.finalSignal = this.generateFinalSignal(analysis);

            // ذخیره در تاریخچه
            this.recordAnalysis(analysis);

            return analysis;

        } catch (error) {
            console.error(`خطا در تحلیل ${symbol}:`, error);
            throw error;
        }
    }

    // استراتژی بازگشت به میانگین پیشرفته
    calculateMeanReversionAdvanced(data, params) {
        const prices = data.map(d => d.close || d.price);
        const volumes = data.map(d => d.volume || d.tvol);
        
        // محاسبه میانگین‌های متحرک
        const shortMA = this.calculateSMA(prices, params.shortPeriod);
        const longMA = this.calculateSMA(prices, params.longPeriod);
        
        // محاسبه انحراف معیار
        const deviation = this.calculateStandardDeviation(prices, params.longPeriod);
        
        // محاسبه z-score
        const currentPrice = prices[prices.length - 1];
        const zScore = (currentPrice - longMA) / deviation;
        
        // فیلتر حجم
        const volumeAvg = this.calculateSMA(volumes, params.shortPeriod);
        const currentVolume = volumes[volumes.length - 1];
        const volumeFilter = params.volumeFilter ? currentVolume > volumeAvg : true;
        
        // تأیید چند دوره‌ای
        let confirmationCount = 0;
        for (let i = 1; i <= params.confirmationPeriod; i++) {
            const price = prices[prices.length - i];
            const ma = this.calculateSMA(prices.slice(0, -i), params.longPeriod);
            if (Math.abs(price - ma) > params.deviationThreshold * deviation) {
                confirmationCount++;
            }
        }
        
        const signal = {
            type: 'mean_reversion',
            direction: zScore > 0 ? 'SHORT' : 'LONG',
            strength: Math.min(Math.abs(zScore) / 3, 1),
            confidence: (confirmationCount / params.confirmationPeriod) * 0.8 + (volumeFilter ? 0.2 : 0),
            parameters: {
                zScore: zScore,
                deviation: deviation,
                volumeFilter: volumeFilter,
                confirmation: confirmationCount
            },
            conditions: {
                overbought: zScore > params.deviationThreshold,
                oversold: zScore < -params.deviationThreshold,
                volumeConfirmed: volumeFilter
            }
        };
        
        return signal;
    }

    // استراتژی شکست روند
    calculateTrendBreakout(data, params) {
        const prices = data.map(d => d.close || d.price);
        const highs = data.map(d => d.high || d.price);
        const lows = data.map(d => d.low || d.price);
        const volumes = data.map(d => d.volume || d.tvol);
        
        // تشخیص روند
        const trend = this.detectTrend(prices, params.trendPeriod);
        
        // شناسایی سطوح کلیدی
        const resistance = Math.max(...highs.slice(-params.trendPeriod));
        const support = Math.min(...lows.slice(-params.trendPeriod));
        
        const currentPrice = prices[prices.length - 1];
        const currentVolume = volumes[volumes.length - 1];
        const volumeAvg = this.calculateSMA(volumes, params.trendPeriod);
        
        // بررسی شکست
        const breakoutUp = currentPrice > resistance * (1 + params.breakoutThreshold);
        const breakoutDown = currentPrice < support * (1 - params.breakoutThreshold);
        const volumeSpike = currentVolume > volumeAvg * params.volumeSpike;
        
        let signal = {
            type: 'trend_breakout',
            direction: 'NEUTRAL',
            strength: 0,
            confidence: 0,
            parameters: {
                trend: trend,
                resistance: resistance,
                support: support,
                volumeSpike: volumeSpike
            }
        };
        
        if (breakoutUp && volumeSpike) {
            signal.direction = 'LONG';
            signal.strength = 0.8;
            signal.confidence = 0.75;
        } else if (breakoutDown && volumeSpike) {
            signal.direction = 'SHORT';
            signal.strength = 0.8;
            signal.confidence = 0.75;
        }
        
        return signal;
    }

    // استراتژی مومنتوم ترکیبی
    calculateCompositeMomentum(data, params) {
        const prices = data.map(d => d.close || d.price);
        
        // محاسبه اندیکاتورها
        const rsi = this.calculateRSI(prices, params.rsiPeriod);
        const stochastic = this.calculateStochastic(data, params.stochasticPeriod);
        const macd = this.calculateMACD(prices, params.macdFast, params.macdSlow, params.macdSignal);
        
        // ترکیب سیگنال‌ها
        let momentumScore = 0;
        let signalCount = 0;
        
        // RSI
        if (rsi < 30) momentumScore += 1; // اشباع فروش
        if (rsi > 70) momentumScore -= 1; // اشباع خرید
        
        // Stochastic
        if (stochastic.k < 20 && stochastic.d < 20) momentumScore += 1;
        if (stochastic.k > 80 && stochastic.d > 80) momentumScore -= 1;
        
        // MACD
        if (macd.histogram > 0 && macd.macd > macd.signal) momentumScore += 1;
        if (macd.histogram < 0 && macd.macd < macd.signal) momentumScore -= 1;
        
        signalCount = 3; // تعداد اندیکاتورها
        
        const normalizedScore = momentumScore / signalCount;
        
        return {
            type: 'composite_momentum',
            direction: normalizedScore > 0.3 ? 'LONG' : normalizedScore < -0.3 ? 'SHORT' : 'NEUTRAL',
            strength: Math.abs(normalizedScore),
            confidence: this.calculateMomentumConfidence(rsi, stochastic, macd),
            parameters: {
                rsi: rsi,
                stochastic: stochastic,
                macd: macd,
                momentumScore: normalizedScore
            }
        };
    }

    // اندیکاتور Super Trend
    calculateSuperTrend(data, period = 10, multiplier = 3) {
        const highs = data.map(d => d.high || d.price);
        const lows = data.map(d => d.low || d.price);
        const closes = data.map(d => d.close || d.price);
        
        const atr = this.calculateATR(highs, lows, closes, period);
        const result = [];
        
        for (let i = period; i < closes.length; i++) {
            const basicUpper = (highs[i] + lows[i]) / 2 + multiplier * atr[i];
            const basicLower = (highs[i] + lows[i]) / 2 - multiplier * atr[i];
            
            let upper = basicUpper;
            let lower = basicLower;
            
            if (i > period) {
                upper = basicUpper < result[i-1].upper || closes[i-1] > result[i-1].upper ? 
                        basicUpper : result[i-1].upper;
                
                lower = basicLower > result[i-1].lower || closes[i-1] < result[i-1].lower ? 
                        basicLower : result[i-1].lower;
            }
            
            const trend = closes[i] > upper ? 'UP' : closes[i] < lower ? 'DOWN' : result[i-1]?.trend || 'UP';
            
            result.push({
                upper,
                lower,
                trend,
                value: trend === 'UP' ? lower : upper
            });
        }
        
        return result;
    }

    // تحلیل احساسات بازار
    analyzeMarketSentiment(data) {
        const priceChanges = [];
        const volumeChanges = [];
        
        for (let i = 1; i < data.length; i++) {
            const current = data[i];
            const previous = data[i-1];
            
            const priceChange = ((current.close || current.price) - (previous.close || previous.price)) / (previous.close || previous.price);
            const volumeChange = ((current.volume || current.tvol) - (previous.volume || previous.tvol)) / (previous.volume || previous.tvol);
            
            priceChanges.push(priceChange);
            volumeChanges.push(volumeChange);
        }
        
        const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
        const avgVolumeChange = volumeChanges.reduce((a, b) => a + b, 0) / volumeChanges.length;
        
        // شاخص احساسات ترکیبی
        let sentimentScore = 0;
        
        // تأثیر تغییرات قیمت
        sentimentScore += avgPriceChange * 100; // نرمال‌سازی
        
        // تأثیر حجم معاملات
        sentimentScore += avgVolumeChange * 50;
        
        // نوسانات
        const volatility = this.calculateVolatility(data.map(d => d.close || d.price));
        sentimentScore -= volatility * 25;
        
        // نرمال‌سازی نمره
        const normalizedScore = Math.tanh(sentimentScore / 100);
        
        return {
            score: normalizedScore,
            level: normalizedScore > 0.3 ? 'BULLISH' : normalizedScore < -0.3 ? 'BEARISH' : 'NEUTRAL',
            confidence: Math.abs(normalizedScore),
            factors: {
                priceMomentum: avgPriceChange,
                volumePressure: avgVolumeChange,
                marketVolatility: volatility
            }
        };
    }

    // ارزیابی ریسک معامله
    assessTradeRisk(data, analysis) {
        const volatility = this.calculateVolatility(data.map(d => d.close || d.price));
        const volumeStability = this.assessVolumeStability(data.map(d => d.volume || d.tvol));
        const signalStrength = analysis.finalSignal?.strength || 0;
        const marketCondition = this.assessMarketCondition(data);
        
        // محاسبه امتیاز ریسک ترکیبی
        let riskScore = 0;
        
        // نوسانات بالا = ریسک بالا
        riskScore += volatility * 40;
        
        // حجم ناپایدار = ریسک بالا
        riskScore += (1 - volumeStability) * 30;
        
        // سیگنال ضعیف = ریسک بالا
        riskScore += (1 - signalStrength) * 20;
        
        // شرایط نامناسب بازار = ریسک بالا
        riskScore += marketCondition.riskFactor * 10;
        
        const normalizedRisk = Math.min(riskScore / 100, 1);
        
        return {
            score: normalizedRisk,
            level: normalizedRisk < 0.3 ? 'LOW' : normalizedRisk < 0.6 ? 'MEDIUM' : 'HIGH',
            factors: {
                volatility: volatility,
                volumeStability: volumeStability,
                signalStrength: signalStrength,
                marketCondition: marketCondition
            },
            recommendations: this.generateRiskRecommendations(normalizedRisk, analysis)
        };
    }

    // تولید سیگنال نهایی
    generateFinalSignal(analysis) {
        const signals = [];
        const weights = {
            'mean_reversion_advanced': 0.25,
            'trend_breakout': 0.30,
            'composite_momentum': 0.25,
            'price_action': 0.20
        };
        
        // جمع‌آوری سیگنال‌های استراتژی‌ها
        for (const [strategyId, signal] of Object.entries(analysis.strategies)) {
            if (signal.direction !== 'NEUTRAL') {
                signals.push({
                    strategy: strategyId,
                    direction: signal.direction,
                    strength: signal.strength,
                    confidence: signal.confidence,
                    weight: weights[strategyId] || 0.1
                });
            }
        }
        
        if (signals.length === 0) {
            return {
                direction: 'NEUTRAL',
                strength: 0,
                confidence: 0,
                reason: 'هیچ سیگنال قوی‌ای شناسایی نشد'
            };
        }
        
        // محاسبه میانگین وزنی
        let longScore = 0;
        let shortScore = 0;
        let totalWeight = 0;
        
        signals.forEach(signal => {
            const score = signal.strength * signal.confidence * signal.weight;
            
            if (signal.direction === 'LONG') {
                longScore += score;
            } else if (signal.direction === 'SHORT') {
                shortScore += score;
            }
            
            totalWeight += signal.weight;
        });
        
        const finalDirection = longScore > shortScore ? 'LONG' : 'SHORT';
        const finalStrength = Math.max(longScore, shortScore) / totalWeight;
        const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
        
        return {
            direction: finalDirection,
            strength: finalStrength,
            confidence: avgConfidence,
            strategyCount: signals.length,
            supportingStrategies: signals.map(s => s.strategy),
            riskLevel: analysis.riskAssessment.level,
            recommendations: this.generateTradeRecommendations(finalDirection, finalStrength, analysis)
        };
    }

    // توابع کمکی
    calculateSMA(data, period) {
        if (data.length < period) return data[data.length - 1];
        const sum = data.slice(-period).reduce((a, b) => a + b, 0);
        return sum / period;
    }

    calculateStandardDeviation(data, period) {
        const sma = this.calculateSMA(data, period);
        const variance = data.slice(-period).reduce((sum, value) => {
            return sum + Math.pow(value - sma, 2);
        }, 0) / period;
        return Math.sqrt(variance);
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = prices[prices.length - i] - prices[prices.length - i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        
        return 100 - (100 / (1 + rs));
    }

    calculateStochastic(data, period = 14) {
        const closes = data.map(d => d.close || d.price);
        const highs = data.map(d => d.high || d.price);
        const lows = data.map(d => d.low || d.price);
        
        const currentClose = closes[closes.length - 1];
        const periodHigh = Math.max(...highs.slice(-period));
        const periodLow = Math.min(...lows.slice(-period));
        
        const k = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;
        
        // محاسبه D (میانگین متحرک K)
        const kValues = [];
        for (let i = period; i < closes.length; i++) {
            const high = Math.max(...highs.slice(i - period, i));
            const low = Math.min(...lows.slice(i - period, i));
            const kVal = ((closes[i] - low) / (high - low)) * 100;
            kValues.push(kVal);
        }
        
        const d = kValues.length > 0 ? 
                 kValues.reduce((a, b) => a + b, 0) / kValues.length : 50;
        
        return { k, d };
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macd = fastEMA - slowEMA;
        const signal = this.calculateEMA(prices.map((_, i) => macd), signalPeriod);
        const histogram = macd - signal;
        
        return { macd, signal, histogram };
    }

    calculateEMA(data, period) {
        const multiplier = 2 / (period + 1);
        let ema = data[0];
        
        for (let i = 1; i < data.length; i++) {
            ema = (data[i] - ema) * multiplier + ema;
        }
        
        return ema;
    }

    calculateATR(highs, lows, closes, period = 14) {
        const trueRanges = [];
        
        for (let i = 1; i < highs.length; i++) {
            const tr = Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i-1]),
                Math.abs(lows[i] - closes[i-1])
            );
            trueRanges.push(tr);
        }
        
        // محاسبه ATR با میانگین متحرک
        const atr = [];
        let sum = trueRanges.slice(0, period).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
        
        for (let i = period; i < trueRanges.length; i++) {
            sum = sum - trueRanges[i - period] + trueRanges[i];
            atr.push(sum / period);
        }
        
        return atr;
    }

    calculateVolatility(prices) {
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            const ret = (prices[i] - prices[i-1]) / prices[i-1];
            returns.push(ret);
        }
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    detectTrend(prices, period) {
        const smaShort = this.calculateSMA(prices, Math.floor(period / 3));
        const smaLong = this.calculateSMA(prices, period);
        
        if (smaShort > smaLong * 1.02) return 'UPTREND';
        if (smaShort < smaLong * 0.98) return 'DOWNTREND';
        return 'SIDEWAYS';
    }

    assessVolumeStability(volumes) {
        const changes = [];
        for (let i = 1; i < volumes.length; i++) {
            const change = Math.abs(volumes[i] - volumes[i-1]) / volumes[i-1];
            changes.push(change);
        }
        
        const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
        return Math.max(0, 1 - avgChange); // 1 = کاملاً پایدار
    }

    assessMarketCondition(data) {
        const prices = data.map(d => d.close || d.price);
        const volatility = this.calculateVolatility(prices);
        const trend = this.detectTrend(prices, 20);
        
        let condition = 'NORMAL';
        let riskFactor = 0.5;
        
        if (volatility > 0.05) {
            condition = 'VOLATILE';
            riskFactor = 0.8;
        } else if (trend === 'SIDEWAYS') {
            condition = 'RANGING';
            riskFactor = 0.6;
        } else if (volatility < 0.01) {
            condition = 'CALM';
            riskFactor = 0.3;
        }
        
        return { condition, riskFactor, volatility, trend };
    }

    generateRiskRecommendations(riskScore, analysis) {
        const recommendations = [];
        
        if (riskScore > 0.7) {
            recommendations.push('کاهش سایز پوزیشن به ۵۰٪ معمول');
            recommendations.push('استفاده از حد ضرر محافظه‌کارانه');
            recommendations.push('پرهیز از معاملات جدید تا بهبود شرایط');
        } else if (riskScore > 0.5) {
            recommendations.push('کاهش سایز پوزیشن به ۷۵٪ معمول');
            recommendations.push('استفاده از حد ضرر استاندارد');
            recommendations.push('نظارت دقیق بر معامله');
        } else {
            recommendations.push('سایز پوزیشن معمول');
            recommendations.push('حد ضرر مطابق استراتژی');
        }
        
        if (analysis.sentiment.level === 'BEARISH') {
            recommendations.push('احتیاط در معاملات LONG');
        }
        
        if (analysis.riskAssessment.factors.volatility > 0.04) {
            recommendations.push('افزایش فاصله حد ضرر برای جلوگیری از استاپ هانت');
        }
        
        return recommendations;
    }

    generateTradeRecommendations(direction, strength, analysis) {
        const recommendations = [];
        
        if (direction === 'NEUTRAL') {
            recommendations.push('انتظار برای سیگنال بهتر');
            recommendations.push('بررسی بازار در تایم‌فریم‌های دیگر');
            return recommendations;
        }
        
        const action = direction === 'LONG' ? 'خرید' : 'فروش';
        const confidenceLevel = strength > 0.7 ? 'بالا' : strength > 0.5 ? 'متوسط' : 'پایین';
        
        recommendations.push(`${action} با اعتماد ${confidenceLevel}`);
        
        // پیشنهاد سایز پوزیشن
        const positionSize = this.calculatePositionSize(strength, analysis.riskAssessment.score);
        recommendations.push(`سایز پوزیشن پیشنهادی: ${positionSize}٪ از سرمایه`);
        
        // پیشنهاد حد سود و ضرر
        const stopLoss = this.calculateStopLoss(direction, analysis);
        const takeProfit = this.calculateTakeProfit(direction, analysis);
        
        recommendations.push(`حد ضرر: ${stopLoss}٪`);
        recommendations.push(`حد سود: ${takeProfit}٪`);
        
        // شرایط خروج
        if (analysis.riskAssessment.level === 'HIGH') {
            recommendations.push('خروج زودهنگام در صورت تغییر شرایط بازار');
        }
        
        return recommendations;
    }

    calculatePositionSize(signalStrength, riskScore) {
        const baseSize = 2; // 2% پایه
        const strengthMultiplier = signalStrength; // 0 to 1
        const riskMultiplier = 1 - riskScore; // ریسک بالا = سایز کمتر
        
        return Math.round(baseSize * strengthMultiplier * riskMultiplier * 100) / 100;
    }

    calculateStopLoss(direction, analysis) {
        const volatility = analysis.riskAssessment.factors.volatility;
        const baseStop = 3; // 3% پایه
        const volatilityAdjustment = volatility * 100; // افزودن بر اساس نوسانات
        
        return (baseStop + volatilityAdjustment).toFixed(1);
    }

    calculateTakeProfit(direction, analysis) {
        const stopLoss = parseFloat(this.calculateStopLoss(direction, analysis));
        const riskReward = analysis.finalSignal.strength > 0.7 ? 2 : 1.5;
        
        return (stopLoss * riskReward).toFixed(1);
    }

    recordAnalysis(analysis) {
        this.performanceHistory.push({
            timestamp: analysis.timestamp,
            symbol: analysis.symbol,
            signal: analysis.finalSignal,
            performance: null // بعداً پر می‌شود
        });
        
        // محدود کردن تاریخچه
        if (this.performanceHistory.length > 1000) {
            this.performanceHistory = this.performanceHistory.slice(-500);
        }
    }

    // الگوهای پرایس اکشن
    detectDoubleTop(data) {
        const prices = data.map(d => d.close || d.price);
        if (prices.length < 10) return null;
        
        // یافتن سقف‌ها
        const peaks = [];
        for (let i = 2; i < prices.length - 2; i++) {
            if (prices[i] > prices[i-1] && prices[i] > prices[i-2] && 
                prices[i] > prices[i+1] && prices[i] > prices[i+2]) {
                peaks.push({ index: i, price: prices[i] });
            }
        }
        
        if (peaks.length < 2) return null;
        
        // بررسی دو سقف متوالی
        const lastTwoPeaks = peaks.slice(-2);
        const priceDifference = Math.abs(lastTwoPeaks[1].price - lastTwoPeaks[0].price) / lastTwoPeaks[0].price;
        
        if (priceDifference < 0.02) { // تفاوت کمتر از 2%
            const neckline = Math.min(...prices.slice(lastTwoPeaks[1].index));
            const currentPrice = prices[prices.length - 1];
            
            return {
                detected: true,
                pattern: 'DOUBLE_TOP',
                direction: 'BEARISH',
                confidence: 0.7,
                target: neckline - (lastTwoPeaks[0].price - neckline),
                breakdown: currentPrice < neckline
            };
        }
        
        return { detected: false };
    }

    detectHeadShoulders(data) {
        // پیاده‌سازی الگوی سر و شانه
        const prices = data.map(d => d.close || d.price);
        if (prices.length < 20) return null;
        
        // اینجا الگوریتم کامل تشخیص سر و شانه پیاده‌سازی می‌شود
        return {
            detected: Math.random() > 0.7, // شبیه‌سازی
            pattern: 'HEAD_SHOULDERS',
            direction: 'BEARISH',
            confidence: 0.75
        };
    }

    getPerformanceMetrics() {
        const totalSignals = this.performanceHistory.length;
        const profitableSignals = this.performanceHistory.filter(
            record => record.performance > 0
        ).length;
        
        const accuracy = totalSignals > 0 ? profitableSignals / totalSignals : 0;
        
        return {
            totalSignals,
            profitableSignals,
            accuracy: Math.round(accuracy * 100),
            averageConfidence: this.performanceHistory.reduce(
                (sum, record) => sum + (record.signal?.confidence || 0), 0
            ) / totalSignals || 0
        };
    }
}
