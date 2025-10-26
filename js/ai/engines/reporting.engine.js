// موتور گزارش‌گیری پیشرفته
class AdvancedReportingEngine {
    constructor() {
        this.reportTemplates = new Map();
        this.scheduledReports = new Map();
        this.reportHistory = [];
        this.exportFormats = ['pdf', 'excel', 'json', 'html'];
        
        this.initTemplates();
        this.setupScheduledReports();
        this.setupAutoReporting();
    }

    initTemplates() {
        // تمپلیت گزارش عملکرد
        this.reportTemplates.set('performance', {
            name: 'گزارش عملکرد',
            description: 'گزارش جامع عملکرد معاملات و سرمایه‌گذاری',
            sections: ['executive_summary', 'performance_metrics', 'trade_analysis', 'risk_assessment', 'recommendations'],
            format: 'pdf',
            generate: this.generatePerformanceReport.bind(this),
            charts: ['equity_curve', 'monthly_returns', 'drawdown', 'risk_metrics']
        });

        // تمپلیت گزارش ریسک
        this.reportTemplates.set('risk', {
            name: 'گزارش ریسک',
            description: 'تحلیل جامع ریسک و مدیریت سرمایه',
            sections: ['risk_metrics', 'exposure_analysis', 'stress_testing', 'scenario_analysis', 'risk_recommendations'],
            format: 'pdf',
            generate: this.generateRiskReport.bind(this),
            charts: ['var_analysis', 'correlation_matrix', 'stress_test_results']
        });

        // تمپلیت گزارش معاملات
        this.reportTemplates.set('trading', {
            name: 'گزارش معاملات',
            description: 'گزارش تفصیلی معاملات و کارمزدها',
            sections: ['trade_summary', 'daily_trades', 'commission_analysis', 'tax_calculation', 'performance_by_strategy'],
            format: 'excel',
            generate: this.generateTradingReport.bind(this),
            charts: ['trade_distribution', 'strategy_performance', 'time_analysis']
        });

        // تمپلیت گزارش تحلیلی
        this.reportTemplates.set('analytical', {
            name: 'گزارش تحلیلی',
            description: 'تحلیل بازار و پیش‌بینی‌های آینده',
            sections: ['market_analysis', 'sector_performance', 'technical_analysis', 'fundamental_analysis', 'predictions'],
            format: 'pdf',
            generate: this.generateAnalyticalReport.bind(this),
            charts: ['market_trends', 'sector_rotation', 'technical_indicators']
        });

        // تمپلیت گزارش پرتفوی
        this.reportTemplates.set('portfolio', {
            name: 'گزارش پرتفوی',
            description: 'تحلیل جامع پرتفوی و تخصیص دارایی',
            sections: ['portfolio_summary', 'asset_allocation', 'performance_breakdown', 'diversification_analysis', 'rebalancing_suggestions'],
            format: 'pdf',
            generate: this.generatePortfolioReport.bind(this),
            charts: ['allocation_pie', 'performance_timeline', 'diversification_metrics']
        });
    }

    setupScheduledReports() {
        // گزارش روزانه
        this.scheduledReports.set('daily', {
            time: '18:00',
            templates: ['performance', 'trading'],
            enabled: true,
            recipients: ['user'],
            retention: 30
        });

        // گزارش هفتگی
        this.scheduledReports.set('weekly', {
            day: 0, // یکشنبه
            time: '09:00',
            templates: ['performance', 'risk', 'portfolio'],
            enabled: true,
            recipients: ['user', 'advisor'],
            retention: 90
        });

        // گزارش ماهانه
        this.scheduledReports.set('monthly', {
            day: 1, // اول ماه
            time: '10:00',
            templates: ['performance', 'risk', 'trading', 'analytical', 'portfolio'],
            enabled: true,
            recipients: ['user', 'advisor', 'compliance'],
            retention: 365
        });
    }

    setupAutoReporting() {
        // بررسی خودکار برای گزارش‌های زمان‌بندی شده
        setInterval(() => {
            this.checkScheduledReports();
        }, 60000); // هر 1 دقیقه
    }

