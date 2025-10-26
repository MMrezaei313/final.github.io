class RiskModel {
    constructor(config = {}) {
        this.config = {
            confidenceLevel: 0.95,
            timeHorizon: 1, // روز
            maxPortfolioRisk: 0.02, // 2% حداکثر ریسک پرتفوی
            riskFreeRate: 0.05, // نرخ بدون ریسک 5%
            ...config
        };
        
        this.riskMetrics = new Map();
        this.historicalData = [];
        this.riskThresholds = this.initializeRiskThresholds();
    }

    initializeRiskThresholds() {
        return {
            var_95: 0.02,    // 2% VaR
            var_99: 0.05,    // 5% VaR
            max_drawdown: 0.15, // 15% حداکثر افت
            volatility: 0.25,   // 25% نوسان
            beta: 1.5,         // بتای 1.5
            sharpe_min: 1.0,   // حداقل شارپ 1
            correlation_alert: 0.8 // هشدار همبستگی بالا
        };
    }

    async calculatePortfolioRisk(portfolio, marketData) {
        const riskAnalysis = {
            timestamp: new Date(),
            portfolioId: portfolio.id,
            overallRisk: 0,
            components: {},
            recommendations: [],
            warnings: [],
            metrics: {}
        };

        try {
            // محاسبه معیارهای مختلف ریسک
            riskAnalysis.metrics.var = await this.calculateVaR(portfolio, marketData);
            riskAnalysis.metrics.expected_shortfall = await this.calculateExpectedShortfall(portfolio, marketData);
            riskAnalysis.metrics.max_drawdown = this.calculateMaxDrawdown(portfolio.historicalValues);
            riskAnalysis.metrics.volatility = this.calculatePortfolioVolatility(portfolio);
            riskAnalysis.metrics.sharpe = this.calculateSharpeRatio(portfolio);
            riskAnalysis.metrics.beta = await this.calculatePortfolioBeta(portfolio, marketData);
            riskAnalysis.metrics.correlation = this.analyzeCorrelation(portfolio.assets);

            // ارزیابی کلی ریسک
            riskAnalysis.overallRisk = this.assessOverallRisk(riskAnalysis.metrics);
            riskAnalysis.riskLevel = this.classifyRiskLevel(riskAnalysis.overallRisk);

            // تولید توصیه‌ها و هشدارها
            riskAnalysis.recommendations = this.generateRiskRecommendations(riskAnalysis.metrics, portfolio);
            riskAnalysis.warnings = this.generateRiskWarnings(riskAnalysis.metrics);

            // تحلیل حساسیت
            riskAnalysis.sensitivity = await this.analyzeSensitivity(portfolio, marketData);

            // سناریوهای استرس
            riskAnalysis.stressScenarios = await this.runStressTests(portfolio, marketData);

            this.riskMetrics.set(portfolio.id, riskAnalysis);
            return riskAnalysis;

        } catch (error) {
            console.error('Error in portfolio risk calculation:', error);
            return this.getFallbackRiskAnalysis(portfolio, error);
        }
    }

    async calculateVaR(portfolio, marketData, confidenceLevel = 0.95) {
        // محاسبه Value at Risk با سه روش مختلف
        const methods = {
            historical: this.calculateHistoricalVaR(portfolio, marketData, confidenceLevel),
            parametric: this.calculateParametricVaR(portfolio, confidenceLevel),
            monteCarlo: await this.calculateMonteCarloVaR(portfolio, marketData, confidenceLevel)
        };

        // میانگین گیری از روش‌های مختلف برای دقت بیشتر
        const varValues = Object.values(methods).filter(val => val !== null);
        const averageVaR = varValues.length > 0 ? 
            varValues.reduce((sum, val) => sum + val, 0) / varValues.length : 0;

        return {
            value: averageVaR,
            confidence: confidenceLevel,
            methods: methods,
            exceedanceProbability: this.calculateExceedanceProbability(portfolio, averageVaR)
        };
    }

    calculateHistoricalVaR(portfolio, marketData, confidenceLevel) {
        const returns = this.calculatePortfolioReturns(portfolio, marketData);
        if (returns.length === 0) return null;

        const sortedReturns = [...returns].sort((a, b) => a - b);
        const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        
        return Math.abs(sortedReturns[varIndex] || 0);
    }

    calculateParametricVaR(portfolio, confidenceLevel) {
        const volatility = this.calculatePortfolioVolatility(portfolio);
        const zScore = this.getZScore(confidenceLevel);
        
        return volatility * zScore;
    }

    async calculateMonteCarloVaR(portfolio, marketData, confidenceLevel, simulations = 10000) {
        const returns = this.calculatePortfolioReturns(portfolio, marketData);
        if (returns.length === 0) return null;

        // شبیه‌سازی مونت کارلو
        const simulatedReturns = [];
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const std = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length);

        for (let i = 0; i < simulations; i++) {
            const randomReturn = this.generateNormalRandom(mean, std);
            simulatedReturns.push(randomReturn);
        }

        const sortedReturns = simulatedReturns.sort((a, b) => a - b);
        const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        
        return Math.abs(sortedReturns[varIndex] || 0);
    }

    calculateExpectedShortfall(portfolio, marketData, confidenceLevel = 0.95) {
        const returns = this.calculatePortfolioReturns(portfolio, marketData);
        if (returns.length === 0) return null;

        const sortedReturns = [...returns].sort((a, b) => a - b);
        const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        const tailReturns = sortedReturns.slice(0, varIndex);
        
        const es = tailReturns.length > 0 ? 
            tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length : 0;

        return Math.abs(es);
    }

    calculateMaxDrawdown(historicalValues) {
        if (!historicalValues || historicalValues.length < 2) return 0;

        let peak = historicalValues[0];
        let maxDrawdown = 0;

        for (let i = 1; i < historicalValues.length; i++) {
            if (historicalValues[i] > peak) {
                peak = historicalValues[i];
            } else {
                const drawdown = (peak - historicalValues[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        return maxDrawdown;
    }

    calculatePortfolioVolatility(portfolio) {
        const returns = this.calculatePortfolioReturns(portfolio);
        if (returns.length < 2) return 0;

        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    calculateSharpeRatio(portfolio) {
        const returns = this.calculatePortfolioReturns(portfolio);
        if (returns.length === 0) return 0;

        const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const volatility = this.calculatePortfolioVolatility(portfolio);
        
        if (volatility === 0) return 0;
        
        return (meanReturn - this.config.riskFreeRate) / volatility;
    }

    async calculatePortfolioBeta(portfolio, marketData) {
        const portfolioReturns = this.calculatePortfolioReturns(portfolio);
        const marketReturns = this.calculateMarketReturns(marketData);

        if (portfolioReturns.length !== marketReturns.length || portfolioReturns.length < 2) {
            return 1; // مقدار پیش‌فرض
        }

        const portfolioMean = portfolioReturns.reduce((sum, ret) => sum + ret, 0) / portfolioReturns.length;
        const marketMean = marketReturns.reduce((sum, ret) => sum + ret, 0) / marketReturns.length;

        let covariance = 0;
        let marketVariance = 0;

        for (let i = 0; i < portfolioReturns.length; i++) {
            covariance += (portfolioReturns[i] - portfolioMean) * (marketReturns[i] - marketMean);
            marketVariance += Math.pow(marketReturns[i] - marketMean, 2);
        }

        covariance /= portfolioReturns.length;
        marketVariance /= portfolioReturns.length;

        return marketVariance !== 0 ? covariance / marketVariance : 1;
    }

    analyzeCorrelation(assets) {
        const correlations = {};
        
        for (let i = 0; i < assets.length; i++) {
            for (let j = i + 1; j < assets.length; j++) {
                const correlation = this.calculateAssetCorrelation(assets[i], assets[j]);
                const pair = `${assets[i].symbol}-${assets[j].symbol}`;
                correlations[pair] = correlation;
            }
        }

        return {
            matrix: correlations,
            highCorrelationPairs: Object.entries(correlations)
                .filter(([_, corr]) => Math.abs(corr) > this.riskThresholds.correlation_alert)
                .map(([pair, corr]) => ({ pair, correlation: corr }))
        };
    }

    calculateAssetCorrelation(asset1, asset2) {
        const returns1 = asset1.historicalReturns || [];
        const returns2 = asset2.historicalReturns || [];
        
        if (returns1.length !== returns2.length || returns1.length < 2) {
            return 0;
        }

        const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
        const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;

        let covariance = 0;
        let variance1 = 0;
        let variance2 = 0;

        for (let i = 0; i < returns1.length; i++) {
            covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
            variance1 += Math.pow(returns1[i] - mean1, 2);
            variance2 += Math.pow(returns2[i] - mean2, 2);
        }

        covariance /= returns1.length;
        variance1 /= returns1.length;
        variance2 /= returns1.length;

        const std1 = Math.sqrt(variance1);
        const std2 = Math.sqrt(variance2);

        return std1 * std2 !== 0 ? covariance / (std1 * std2) : 0;
    }

    assessOverallRisk(metrics) {
        const weights = {
            var: 0.25,
            expected_shortfall: 0.20,
            max_drawdown: 0.20,
            volatility: 0.15,
            sharpe: 0.10,
            beta: 0.10
        };

        let totalRisk = 0;
        let totalWeight = 0;

        // VaR Risk
        if (metrics.var) {
            const varRisk = Math.min(1, metrics.var.value / this.riskThresholds.var_95);
            totalRisk += varRisk * weights.var;
            totalWeight += weights.var;
        }

        // Expected Shortfall Risk
        if (metrics.expected_shortfall) {
            const esRisk = Math.min(1, metrics.expected_shortfall / this.riskThresholds.var_99);
            totalRisk += esRisk * weights.expected_shortfall;
            totalWeight += weights.expected_shortfall;
        }

        // Drawdown Risk
        if (metrics.max_drawdown) {
            const drawdownRisk = Math.min(1, metrics.max_drawdown / this.riskThresholds.max_drawdown);
            totalRisk += drawdownRisk * weights.max_drawdown;
            totalWeight += weights.max_drawdown;
        }

        // Volatility Risk
        if (metrics.volatility) {
            const volatilityRisk = Math.min(1, metrics.volatility / this.riskThresholds.volatility);
            totalRisk += volatilityRisk * weights.volatility;
            totalWeight += weights.volatility;
        }

        // Sharpe Ratio (معکوس - هرچه شارپ کمتر، ریسک بیشتر)
        if (metrics.sharpe) {
            const sharpeRisk = Math.max(0, 1 - (metrics.sharpe / this.riskThresholds.sharpe_min));
            totalRisk += sharpeRisk * weights.sharpe;
            totalWeight += weights.sharpe;
        }

        // Beta Risk
        if (metrics.beta) {
            const betaRisk = Math.min(1, Math.abs(metrics.beta - 1) / (this.riskThresholds.beta - 1));
            totalRisk += betaRisk * weights.beta;
            totalWeight += weights.beta;
        }

        return totalWeight > 0 ? totalRisk / totalWeight : 0.5;
    }

    classifyRiskLevel(riskScore) {
        if (riskScore > 0.8) return 'EXTREME';
        if (riskScore > 0.7) return 'VERY_HIGH';
        if (riskScore > 0.6) return 'HIGH';
        if (riskScore > 0.4) return 'MEDIUM';
        if (riskScore > 0.3) return 'LOW';
        return 'VERY_LOW';
    }

    generateRiskRecommendations(metrics, portfolio) {
        const recommendations = [];

        // توصیه‌های مبتنی بر VaR
        if (metrics.var && metrics.var.value > this.riskThresholds.var_95) {
            recommendations.push({
                type: 'VAR_REDUCTION',
                priority: 'HIGH',
                action: 'کاهش اندازه پوزیشن‌های پرریسک',
                description: `VaR فعلی (${(metrics.var.value * 100).toFixed(2)}%) از حد مجاز فراتر رفته است`,
                expectedImpact: 'HIGH'
            });
        }

        // توصیه‌های مبتنی بر Drawdown
        if (metrics.max_drawdown > this.riskThresholds.max_drawdown) {
            recommendations.push({
                type: 'DRAWDOWN_CONTROL',
                priority: 'HIGH',
                action: 'تنظیم حد ضرر متحرک و کاهش تمرکز',
                description: `حداکثر افت (${(metrics.max_drawdown * 100).toFixed(2)}%) از حد مجاز بیشتر است`,
                expectedImpact: 'HIGH'
            });
        }

        // توصیه‌های مبتنی بر همبستگی
        if (metrics.correlation.highCorrelationPairs.length > 0) {
            recommendations.push({
                type: 'DIVERSIFICATION',
                priority: 'MEDIUM',
                action: 'تنوع‌بخشی بیشتر به پرتفوی',
                description: `${metrics.correlation.highCorrelationPairs.length} جفت دارایی با همبستگی بالا شناسایی شد`,
                expectedImpact: 'MEDIUM'
            });
        }

        // توصیه‌های مبتنی بر نسبت شارپ
        if (metrics.sharpe < this.riskThresholds.sharpe_min) {
            recommendations.push({
                type: 'PORTFOLIO_OPTIMIZATION',
                priority: 'MEDIUM',
                action: 'بازبینی ترکیب دارایی‌ها برای بهبود بازده به ریسک',
                description: `نسبت شارپ (${metrics.sharpe.toFixed(2)}) پایین‌تر از حد مطلوب است`,
                expectedImpact: 'MEDIUM'
            });
        }

        return recommendations;
    }

    generateRiskWarnings(metrics) {
        const warnings = [];

        if (metrics.var && metrics.var.value > this.riskThresholds.var_99) {
            warnings.push({
                level: 'CRITICAL',
                message: `VaR در سطح 99% (${(metrics.var.value * 100).toFixed(2)}%) از حد بحرانی فراتر رفته است`,
                action: 'فوری'
            });
        }

        if (metrics.max_drawdown > 0.2) { // 20% افت
            warnings.push({
                level: 'HIGH',
                message: `حداکثر افت سرمایه (${(metrics.max_drawdown * 100).toFixed(2)}%) در محدوده خطرناک قرار دارد`,
                action: 'فوری'
            });
        }

        if (metrics.volatility > 0.3) { // 30% نوسان
            warnings.push({
                level: 'MEDIUM',
                message: `نوسان پرتفوی (${(metrics.volatility * 100).toFixed(2)}%) بسیار بالا است`,
                action: 'مراقبت'
            });
        }

        return warnings;
    }

    async analyzeSensitivity(portfolio, marketData) {
        const sensitivity = {
            toMarket: await this.analyzeMarketSensitivity(portfolio, marketData),
            toInterestRates: this.analyzeInterestRateSensitivity(portfolio),
            toVolatility: this.analyzeVolatilitySensitivity(portfolio),
            toLiquidity: this.analyzeLiquiditySensitivity(portfolio)
        };

        return sensitivity;
    }

    async analyzeMarketSensitivity(portfolio, marketData) {
        const beta = await this.calculatePortfolioBeta(portfolio, marketData);
        
        return {
            beta: beta,
            sensitivity: Math.abs(beta - 1),
            interpretation: beta > 1 ? 'پرریسک تر از بازار' : 
                           beta < 1 ? 'کم‌ریسک تر از بازار' : 'هم‌ریسک با بازار'
        };
    }

    analyzeInterestRateSensitivity(portfolio) {
        // تحلیل حساسیت به نرخ بهره (مخصوص اوراق و صندوق‌ها)
        let totalSensitivity = 0;
        let rateSensitiveAssets = 0;

        portfolio.assets.forEach(asset => {
            if (asset.duration) { // دارایی‌های حساس به نرخ بهره
                totalSensitivity += asset.duration;
                rateSensitiveAssets++;
            }
        });

        const avgDuration = rateSensitiveAssets > 0 ? totalSensitivity / rateSensitiveAssets : 0;

        return {
            duration: avgDuration,
            sensitivity: Math.min(1, avgDuration / 10), // نرمال‌سازی
            impact: avgDuration > 5 ? 'HIGH' : avgDuration > 2 ? 'MEDIUM' : 'LOW'
        };
    }

    analyzeVolatilitySensitivity(portfolio) {
        // تحلیل حساسیت به نوسان
        const volatility = this.calculatePortfolioVolatility(portfolio);
        
        return {
            volatility: volatility,
            sensitivity: Math.min(1, volatility * 2),
            vega: this.calculatePortfolioVega(portfolio) // برای اختیارات
        };
    }

    analyzeLiquiditySensitivity(portfolio) {
        // تحلیل حساسیت به نقدشوندگی
        let liquidityScore = 0;
        let assetCount = 0;

        portfolio.assets.forEach(asset => {
            if (asset.liquidity) {
                liquidityScore += asset.liquidity;
                assetCount++;
            }
        });

        const avgLiquidity = assetCount > 0 ? liquidityScore / assetCount : 0.5;
        
        return {
            liquidity: avgLiquidity,
            sensitivity: 1 - avgLiquidity, // نقدشوندگی کم = حساسیت بالا
            risk: avgLiquidity < 0.3 ? 'HIGH' : avgLiquidity < 0.6 ? 'MEDIUM' : 'LOW'
        };
    }

    async runStressTests(portfolio, marketData) {
        const scenarios = [
            {
                name: 'CRASH_2008',
                description: 'بحران مالی 2008',
                marketDecline: -0.4,
                volatilityIncrease: 0.3,
                correlationIncrease: 0.2
            },
            {
                name: 'COVID_CRASH',
                description: 'سقوط بازار در پاندمی کرونا',
                marketDecline: -0.3,
                volatilityIncrease: 0.4,
                liquidityDecrease: 0.5
            },
            {
                name: 'INTEREST_RATE_SHOCK',
                description: 'شوک نرخ بهره',
                rateIncrease: 0.02,
                marketDecline: -0.15
            },
            {
                name: 'FLASH_CRASH',
                description: 'سقوط سریع بازار',
                marketDecline: -0.2,
                recoveryTime: 1 // روز
            }
        ];

        const results = [];

        for (const scenario of scenarios) {
            const result = await this.simulateStressScenario(portfolio, scenario);
            results.push({
                scenario: scenario.name,
                description: scenario.description,
                impact: result.impact,
                varUnderStress: result.var,
                maxDrawdown: result.maxDrawdown,
                recoveryEstimate: result.recoveryEstimate
            });
        }

        return results;
    }

    async simulateStressScenario(portfolio, scenario) {
        // شبیه‌سازی تاثیر سناریوی استرس بر پرتفوی
        const initialValue = portfolio.currentValue;
        let stressedValue = initialValue;

        // اعمال کاهش بازار
        if (scenario.marketDecline) {
            stressedValue *= (1 + scenario.marketDecline);
        }

        // اعمال افزایش نوسان
        if (scenario.volatilityIncrease) {
            const volatilityImpact = scenario.volatilityIncrease * 0.1; // 10% تاثیر بر ارزش
            stressedValue *= (1 - volatilityImpact);
        }

        // اعمال کاهش نقدشوندگی
        if (scenario.liquidityDecrease) {
            const liquidityImpact = scenario.liquidityDecrease * 0.15; // 15% تاثیر بر ارزش
            stressedValue *= (1 - liquidityImpact);
        }

        const impact = (stressedValue - initialValue) / initialValue;

        return {
            impact: impact,
            var: this.calculateStressVaR(portfolio, scenario),
            maxDrawdown: Math.max(0, -impact), // فرض می‌کنیم impact منفی است
            recoveryEstimate: this.estimateRecoveryTime(impact, scenario)
        };
    }

    calculateStressVaR(portfolio, scenario) {
        const baseVaR = this.calculateParametricVaR(portfolio, 0.95) || 0;
        
        // افزایش VaR تحت شرایط استرس
        let stressMultiplier = 1;
        if (scenario.volatilityIncrease) {
            stressMultiplier += scenario.volatilityIncrease;
        }
        if (scenario.correlationIncrease) {
            stressMultiplier += scenario.correlationIncrease * 0.5;
        }

        return baseVaR * stressMultiplier;
    }

    estimateRecoveryTime(impact, scenario) {
        const severity = Math.abs(impact);
        
        if (severity < 0.1) return '1-2 هفته';
        if (severity < 0.2) return '1-3 ماه';
        if (severity < 0.3) return '3-6 ماه';
        if (severity < 0.4) return '6-12 ماه';
        return 'بیش از 1 سال';
    }

    // متدهای کمکی
    calculatePortfolioReturns(portfolio, marketData = null) {
        const values = portfolio.historicalValues || [];
        if (values.length < 2) return [];

        const returns = [];
        for (let i = 1; i < values.length; i++) {
            const ret = (values[i] - values[i-1]) / values[i-1];
            returns.push(ret);
        }

        return returns;
    }

    calculateMarketReturns(marketData) {
        if (!marketData || !marketData.historical) return [];
        
        const values = marketData.historical;
        if (values.length < 2) return [];

        const returns = [];
        for (let i = 1; i < values.length; i++) {
            const ret = (values[i] - values[i-1]) / values[i-1];
            returns.push(ret);
        }

        return returns;
    }

    calculatePortfolioVega(portfolio) {
        // محاسبه وگا برای دارایی‌های اختیاری
        let totalVega = 0;
        let optionCount = 0;

        portfolio.assets.forEach(asset => {
            if (asset.type === 'OPTION' && asset.vega) {
                totalVega += asset.vega * asset.quantity;
                optionCount++;
            }
        });

        return optionCount > 0 ? totalVega : 0;
    }

    calculateExceedanceProbability(portfolio, varValue) {
        const returns = this.calculatePortfolioReturns(portfolio);
        if (returns.length === 0) return 0;

        const exceedances = returns.filter(ret => ret < -varValue).length;
        return exceedances / returns.length;
    }

    getZScore(confidenceLevel) {
        const zScores = {
            0.90: 1.282,
            0.95: 1.645,
            0.99: 2.326
        };
        
        return zScores[confidenceLevel] || 1.645;
    }

    generateNormalRandom(mean, std) {
        // تولید عدد تصادفی با توزیع نرمال
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        
        const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mean + std * normal;
    }

    getFallbackRiskAnalysis(portfolio, error) {
        return {
            timestamp: new Date(),
            portfolioId: portfolio.id,
            overallRisk: 0.5,
            riskLevel: 'MEDIUM',
            components: {},
            recommendations: [{
                type: 'ERROR_RECOVERY',
                priority: 'HIGH',
                action: 'بررسی خطای سیستم و تکرار تحلیل',
                description: `خطا در محاسبه ریسک: ${error.message}`
            }],
            warnings: [{
                level: 'HIGH',
                message: 'داده‌های ریسک در دسترس نیستند',
                action: 'تکرار تحلیل'
            }],
            metrics: {},
            isFallback: true
        };
    }

    // مدیریت داده‌های تاریخی
    addHistoricalData(data) {
        this.historicalData.push({
            timestamp: new Date(),
            data: data
        });

        // حفظ اندازه معقول آرایه
        if (this.historicalData.length > 1000) {
            this.historicalData = this.historicalData.slice(-1000);
        }
    }

    getHistoricalRiskMetrics(portfolioId, period = '30d') {
        const relevantData = this.historicalData.filter(entry => {
            const age = Date.now() - entry.timestamp.getTime();
            const maxAge = this.periodToMilliseconds(period);
            return age <= maxAge;
        });

        return relevantData.map(entry => ({
            timestamp: entry.timestamp,
            risk: entry.data.riskMetrics?.[portfolioId] || {}
        }));
    }

    periodToMilliseconds(period) {
        const periods = {
            '1d': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            '90d': 90 * 24 * 60 * 60 * 1000
        };

        return periods[period] || periods['30d'];
    }

    // بهینه‌سازی پرتفوی بر اساس ریسک
    optimizePortfolioForRisk(portfolio, targetRisk, constraints = {}) {
        const optimization = {
            originalRisk: this.assessOverallRisk(this.calculatePortfolioRisk(portfolio, {})),
            targetRisk: targetRisk,
            suggestedChanges: [],
            expectedImprovement: 0
        };

        // الگوریتم ساده بهینه‌سازی
        portfolio.assets.forEach((asset, index) => {
            const assetRisk = this.calculateAssetRisk(asset);
            if (assetRisk > targetRisk) {
                optimization.suggestedChanges.push({
                    asset: asset.symbol,
                    currentWeight: asset.weight,
                    suggestedWeight: asset.weight * 0.8, // کاهش 20%
                    riskReduction: assetRisk - targetRisk
                });
            }
        });

        optimization.expectedImprovement = optimization.suggestedChanges
            .reduce((sum, change) => sum + change.riskReduction, 0);

        return optimization;
    }

    calculateAssetRisk(asset) {
        // محاسبه ریسک تک دارایی
        const volatility = asset.historicalVolatility || 0.2;
        const liquidity = asset.liquidity || 0.5;
        const marketCap = asset.marketCap || 1000000000;

        let risk = volatility;
        
        // تعدیل بر اساس نقدشوندگی
        risk *= (1 + (1 - liquidity) * 0.3);
        
        // تعدیل بر اساس اندازه شرکت
        if (marketCap < 500000000) risk *= 1.2; // شرکت‌های کوچک ریسک بیشتر
        if (marketCap < 100000000) risk *= 1.5; // شرکت‌های خیلی کوچک

        return Math.min(1, risk);
    }
}

export default RiskModel;