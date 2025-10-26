class PredictionEngine {
    constructor(config = {}) {
        this.config = {
            predictionHorizon: 5,
            confidenceThreshold: 0.7,
            modelType: 'transformer',
            ...config
        };
        
        this.models = new Map();
        this.predictionCache = new Map();
        this.initModels();
    }

    initModels() {
        // مدل‌های پیش‌بینی مختلف
        this.models.set('price', new PricePredictionModel());
        this.models.set('trend', new TrendPredictionModel());
        this.models.set('volatility', new VolatilityPredictionModel());
        this.models.set('sentiment', new SentimentPredictionModel());
    }

    async predict(marketData, options = {}) {
        const cacheKey = this.generateCacheKey(marketData, options);
        
        if (this.predictionCache.has(cacheKey)) {
            return this.predictionCache.get(cacheKey);
        }

        try {
            const predictions = await this.executePredictionPipeline(marketData, options);
            this.predictionCache.set(cacheKey, predictions);
            
            // مدیریت اندازه کش
            if (this.predictionCache.size > 100) {
                const firstKey = this.predictionCache.keys().next().value;
                this.predictionCache.delete(firstKey);
            }
            
            return predictions;
            
        } catch (error) {
            console.error('Prediction engine error:', error);
            return this.getFallbackPrediction(marketData);
        }
    }

    async executePredictionPipeline(marketData, options) {
        const predictions = {};
        const modelPromises = [];

        // اجرای موازی تمام مدل‌ها
        for (const [modelType, model] of this.models) {
            modelPromises.push(
                model.predict(marketData, options)
                    .then(result => { predictions[modelType] = result; })
                    .catch(error => {
                        console.warn(`${modelType} model failed:`, error);
                        predictions[modelType] = this.getModelFallback(modelType);
                    })
            );
        }

        await Promise.allSettled(modelPromises);
        
        // ترکیب نتایج
        return this.ensemblePredictions(predictions, marketData);
    }

    ensemblePredictions(individualPredictions, marketData) {
        const weights = {
            price: 0.4,
            trend: 0.3,
            volatility: 0.2,
            sentiment: 0.1
        };

        let ensembleScore = 0;
        let totalWeight = 0;
        const details = {};

        for (const [modelType, prediction] of Object.entries(individualPredictions)) {
            const weight = weights[modelType] || 0.1;
            
            if (prediction && prediction.confidence > this.config.confidenceThreshold) {
                ensembleScore += prediction.score * weight;
                totalWeight += weight;
            }
            
            details[modelType] = prediction;
        }

        const finalScore = totalWeight > 0 ? ensembleScore / totalWeight : 0.5;
        const confidence = this.calculateEnsembleConfidence(details);

        return {
            score: finalScore,
            confidence: confidence,
            direction: finalScore > 0.6 ? 'BULLISH' : finalScore < 0.4 ? 'BEARISH' : 'NEUTRAL',
            magnitude: Math.abs(finalScore - 0.5) * 2,
            timeframe: this.config.predictionHorizon,
            details: details,
            timestamp: new Date(),
            recommendations: this.generateRecommendations(finalScore, confidence, details)
        };
    }

    calculateEnsembleConfidence(details) {
        let totalConfidence = 0;
        let modelCount = 0;

        for (const prediction of Object.values(details)) {
            if (prediction && prediction.confidence) {
                totalConfidence += prediction.confidence;
                modelCount++;
            }
        }

        return modelCount > 0 ? totalConfidence / modelCount : 0.5;
    }

    generateRecommendations(score, confidence, details) {
        const recommendations = [];
        
        if (score > 0.7 && confidence > 0.8) {
            recommendations.push({
                action: 'BUY',
                confidence: confidence,
                reasoning: 'سیگنال قوی صعودی از چندین مدل دریافت شده',
                riskLevel: 'LOW'
            });
        } else if (score < 0.3 && confidence > 0.8) {
            recommendations.push({
                action: 'SELL',
                confidence: confidence,
                reasoning: 'سیگنال قوی نزولی از چندین مدل دریافت شده',
                riskLevel: 'MEDIUM'
            });
        } else {
            recommendations.push({
                action: 'HOLD',
                confidence: confidence,
                reasoning: 'عدم قطعیت در پیش‌بینی‌ها - منتظر سیگنال واضح‌تر بمانید',
                riskLevel: 'HIGH'
            });
        }

        // اضافه کردن توصیه‌های مبتنی بر تحلیل جزئیات
        if (details.volatility && details.volatility.score > 0.8) {
            recommendations.push({
                action: 'SET_STOP_LOSS',
                reasoning: 'نوسان بالا پیش‌بینی می‌شود - حد ضرر تنظیم کنید',
                urgency: 'HIGH'
            });
        }

        return recommendations;
    }

    generateCacheKey(marketData, options) {
        const dataString = JSON.stringify({
            symbols: marketData.symbols,
            timeframe: options.timeframe,
            indicators: Object.keys(marketData.indicators || {})
        });
        return CryptoJS.MD5(dataString).toString();
    }

    getFallbackPrediction(marketData) {
        return {
            score: 0.5,
            confidence: 0.3,
            direction: 'NEUTRAL',
            magnitude: 0,
            timeframe: this.config.predictionHorizon,
            details: {},
            timestamp: new Date(),
            recommendations: [{
                action: 'HOLD',
                confidence: 0.3,
                reasoning: 'سیستم پیش‌بینی موقتاً در دسترس نیست',
                riskLevel: 'HIGH'
            }],
            isFallback: true
        };
    }

    getModelFallback(modelType) {
        return {
            score: 0.5,
            confidence: 0.1,
            model: modelType,
            isFallback: true
        };
    }

    clearCache() {
        this.predictionCache.clear();
    }

    async retrainModels(newData) {
        console.log('شروع بازآموزی مدل‌ها با داده‌های جدید...');
        
        for (const [modelType, model] of this.models) {
            if (model.retrain) {
                try {
                    await model.retrain(newData);
                    console.log(`مدل ${modelType} با موفقیت بازآموزی شد`);
                } catch (error) {
                    console.error(`خطا در بازآموزی مدل ${modelType}:`, error);
                }
            }
        }
        
        this.clearCache();
        console.log('بازآموزی مدل‌ها تکمیل شد');
    }
}