    // تولید گزارش اصلی
    async generateReport(templateId, options = {}) {
        const template = this.reportTemplates.get(templateId);
        if (!template) {
            throw new Error(`تمپلیت گزارش ${templateId} یافت نشد`);
        }

        try {
            const startTime = Date.now();
            
            // جمع‌آوری داده‌ها
            const reportData = await this.collectReportData(template.sections, options);
            
            // تولید گزارش
            const report = await template.generate(reportData, options);
            
            // اضافه کردن متادیتا
            report.metadata = {
                generatedAt: new Date(),
                template: templateId,
                generationTime: Date.now() - startTime,
                dataPoints: this.countDataPoints(reportData),
                version: '2.0.0'
            };

            // ذخیره گزارش
            await this.saveReport(report, templateId, options);

            // ارسال نوتیفیکیشن
            this.notifyReportGeneration(report, template);

            // آپدیت UI
            this.updateReportUI(report);

            return report;

        } catch (error) {
            console.error(`خطا در تولید گزارش ${templateId}:`, error);
            throw error;
        }
    }

    // گزارش عملکرد
    async generatePerformanceReport(data, options) {
        const timeframe = options.timeframe || '1m';
        const tradingEngine = window.FinancialAnalysisApp?.tradingEngine;
        const performance = tradingEngine?.getTradingReport() || this.getSamplePerformance();
        
        return {
            title: `گزارش عملکرد ${this.getTimeframeText(timeframe)}`,
            type: 'performance',
            timeframe: timeframe,
            generatedAt: new Date(),
            
            executiveSummary: this.generateExecutiveSummary(performance),
            
            performanceMetrics: {
                absolute: {
                    totalReturn: performance.summary.totalProfit,
                    dailyReturn: this.calculateDailyReturn(performance),
                    monthlyReturn: this.calculateMonthlyReturn(performance)
                },
                relative: {
                    sharpeRatio: performance.performance.sharpeRatio,
                    sortinoRatio: this.calculateSortinoRatio(performance),
                    alpha: this.calculateAlpha(performance),
                    beta: this.calculateBeta(performance)
                },
                riskAdjusted: {
                    winRate: performance.performance.winRate,
                    profitFactor: this.calculateProfitFactor(performance),
                    maxDrawdown: performance.performance.maxDrawdown,
                    recoveryFactor: this.calculateRecoveryFactor(performance)
                }
            },

            tradeAnalysis: {
                tradeStatistics: {
                    totalTrades: performance.summary.totalTrades,
                    winningTrades: performance.performance.profitableTrades,
                    losingTrades: performance.summary.totalTrades - performance.performance.profitableTrades,
                    averageWin: this.calculateAverageWin(performance),
                    averageLoss: this.calculateAverageLoss(performance)
                },
                timeAnalysis: {
                    bestDay: this.findBestDay(performance),
                    worstDay: this.findWorstDay(performance),
                    averageHoldingPeriod: this.calculateAverageHoldingPeriod(performance),
                    tradeFrequency: this.calculateTradeFrequency(performance)
                },
                strategyAnalysis: this.analyzeStrategyPerformance(performance)
            },

            riskAssessment: {
                varAnalysis: this.calculateValueAtRisk(performance),
                stressTesting: this.performStressTesting(performance),
                scenarioAnalysis: this.analyzeScenarios(performance),
                riskMetrics: this.calculateAdvancedRiskMetrics(performance)
            },

            recommendations: this.generatePerformanceRecommendations(performance),

            charts: await this.generatePerformanceCharts(performance, timeframe)
        };
    }

    // گزارش ریسک
    async generateRiskReport(data, options) {
        const riskMetrics = await this.calculateComprehensiveRiskMetrics();
        
        return {
            title: 'گزارش جامع ریسک',
            type: 'risk',
            generatedAt: new Date(),

            riskMetrics: {
                portfolioRisk: {
                    valueAtRisk: riskMetrics.var,
                    conditionalVaR: riskMetrics.cvar,
                    expectedShortfall: riskMetrics.expectedShortfall
                },
                concentrationRisk: {
                    herfindahlIndex: riskMetrics.herfindahlIndex,
                    topPositionConcentration: riskMetrics.topPositionConcentration,
                    sectorConcentration: riskMetrics.sectorConcentration
                },
                liquidityRisk: {
                    liquidationTime: riskMetrics.liquidationTime,
                    marketImpact: riskMetrics.marketImpact,
                    bidAskSpread: riskMetrics.bidAskSpread
                }
            },

            exposureAnalysis: {
                assetAllocation: this.analyzeAssetAllocation(),
                geographicExposure: this.analyzeGeographicExposure(),
                sectorExposure: this.analyzeSectorExposure(),
                currencyExposure: this.analyzeCurrencyExposure()
            },

            stressTesting: {
                historicalScenarios: this.runHistoricalStressTests(),
                hypotheticalScenarios: this.runHypotheticalStressTests(),
                sensitivityAnalysis: this.performSensitivityAnalysis()
            },

            scenarioAnalysis: {
                baseCase: this.analyzeBaseCaseScenario(),
                bearCase: this.analyzeBearCaseScenario(),
                bullCase: this.analyzeBullCaseScenario(),
                blackSwan: this.analyzeBlackSwanScenario()
            },

            riskRecommendations: this.generateRiskRecommendations(riskMetrics),

            charts: await this.generateRiskCharts(riskMetrics)
        };
    }

