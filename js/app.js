// برنامه اصلی سیستم تحلیل مالی
class FinancialAnalysisApp {
    constructor() {
        if (FinancialAnalysisApp.instance) {
            return FinancialAnalysisApp.instance;
        }
        FinancialAnalysisApp.instance = this;

        // مدیران
        this.errorHandler = new ErrorHandler();
        this.securityManager = new SecurityService();
        this.apiService = new AdvancedAPIService();
        this.uiManager = new UIManager();
        this.dataManager = new DataManager();
        
        // موتورهای AI
        this.tradingModel = new AdvancedTradingModel();
        this.tradingEngine = new AdvancedTradingEngine();
        this.reportingEngine = new AdvancedReportingEngine();

        // داده‌های برنامه
        this.marketData = {
            stocks: [],
            indices: [],
            crypto: [],
            gold: [],
            currency: [],
            commodities: []
        };

        this.userPreferences = {
            theme: 'auto',
            language: 'fa',
            notifications: true,
            autoRefresh: true,
            riskTolerance: 'medium'
        };

        this.init();
    }

    static getInstance() {
        if (!FinancialAnalysisApp.instance) {
            FinancialAnalysisApp.instance = new FinancialAnalysisApp();
        }
        return FinancialAnalysisApp.instance;
    }

    async init() {
        try {
            // نمایش loading
            this.showLoadingScreen();

            // مقداردهی اولیه مدیران
            await this.initializeManagers();

            // بارگذاری داده‌های اولیه
            await this.loadInitialData();

            // راه‌اندازی رابط کاربری
            this.setupUI();

            // شروع سرویس‌های پس‌زمینه
            this.startBackgroundServices();

            // پنهان کردن loading
            this.hideLoadingScreen();

            console.log('✅ سیستم تحلیل مالی با موفقیت راه‌اندازی شد');

        } catch (error) {
            console.error('❌ خطا در راه‌اندازی سیستم:', error);
            this.handleInitError(error);
        }
    }

    async initializeManagers() {
        // راه‌اندازی مدیر خطا
        this.errorHandler.init();

        // راه‌اندازی امنیت
        await this.securityManager.init();

        // راه‌اندازی API
        await this.apiService.init();

        // راه‌اندازی مدیریت داده
        await this.dataManager.init();

        // بارگذاری تنظیمات کاربر
        this.loadUserPreferences();
    }

    async loadInitialData() {
        // بارگذاری داده‌های بازار
        await this.loadMarketData();

        // بارگذاری داده‌های تاریخی
        await this.loadHistoricalData();

        // بارگذاری پرتفوی کاربر
        await this.loadPortfolioData();

        // محاسبه اندیکاتورهای اولیه
        await this.calculateInitialIndicators();
    }

    async loadMarketData() {
        try {
            this.uiManager.showLoading('marketStatus', 'در حال دریافت داده‌های بازار...');

            const marketData = await this.dataManager.loadAllMarketData();
            this.marketData = { ...this.marketData, ...marketData };

            this.uiManager.showNotification('داده‌های بازار با موفقیت بارگذاری شد', 'success');

        } catch (error) {
            console.error('خطا در بارگذاری داده‌های بازار:', error);
            this.uiManager.showError('marketStatus', 'خطا در دریافت داده‌های بازار');
        }
    }

    setupUI() {
        // راه‌اندازی رابط کاربری
        this.uiManager.init();

        // تنظیم event listeners
        this.setupEventListeners();

        // آپدیت اولیه UI
        this.updateUI();

        // تنظیم تم
        this.applyUserTheme();
    }

    setupEventListeners() {
        // مدیریت رویدادهای کلیک
        document.addEventListener('click', this.handleGlobalClick.bind(this));

        // مدیریت رویدادهای صفحه‌کلید
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));

        // مدیریت تغییر اندازه پنجره
        window.addEventListener('resize', this.handleResize.bind(this));

        // مدیریت وضعیت آنلاین/آفلاین
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
    }

    handleGlobalClick(event) {
        const target = event.target;
        
        // مدیریت دکمه‌های اصلی
        if (target.id === 'refreshBtn') {
            this.loadMarketData();
        } else if (target.id === 'analyzeBtn') {
            this.performAIAnalysis();
        } else if (target.id === 'tradeBtn') {
            this.generateTradeSuggestions();
        } else if (target.id === 'riskBtn') {
            this.performRiskAssessment();
        } else if (target.id === 'securityBtn') {
            this.testSecurity();
        }
    }

    handleGlobalKeydown(event) {
        // میانبرهای صفحه‌کلید
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case 'r':
                    event.preventDefault();
                    this.loadMarketData();
                    break;
                case 'a':
                    event.preventDefault();
                    this.performAIAnalysis();
                    break;
                case 't':
                    event.preventDefault();
                    this.generateTradeSuggestions();
                    break;
            }
        }
    }

    startBackgroundServices() {
        // همگام‌سازی دوره‌ای داده‌ها
        this.dataSyncInterval = setInterval(() => {
            this.syncMarketData();
        }, 300000); // هر 5 دقیقه

        // به‌روزرسانی real-time
        this.realTimeUpdateInterval = setInterval(() => {
            this.updateRealTimeData();
        }, 10000); // هر 10 ثانیه

        // پشتیبان‌گیری خودکار
        this.backupInterval = setInterval(() => {
            this.performAutoBackup();
        }, 3600000); // هر 1 ساعت
    }

    async performAIAnalysis() {
        try {
            this.uiManager.showLoading('aiAnalysis', 'در حال تحلیل داده‌ها با هوش مصنوعی...');

            const symbols = this.getSelectedSymbols();
            const analysisResults = await this.tradingModel.analyzeMarket(symbols);

            this.displayAIAnalysis(analysisResults);
            this.uiManager.showNotification('تحلیل هوش مصنوعی با موفقیت انجام شد', 'success');

        } catch (error) {
            console.error('خطا در تحلیل هوش مصنوعی:', error);
            this.uiManager.showError('aiAnalysis', 'خطا در تحلیل داده‌ها');
        }
    }

    async performRiskAssessment() {
        try {
            const riskReport = await this.reportingEngine.generateReport('risk');
            this.displayRiskAssessment(riskReport);
        } catch (error) {
            console.error('خطا در ارزیابی ریسک:', error);
        }
    }

    async generateTradeSuggestions() {
        try {
            const analysisResults = await this.tradingModel.analyzeMarket();
            const suggestions = this.generateTradingSuggestions(analysisResults);
            
            this.displayTradeSuggestions(suggestions);
        } catch (error) {
            console.error('خطا در تولید پیشنهادات معاملاتی:', error);
        }
    }