// مدل‌های تخصصی
class PricePredictionModel {
    async predict(marketData, options) {
        // شبیه‌سازی محاسبات پیچیده قیمت
        await this.delay(100);
        
        const baseScore = this.calculatePriceMomentum(marketData);
        const confidence = this.calculatePriceConfidence(marketData);
        
        return {
            score: baseScore,
            confidence: confidence,
            model: 'price',
            features: this.extractPriceFeatures(marketData),
            predictionHorizon: options.timeframe || 5
        };
    }

    calculatePriceMomentum(marketData) {
        const prices = marketData.historicalPrices || [];
        if (prices.length < 2) return 0.5;
        
        const recentTrend = this.calculateTrend(prices.slice(-10));
        const volumeConfirmation = this.volumeConfirmation(marketData);
        const technicalIndicators = this.technicalAnalysis(marketData);
        
        return (recentTrend + volumeConfirmation + technicalIndicators) / 3;
    }

    calculateTrend(prices) {
        if (prices.length < 2) return 0.5;
        const changes = [];
        
        for (let i = 1; i < prices.length; i++) {
            changes.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        return 0.5 + (avgChange * 10); // نرمال‌سازی به بازه 0-1
    }

    volumeConfirmation(marketData) {
        const volumes = marketData.volumes || [];
        if (volumes.length < 2) return 0.5;
        
        const recentVolume = volumes.slice(-1)[0];
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        
        return recentVolume > avgVolume * 1.2 ? 0.7 : 0.5;
    }

    technicalAnalysis(marketData) {
        // شبیه‌سازی تحلیل تکنیکال
        const rsi = marketData.indicators?.rsi || 50;
        const macd = marketData.indicators?.macd || 0;
        
        let score = 0.5;
        
        // تحلیل RSI
        if (rsi < 30) score += 0.2; // اشباع فروش
        else if (rsi > 70) score -= 0.2; // اشباع خرید
        
        // تحلیل MACD
        if (macd > 0) score += 0.1;
        else score -= 0.1;
        
        return Math.max(0, Math.min(1, score));
    }

    calculatePriceConfidence(marketData) {
        const dataQuality = this.assessDataQuality(marketData);
        const modelConsistency = 0.8; // از تاریخچه مدل محاسبه می‌شود
        
        return (dataQuality + modelConsistency) / 2;
    }

    assessDataQuality(marketData) {
        let qualityScore = 0;
        let factors = 0;
        
        if (marketData.historicalPrices?.length >= 20) {
            qualityScore += 0.3;
            factors++;
        }
        
        if (marketData.volumes?.length >= 20) {
            qualityScore += 0.3;
            factors++;
        }
        
        if (marketData.indicators) {
            qualityScore += 0.4;
            factors++;
        }
        
        return factors > 0 ? qualityScore / factors : 0.1;
    }

    extractPriceFeatures(marketData) {
        return {
            priceMomentum: this.calculatePriceMomentum(marketData),
            trendStrength: this.calculateTrendStrength(marketData),
            supportResistance: this.identifySupportResistance(marketData),
            volumePattern: this.analyzeVolumePattern(marketData)
        };
    }

    calculateTrendStrength(marketData) {
        const prices = marketData.historicalPrices || [];
        if (prices.length < 5) return 0;
        
        const recentPrices = prices.slice(-5);
        const linearRegression = this.performLinearRegression(recentPrices);
        return Math.abs(linearRegression.slope);
    }

    performLinearRegression(prices) {
        const n = prices.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += prices[i];
            sumXY += i * prices[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        return { slope, intercept };
    }

    identifySupportResistance(marketData) {
        const prices = marketData.historicalPrices || [];
        if (prices.length < 10) return { support: null, resistance: null };
        
        const recentHigh = Math.max(...prices.slice(-10));
        const recentLow = Math.min(...prices.slice(-10));
        const currentPrice = prices[prices.length - 1];
        
        return {
            support: recentLow,
            resistance: recentHigh,
            distanceToSupport: currentPrice - recentLow,
            distanceToResistance: recentHigh - currentPrice
        };
    }

    analyzeVolumePattern(marketData) {
        const volumes = marketData.volumes || [];
        if (volumes.length < 5) return 'UNKNOWN';
        
        const recentVolume = volumes[volumes.length - 1];
        const avgVolume = volumes.reduce((a, b) => a + b) / volumes.length;
        
        if (recentVolume > avgVolume * 1.5) return 'HIGH_VOLUME';
        if (recentVolume < avgVolume * 0.5) return 'LOW_VOLUME';
        return 'NORMAL_VOLUME';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class TrendPredictionModel {
    async predict(marketData, options) {
        await this.delay(150);
        
        const trendScore = this.analyzeTrend(marketData);
        const patternScore = this.analyzeChartPatterns(marketData);
        const momentumScore = this.analyzeMomentum(marketData);
        
        const finalScore = (trendScore + patternScore + momentumScore) / 3;
        const confidence = this.calculateTrendConfidence(marketData);
        
        return {
            score: finalScore,
            confidence: confidence,
            model: 'trend',
            trendType: this.classifyTrend(finalScore),
            components: { trendScore, patternScore, momentumScore }
        };
    }

    analyzeTrend(marketData) {
        const prices = marketData.historicalPrices || [];
        if (prices.length < 3) return 0.5;
        
        const shortTerm = this.calculateSimpleTrend(prices.slice(-5));
        const mediumTerm = this.calculateSimpleTrend(prices.slice(-10));
        const longTerm = this.calculateSimpleTrend(prices);
        
        // وزن بیشتر به روند کوتاه‌مدت
        return (shortTerm * 0.5 + mediumTerm * 0.3 + longTerm * 0.2);
    }

    calculateSimpleTrend(prices) {
        if (prices.length < 2) return 0.5;
        
        const first = prices[0];
        const last = prices[prices.length - 1];
        const change = (last - first) / first;
        
        return 0.5 + (change * 5); // نرمال‌سازی
    }

    analyzeChartPatterns(marketData) {
        // شبیه‌سازی تشخیص الگوهای نموداری
        const patterns = this.detectPatterns(marketData);
        let patternScore = 0.5;
        
        patterns.forEach(pattern => {
            switch(pattern.type) {
                case 'UPTREND':
                    patternScore += 0.2;
                    break;
                case 'DOWNTREND':
                    patternScore -= 0.2;
                    break;
                case 'SIDEWAYS':
                    // امتیاز خنثی
                    break;
            }
        });
        
        return Math.max(0, Math.min(1, patternScore));
    }

    detectPatterns(marketData) {
        const patterns = [];
        const prices = marketData.historicalPrices || [];
        
        if (prices.length >= 5) {
            // تشخیص ساده روند
            const recentTrend = this.calculateSimpleTrend(prices.slice(-5));
            if (recentTrend > 0.6) {
                patterns.push({ type: 'UPTREND', confidence: 0.7 });
            } else if (recentTrend < 0.4) {
                patterns.push({ type: 'DOWNTREND', confidence: 0.7 });
            } else {
                patterns.push({ type: 'SIDEWAYS', confidence: 0.8 });
            }
        }
        
        return patterns;
    }

    analyzeMomentum(marketData) {
        const indicators = marketData.indicators || {};
        let momentumScore = 0.5;
        let factorCount = 0;
        
        if (indicators.rsi) {
            const rsiMomentum = this.analyzeRSI(indicators.rsi);
            momentumScore += rsiMomentum;
            factorCount++;
        }
        
        if (indicators.macd) {
            const macdMomentum = this.analyzeMACD(indicators.macd);
            momentumScore += macdMomentum;
            factorCount++;
        }
        
        return factorCount > 0 ? momentumScore / factorCount : 0.5;
    }

    analyzeRSI(rsi) {
        if (rsi < 30) return 0.8; // اشباع فروش - momentum مثبت
        if (rsi > 70) return 0.2; // اشباع خرید - momentum منفی
        if (rsi > 50) return 0.6; // momentum مثبت
        return 0.4; // momentum منفی
    }

    analyzeMACD(macd) {
        return macd > 0 ? 0.7 : 0.3;
    }

    classifyTrend(score) {
        if (score > 0.7) return 'STRONG_UPTREND';
        if (score > 0.6) return 'UPTREND';
        if (score < 0.3) return 'STRONG_DOWNTREND';
        if (score < 0.4) return 'DOWNTREND';
        return 'SIDEWAYS';
    }

    calculateTrendConfidence(marketData) {
        const dataPoints = marketData.historicalPrices?.length || 0;
        const dataQuality = Math.min(1, dataPoints / 50); // هرچه داده بیشتر، اطمینان بیشتر
        
        return 0.7 * dataQuality + 0.3 * 0.8; // ترکیب کیفیت داده و دقت مدل
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class VolatilityPredictionModel {
    async predict(marketData, options) {
        await this.delay(120);
        
        const volatilityScore = this.calculateVolatility(marketData);
        const confidence = this.calculateVolatilityConfidence(marketData);
        
        return {
            score: volatilityScore,
            confidence: confidence,
            model: 'volatility',
            volatilityLevel: this.classifyVolatility(volatilityScore),
            riskImplications: this.assessRiskImplications(volatilityScore)
        };
    }

    calculateVolatility(marketData) {
        const prices = marketData.historicalPrices || [];
        if (prices.length < 2) return 0.5;
        
        // محاسبه نوسان بر اساس انحراف معیار
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        
        // نرمال‌سازی نوسان به بازه 0-1
        return Math.min(1, volatility * 10);
    }

    classifyVolatility(score) {
        if (score > 0.8) return 'EXTREME';
        if (score > 0.6) return 'HIGH';
        if (score > 0.4) return 'MEDIUM';
        if (score > 0.2) return 'LOW';
        return 'VERY_LOW';
    }

    assessRiskImplications(volatilityScore) {
        const implications = [];
        
        if (volatilityScore > 0.7) {
            implications.push('نیاز به حد ضرر گسترده');
            implications.push('پوزیشن‌های کوچک‌تر توصیه می‌شود');
            implications.push('مراقب جهش‌های ناگهانی باشید');
        } else if (volatilityScore > 0.5) {
            implications.push('حد ضرر استاندارد کافی است');
            implications.push('مدیریت ریسک فعال توصیه می‌شود');
        } else {
            implications.push('شرایط پایدار برای معامله');
            implications.push('حد ضرر معمولی کافی است');
        }
        
        return implications;
    }

    calculateVolatilityConfidence(marketData) {
        const sampleSize = marketData.historicalPrices?.length || 0;
        const dataRecency = this.assessDataRecency(marketData);
        
        return Math.min(1, (sampleSize / 30) * 0.6 + dataRecency * 0.4);
    }

    assessDataRecency(marketData) {
        // شبیه‌سازی ارزیابی تازگی داده‌ها
        return 0.8; // فرض می‌کنیم داده‌ها تازه هستند
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class SentimentPredictionModel {
    async predict(marketData, options) {
        await this.delay(200);
        
        const sentimentScore = this.analyzeMarketSentiment(marketData);
        const confidence = this.calculateSentimentConfidence(marketData);
        
        return {
            score: sentimentScore,
            confidence: confidence,
            model: 'sentiment',
            sentiment: this.classifySentiment(sentimentScore),
            factors: this.analyzeSentimentFactors(marketData)
        };
    }

    analyzeMarketSentiment(marketData) {
        let totalScore = 0;
        let factorCount = 0;
        
        // تحلیل احساسات از منابع مختلف
        if (marketData.socialSentiment) {
            totalScore += this.analyzeSocialSentiment(marketData.socialSentiment);
            factorCount++;
        }
        
        if (marketData.newsSentiment) {
            totalScore += this.analyzeNewsSentiment(marketData.newsSentiment);
            factorCount++;
        }
        
        if (marketData.marketIndicators) {
            totalScore += this.analyzeMarketIndicators(marketData.marketIndicators);
            factorCount++;
        }
        
        return factorCount > 0 ? totalScore / factorCount : 0.5;
    }

    analyzeSocialSentiment(socialData) {
        // شبیه‌سازی تحلیل احساسات شبکه‌های اجتماعی
        const positiveKeywords = ['صعود', 'رشد', 'خرید', 'مثبت', 'سود'];
        const negativeKeywords = ['نزول', 'افت', 'فروش', 'منفی', 'ضرر'];
        
        let score = 0.5;
        const content = socialData.content || '';
        
        positiveKeywords.forEach(keyword => {
            if (content.includes(keyword)) score += 0.1;
        });
        
        negativeKeywords.forEach(keyword => {
            if (content.includes(keyword)) score -= 0.1;
        });
        
        return Math.max(0, Math.min(1, score));
    }

    analyzeNewsSentiment(newsData) {
        // شبیه‌سازی تحلیل احساسات اخبار
        return newsData.sentimentScore || 0.5;
    }

    analyzeMarketIndicators(indicators) {
        // تحلیل احساسات بر اساس اندیکاتورهای بازار
        let score = 0.5;
        
        if (indicators.fearGreedIndex) {
            score = indicators.fearGreedIndex / 100;
        }
        
        if (indicators.putCallRatio) {
            // نسبت put/call بالا نشان‌دهنده ترس است
            const putCallScore = 1 - Math.min(1, indicators.putCallRatio / 2);
            score = (score + putCallScore) / 2;
        }
        
        return score;
    }

    classifySentiment(score) {
        if (score > 0.7) return 'VERY_BULLISH';
        if (score > 0.6) return 'BULLISH';
        if (score < 0.3) return 'VERY_BEARISH';
        if (score < 0.4) return 'BEARISH';
        return 'NEUTRAL';
    }

    analyzeSentimentFactors(marketData) {
        const factors = [];
        
        if (marketData.socialSentiment) {
            factors.push('شبکه‌های اجتماعی');
        }
        
        if (marketData.newsSentiment) {
            factors.push('اخبار و رسانه');
        }
        
        if (marketData.marketIndicators) {
            factors.push('اندیکاتورهای بازار');
        }
        
        return factors;
    }

    calculateSentimentConfidence(marketData) {
        let dataSources = 0;
        
        if (marketData.socialSentiment) dataSources++;
        if (marketData.newsSentiment) dataSources++;
        if (marketData.marketIndicators) dataSources++;
        
        return Math.min(1, dataSources / 3 * 0.8 + 0.2);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default PredictionEngine;