    // گزارش معاملات
    async generateTradingReport(data, options) {
        const tradingData = await this.collectTradingData(options);
        
        return {
            title: 'گزارش تفصیلی معاملات',
            type: 'trading',
            period: options.period || '1m',
            generatedAt: new Date(),

            tradeSummary: {
                totalTrades: tradingData.totalTrades,
                totalVolume: tradingData.totalVolume,
                totalCommission: tradingData.totalCommission,
                netProfit: tradingData.netProfit,
                winRate: tradingData.winRate
            },

            dailyTrades: this.organizeTradesByDay(tradingData.trades),

            commissionAnalysis: {
                totalCommission: tradingData.totalCommission,
                commissionByBroker: this.analyzeCommissionByBroker(tradingData.trades),
                commissionByAsset: this.analyzeCommissionByAsset(tradingData.trades),
                efficiencyRatio: this.calculateCommissionEfficiency(tradingData)
            },

            taxCalculation: {
                taxableProfit: this.calculateTaxableProfit(tradingData),
                taxLiability: this.calculateTaxLiability(tradingData),
                taxOptimization: this.suggestTaxOptimization(tradingData)
            },

            performanceByStrategy: this.analyzeStrategyPerformance(tradingData.trades),

            charts: await this.generateTradingCharts(tradingData)
        };
    }

    // جمع‌آوری داده‌های گزارش
    async collectReportData(sections, options) {
        const data = {};
        const dataCollectors = {
            'executive_summary': this.collectExecutiveSummaryData.bind(this),
            'performance_metrics': this.collectPerformanceMetrics.bind(this),
            'trade_analysis': this.collectTradeAnalysisData.bind(this),
            'risk_assessment': this.collectRiskAssessmentData.bind(this),
            'market_analysis': this.collectMarketAnalysisData.bind(this)
        };

        for (const section of sections) {
            const collector = dataCollectors[section];
            if (collector) {
                data[section] = await collector(options);
            }
        }

        return data;
    }

    // تولید خلاصه اجرایی
    generateExecutiveSummary(performance) {
        const totalReturn = performance.summary.totalProfit;
        const winRate = performance.performance.winRate * 100;
        const sharpeRatio = performance.performance.sharpeRatio;
        
        return {
            overallPerformance: totalReturn >= 0 ? 'مثبت' : 'منفی',
            keyAchievements: this.extractAchievements(performance),
            challenges: this.identifyChallenges(performance),
            outlook: this.generateOutlook(performance),
            keyMetrics: {
                totalReturn: `${this.formatCurrency(totalReturn)}`,
                winRate: `${winRate.toFixed(1)}%`,
                sharpeRatio: sharpeRatio.toFixed(2),
                bestPerformer: this.findBestPerformer(performance),
                areasForImprovement: this.identifyImprovementAreas(performance)
            }
        };
    }

    // محاسبه معیارهای پیشرفته عملکرد
    calculateSharpeRatio(performance) {
        const returns = this.extractReturns(performance);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdDev = Math.sqrt(returns.reduce((sq, n) => sq + Math.pow(n - avgReturn, 2), 0) / returns.length);
        
        return stdDev > 0 ? avgReturn / stdDev : 0;
    }

    calculateSortinoRatio(performance) {
        const returns = this.extractReturns(performance);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const downsideReturns = returns.filter(r => r < 0);
        const downsideDev = Math.sqrt(downsideReturns.reduce((sq, n) => sq + Math.pow(n, 2), 0) / downsideReturns.length);
        
        return downsideDev > 0 ? avgReturn / downsideDev : 0;
    }

    calculateProfitFactor(performance) {
        const grossProfit = performance.performance.profitableTrades * this.calculateAverageWin(performance);
        const grossLoss = (performance.summary.totalTrades - performance.performance.profitableTrades) * this.calculateAverageLoss(performance);
        
        return grossLoss > 0 ? grossProfit / grossLoss : Infinity;
    }

    // تحلیل استراتژی
    analyzeStrategyPerformance(performance) {
        const strategies = this.extractStrategies(performance);
        const analysis = {};

        strategies.forEach(strategy => {
            const strategyTrades = this.filterTradesByStrategy(performance, strategy);
            analysis[strategy] = {
                winRate: this.calculateWinRate(strategyTrades),
                totalReturn: this.calculateTotalReturn(strategyTrades),
                sharpeRatio: this.calculateSharpeRatioForTrades(strategyTrades),
                maxDrawdown: this.calculateMaxDrawdownForTrades(strategyTrades),
                tradeCount: strategyTrades.length
            };
        });

        return analysis;
    }

    // تولید نمودارهای عملکرد
    async generatePerformanceCharts(performance, timeframe) {
        const charts = {};

        // نمودار منحنی سرمایه
        charts.equity_curve = await this.createEquityCurveChart(performance, timeframe);
        
        // نمودار بازده ماهانه
        charts.monthly_returns = await this.createMonthlyReturnsChart(performance);
        
        // نمودار drawdown
        charts.drawdown = await this.createDrawdownChart(performance);
        
        // نمودار معیارهای ریسک
        charts.risk_metrics = await this.createRiskMetricsChart(performance);

        return charts;
    }

    async createEquityCurveChart(performance, timeframe) {
        const equityData = this.calculateEquityCurve(performance);
        
        const trace = {
            x: equityData.dates,
            y: equityData.equity,
            type: 'scatter',
            mode: 'lines',
            name: 'منحنی سرمایه',
            line: {
                color: '#667eea',
                width: 3
            },
            fill: 'tozeroy',
            fillcolor: 'rgba(102, 126, 234, 0.1)'
        };

        const layout = {
            title: 'منحنی رشد سرمایه',
            xaxis: { title: 'زمان' },
            yaxis: { title: 'سرمایه (تومان)' },
            showlegend: false,
            margin: { t: 50, r: 50, b: 50, l: 50 }
        };

        return { data: [trace], layout };
    }

    // مدیریت گزارش‌های زمان‌بندی شده
    async checkScheduledReports() {
        const now = new Date();
        
        for (const [scheduleId, schedule] of this.scheduledReports) {
            if (!schedule.enabled) continue;

            if (this.shouldGenerateReport(schedule, now)) {
                await this.generateScheduledReport(scheduleId, schedule);
            }
        }
    }

    shouldGenerateReport(schedule, now) {
        if (schedule.time) {
            const [hours, minutes] = schedule.time.split(':');
            const targetTime = new Date();
            targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // بررسی اینکه آیا الان زمان گزارش‌گیری است
            return now.getHours() === targetTime.getHours() && 
                   now.getMinutes() === targetTime.getMinutes();
        }
        
        if (schedule.day !== undefined) {
            return now.getDay() === schedule.day && 
                   now.getHours() === 9 && // 9 صبح
                   now.getMinutes() === 0;
        }
        
        return false;
    }

    async generateScheduledReport(scheduleId, schedule) {
        console.log(`📊 تولید گزارش زمان‌بندی شده: ${scheduleId}`);
        
        const reports = [];
        
        for (const templateId of schedule.templates) {
            try {
                const report = await this.generateReport(templateId, {
                    timeframe: scheduleId,
                    auto: true,
                    recipients: schedule.recipients
                });
                
                reports.push(report);
                
                // ارسال به گیرندگان
                await this.distributeReport(report, schedule.recipients);
                
            } catch (error) {
                console.error(`خطا در تولید گزارش ${templateId}:`, error);
            }
        }
        
        // آرشیو گزارش‌ها
        await this.archiveReports(reports, scheduleId);
    }

    // توزیع گزارش
    async distributeReport(report, recipients) {
        for (const recipient of recipients) {
            switch(recipient) {
                case 'user':
                    await this.sendToUser(report);
                    break;
                case 'advisor':
                    await this.sendToAdvisor(report);
                    break;
                case 'compliance':
                    await this.sendToCompliance(report);
                    break;
            }
        }
    }

    async sendToUser(report) {
        // ارسال به کاربر از طریق رابط کاربری
        if (window.UIManager) {
            window.UIManager.showNotification(
                `گزارش ${report.title} تولید شد`,
                'success'
            );
        }
        
        // ذخیره در تاریخچه کاربر
        this.addToUserReportHistory(report);
    }

    // صادرات گزارش
    async exportReport(report, format = 'pdf') {
        const exporters = {
            'pdf': this.exportToPDF.bind(this),
            'excel': this.exportToExcel.bind(this),
            'json': this.exportToJSON.bind(this),
            'html': this.exportToHTML.bind(this)
        };

        const exporter = exporters[format];
        if (!exporter) {
            throw new Error(`فرمت ${format} پشتیبانی نمی‌شود`);
        }

        return await exporter(report);
    }

    async exportToPDF(report) {
        // شبیه‌سازی تولید PDF
        return {
            format: 'pdf',
            filename: `${report.title}_${new Date().toISOString().split('T')[0]}.pdf`,
            content: this.generatePDFContent(report),
            url: URL.createObjectURL(new Blob([JSON.stringify(report)], { type: 'application/pdf' })),
            size: JSON.stringify(report).length,
            pages: this.calculatePageCount(report)
        };
    }

    async exportToExcel(report) {
        // شبیه‌سازی تولید Excel
        const excelData = this.convertToExcelFormat(report);
        
        return {
            format: 'excel',
            filename: `${report.title}_${new Date().toISOString().split('T')[0]}.xlsx`,
            content: excelData,
            url: URL.createObjectURL(new Blob([JSON.stringify(excelData)], { type: 'application/vnd.ms-excel' })),
            size: JSON.stringify(excelData).length,
            sheets: Object.keys(excelData).length
        };
    }

    // ذخیره و بازیابی گزارش‌ها
    async saveReport(report, templateId, options) {
        const reportId = this.generateReportId();
        const reportRecord = {
            id: reportId,
            template: templateId,
            report: report,
            generatedAt: new Date(),
            options: options,
            accessCount: 0
        };

        this.reportHistory.unshift(reportRecord);
        
        // محدود کردن تاریخچه
        if (this.reportHistory.length > 1000) {
            this.reportHistory = this.reportHistory.slice(0, 500);
        }

        // ذخیره در localStorage
        await this.persistReport(reportRecord);

        return reportId;
    }

    async persistReport(reportRecord) {
        try {
            const reports = JSON.parse(localStorage.getItem('financial_reports') || '[]');
            reports.unshift(reportRecord);
            
            // محدود کردن تعداد گزارش‌های ذخیره شده
            if (reports.length > 100) {
                reports.splice(100);
            }
            
            localStorage.setItem('financial_reports', JSON.stringify(reports));
        } catch (error) {
            console.warn('خطا در ذخیره گزارش:', error);
        }
    }

    // گزارش ترکیبی
    async generateComprehensiveReport(options = {}) {
        const templates = options.templates || Array.from(this.reportTemplates.keys());
        const reports = {};

        for (const templateId of templates) {
            try {
                reports[templateId] = await this.generateReport(templateId, options);
            } catch (error) {
                console.error(`خطا در تولید گزارش ${templateId}:`, error);
                reports[templateId] = { error: error.message };
            }
        }

        // تولید گزارش جامع
        const comprehensiveReport = {
            title: 'گزارش جامع عملکرد و ریسک',
            type: 'comprehensive',
            generatedAt: new Date(),
            period: options.period || '1m',
            
            reports: reports,
            
            executiveSummary: this.generateComprehensiveSummary(reports),
            
            crossAnalysis: this.performCrossAnalysis(reports),
            
            integratedRecommendations: this.generateIntegratedRecommendations(reports),
            
            keyInsights: this.extractKeyInsights(reports)
        };

        return comprehensiveReport;
    }

    // توابع کمکی
    generateReportId() {
        return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getTimeframeText(timeframe) {
        const texts = {
            '1d': 'روزانه',
            '1w': 'هفتگی',
            '1m': 'ماهانه',
            '3m': 'سه‌ماهه',
            '1y': 'سالانه',
            'all': 'تمام دوره'
        };
        return texts[timeframe] || timeframe;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fa-IR', {
            style: 'currency',
            currency: 'IRR'
        }).format(amount);
    }

    formatPercentage(value) {
        return new Intl.NumberFormat('fa-IR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    countDataPoints(data) {
        let count = 0;
        
        const countRecursive = (obj) => {
            if (Array.isArray(obj)) {
                count += obj.length;
                obj.forEach(item => countRecursive(item));
            } else if (typeof obj === 'object' && obj !== null) {
                Object.values(obj).forEach(value => countRecursive(value));
            }
        };
        
        countRecursive(data);
        return count;
    }

    notifyReportGeneration(report, template) {
        const message = `گزارش "${template.name}" با موفقیت تولید شد`;
        
        if (window.UIManager) {
            window.UIManager.showNotification(message, 'success');
        }
        
        // لاگ کردن برای آنالیتیکس
        this.logReportGeneration(report, template);
    }

    updateReportUI(report) {
        // آپدیت رابط کاربری با گزارش جدید
        if (window.UIManager && window.UIManager.updateReportsList) {
            window.UIManager.updateReportsList(report);
        }
    }

    // داده‌های نمونه برای تست
    getSamplePerformance() {
        return {
            summary: {
                totalTrades: 45,
                profitableTrades: 28,
                totalProfit: 12500000,
                activePositions: 3,
                closedPositions: 42
            },
            performance: {
                winRate: 0.62,
                sharpeRatio: 1.45,
                maxDrawdown: -0.085
            },
            trades: this.generateSampleTrades(45)
        };
    }

    generateSampleTrades(count) {
        const trades = [];
        const symbols = ['شتران', 'فولاد', 'خساپا', 'وبصادر', 'شپنا'];
        
        for (let i = 0; i < count; i++) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const profit = (Math.random() - 0.3) * 1000000;
            
            trades.push({
                id: `trade_${i}`,
                symbol: symbol,
                type: Math.random() > 0.5 ? 'BUY' : 'SELL',
                quantity: Math.floor(Math.random() * 1000) + 100,
                entryPrice: Math.random() * 50000 + 10000,
                exitPrice: Math.random() * 50000 + 10000,
                profit: profit,
                commission: Math.random() * 100000,
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
                strategy: ['mean_reversion', 'trend_following', 'breakout'][Math.floor(Math.random() * 3)]
            });
        }
        
        return trades;
    }

    // مدیریت تاریخچه گزارش‌ها
    getReportHistory(limit = 50) {
        return this.reportHistory.slice(0, limit);
    }

    getReportById(reportId) {
        return this.reportHistory.find(report => report.id === reportId);
    }

    deleteReport(reportId) {
        const index = this.reportHistory.findIndex(report => report.id === reportId);
        if (index !== -1) {
            this.reportHistory.splice(index, 1);
            this.removeReportFromStorage(reportId);
            return true;
        }
        return false;
    }

    async removeReportFromStorage(reportId) {
        try {
            const reports = JSON.parse(localStorage.getItem('financial_reports') || '[]');
            const filteredReports = reports.filter(report => report.id !== reportId);
            localStorage.setItem('financial_reports', JSON.stringify(filteredReports));
        } catch (error) {
            console.warn('خطا در حذف گزارش از storage:', error);
        }
    }

    // آمار استفاده از گزارش‌ها
    getReportingStats() {
        const totalReports = this.reportHistory.length;
        const templatesUsed = new Set(this.reportHistory.map(r => r.template)).size;
        const last30Days = this.reportHistory.filter(r => 
            Date.now() - r.generatedAt.getTime() < 30 * 24 * 60 * 60 * 1000
        ).length;

        return {
            totalReports,
            templatesUsed,
            last30Days,
            mostPopularTemplate: this.getMostPopularTemplate(),
            averageGenerationTime: this.calculateAverageGenerationTime(),
            storageUsage: this.calculateStorageUsage()
        };
    }

    getMostPopularTemplate() {
        const templateCounts = {};
        this.reportHistory.forEach(report => {
            templateCounts[report.template] = (templateCounts[report.template] || 0) + 1;
        });
        
        return Object.keys(templateCounts).reduce((a, b) => 
            templateCounts[a] > templateCounts[b] ? a : b
        );
    }

    calculateAverageGenerationTime() {
        const times = this.reportHistory
            .map(r => r.report.metadata?.generationTime)
            .filter(time => time !== undefined);
        
        return times.length > 0 ? 
               times.reduce((a, b) => a + b, 0) / times.length : 0;
    }

    calculateStorageUsage() {
        const reportsJson = JSON.stringify(this.reportHistory);
        return {
            bytes: reportsJson.length,
            kilobytes: Math.round(reportsJson.length / 1024),
            megabytes: Math.round(reportsJson.length / 1024 / 1024 * 100) / 100
        };
    }
}
