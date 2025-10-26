// سرویس API پیشرفته با قابلیت‌های کامل
class AdvancedAPIService {
    constructor() {
        this.config = AppConfig.API;
        this.cacheService = new CacheService();
        this.securityService = new SecurityService();
        this.retryCount = 0;
        this.isOnline = true;
        this.requestQueue = new Map();
        this.activeRequests = 0;
        
        this.init();
    }

    init() {
        this.setupOnlineMonitoring();
        this.setupRequestInterceptors();
        this.setupRateLimiting();
        this.warmupCache();
    }

    setupOnlineMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.log('اتصال اینترنت برقرار شد', 'success');
            this.processQueuedRequests();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.log('اتصال اینترنت قطع شد', 'warning');
        });

        // بررسی دوره‌ی وضعیت آنلاین
        setInterval(() => {
            this.checkConnectivity();
        }, 30000);
    }

    setupRequestInterceptors() {
        // Request Interceptor
        axios.interceptors.request.use(
            config => {
                this.activeRequests++;
                
                config.headers['X-Request-ID'] = this.generateRequestId();
                config.headers['X-Request-Timestamp'] = Date.now();
                config.headers['X-Client-Version'] = '2.0.0';
                
                // افزودن امضا برای امنیت
                if (config.url.includes('brsapi.ir')) {
                    config.headers['X-API-Signature'] = this.generateSignature(config);
                }
                
                this.log(`ارسال درخواست به: ${config.url}`, 'info');
                return config;
            },
            error => {
                this.activeRequests--;
                return Promise.reject(error);
            }
        );

        // Response Interceptor
        axios.interceptors.response.use(
            response => {
                this.activeRequests--;
                this.log(`پاسخ دریافت شده از: ${response.config.url}`, 'success');
                return response;
            },
            error => {
                this.activeRequests--;
                return this.handleResponseError(error);
            }
        );
    }

    setupRateLimiting() {
        this.rateLimit = {
            requests: 0,
            lastReset: Date.now(),
            resetInterval: 60000 // 1 دقیقه
        };

        setInterval(() => {
            this.rateLimit.requests = 0;
            this.rateLimit.lastReset = Date.now();
        }, this.rateLimit.resetInterval);
    }

    async fetchMarketData(type, options = {}) {
        const cacheKey = `market_${type}_${JSON.stringify(options)}`;
        
        // بررسی کش
        if (options.useCache !== false) {
            const cached = this.cacheService.get(cacheKey);
            if (cached) {
                this.log(`استفاده از داده‌های کش شده برای: ${type}`, 'info');
                return cached;
            }
        }

        // بررسی rate limit
        if (!this.checkRateLimit()) {
            this.log('محدودیت نرخ درخواست - استفاده از داده‌های کش', 'warning');
            return this.getFallbackData(type);
        }

        try {
            const endpoint = this.config.ENDPOINTS[type];
            const params = this.buildParams(type, options);
            
            const response = await this.makeRequest(endpoint, params, options);
            const processedData = this.processResponse(response.data, type);
            
            // اعتبارسنجی داده‌ها
            if (!this.validateMarketData(processedData, type)) {
                throw new Error('داده‌های دریافتی معتبر نیستند');
            }
            
            // ذخیره در کش
            this.cacheService.set(cacheKey, processedData, this.config.CACHE_DURATION);
            
            this.log(`داده‌های ${type} با موفقیت دریافت شد`, 'success');
            return processedData;
            
        } catch (error) {
            this.log(`خطا در دریافت داده‌های ${type}: ${error.message}`, 'error');
            
            // استفاده از داده‌های fallback
            if (options.useFallback !== false) {
                return this.getFallbackData(type);
            }
            
            throw error;
        }
    }

    async makeRequest(endpoint, params = {}, options = {}) {
        const url = this.buildURL(endpoint, params);
        
        // بررسی صف درخواست
        if (this.requestQueue.has(url)) {
            return this.requestQueue.get(url);
        }

        const requestConfig = {
            timeout: options.timeout || this.config.TIMEOUT,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Application': 'FinancialAnalysisSystem',
                'X-User-Agent': navigator.userAgent
            },
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            }
        };

        const requestPromise = this.executeRequest(url, requestConfig);
        this.requestQueue.set(url, requestPromise);

        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.requestQueue.delete(url);
        }
    }

    async executeRequest(url, config) {
        this.rateLimit.requests++;
        
        try {
            const response = await axios.get(url, config);
            
            // اعتبارسنجی پاسخ
            if (!this.validateResponse(response)) {
                throw new Error('پاسخ API معتبر نیست');
            }
            
            return response;
            
        } catch (error) {
            throw this.handleRequestError(error, url);
        }
    }

    buildURL(endpoint, params = {}) {
        const baseParams = {
            key: this.securityService.getApiKey()
        };
        
        // افزودن پارامترهای خاص endpoint
        const endpointParams = this.getEndpointSpecificParams(endpoint);
        const allParams = { ...baseParams, ...endpointParams, ...params };
        
        const searchParams = new URLSearchParams();
        Object.keys(allParams).forEach(key => {
            if (allParams[key] !== undefined && allParams[key] !== null) {
                searchParams.append(key, allParams[key]);
            }
        });
        
        const endpointPath = endpoint.split('?')[0];
        return `${this.config.BASE_URL}${endpointPath}?${searchParams.toString()}`;
    }

    getEndpointSpecificParams(endpoint) {
        const endpointPath = endpoint.split('?')[0];
        const endpointConfig = this.config.ENDPOINT_PARAMS[endpointPath];
        
        if (!endpointConfig) return {};
        
        // پیدا کردن endpoint name
        const endpointName = Object.keys(this.config.ENDPOINTS).find(
            key => this.config.ENDPOINTS[key] === endpoint
        );
        
        if (!endpointName) return {};
        
        // پیدا کردن پارامترهای مربوطه
        const paramConfig = endpointConfig.find(config => config.name === endpointName);
        return paramConfig ? { type: paramConfig.type } : {};
    }

    buildParams(type, options) {
        const endpoint = this.config.ENDPOINTS[type];
        const specificParams = this.getEndpointSpecificParams(endpoint);
        const optionParams = options.params || {};
        
        return { ...specificParams, ...optionParams };
    }

    processResponse(data, type) {
        const processors = {
            'STOCK_SYMBOLS': this.processStockData.bind(this),
            'STOCK_INDEX': this.processIndexData.bind(this),
            'FARABOURSE_INDEX': this.processIndexData.bind(this),
            'CRYPTO': this.processCryptoData.bind(this),
            'CRYPTO2': this.processCryptoData.bind(this),
            'GOLD': this.processGoldData.bind(this),
            'CURRENCY': this.processCurrencyData.bind(this),
            'COMMODITY_METALS': this.processCommodityData.bind(this),
            'COMMODITY_BASE_METALS': this.processCommodityData.bind(this),
            'COMMODITY_ENERGY': this.processCommodityData.bind(this)
        };

        const processor = processors[type] || this.processGenericData.bind(this);
        return processor(data);
    }

    processStockData(data) {
        if (!Array.isArray(data)) {
            this.log('داده‌های بورس معتبر نیستند', 'warning');
            return this.getFallbackData('STOCK_SYMBOLS');
        }
        
        return data.slice(0, 50).map(item => ({
            symbol: item.l18 || 'N/A',
            name: item.l30 || 'N/A',
            price: item.pl || item.pc || 0,
            change: item.plc || item.pcc || 0,
            changePercent: item.plp || item.pcp || 0,
            volume: item.tvol || 0,
            value: item.tval || 0,
            high: item.pmax || 0,
            low: item.pmin || 0,
            open: item.pf || 0,
            previousClose: item.py || 0,
            eps: item.eps || 0,
            pe: item.pe || 0,
            marketCap: item.mv || 0,
            tradeCount: item.tno || 0,
            
            // اطلاعات خریداران و فروشندگان
            buyers: {
                individual: item.Buy_CountI || 0,
                institutional: item.Buy_CountN || 0,
                volume: item.Buy_I_Volume || 0
            },
            sellers: {
                individual: item.Sell_CountI || 0,
                institutional: item.Sell_CountN || 0,
                volume: item.Sell_I_Volume || 0
            },
            
            // اطلاعات عمق بازار
            depth: {
                buy: [
                    { price: item.pd1, volume: item.qd1, count: item.zd1 },
                    { price: item.pd2, volume: item.qd2, count: item.zd2 },
                    { price: item.pd3, volume: item.qd3, count: item.zd3 }
                ],
                sell: [
                    { price: item.po1, volume: item.qo1, count: item.zo1 },
                    { price: item.po2, volume: item.qo2, count: item.zo2 },
                    { price: item.po3, volume: item.qo3, count: item.zo3 }
                ]
            },
            
            timestamp: new Date(),
            source: 'tsetmc',
            validated: true
        }));
    }

    processIndexData(data) {
        if (!Array.isArray(data)) {
            return this.getFallbackData('STOCK_INDEX');
        }
        
        return data.map(item => ({
            name: item.name || 'N/A',
            value: item.index || 0,
            change: item.index_change || 0,
            changePercent: item.index_change_percent || 0,
            high: item.max || 0,
            low: item.min || 0,
            marketValue: item.mv || 0,
            tradeVolume: item.tvol || 0,
            tradeValue: item.tval || 0,
            state: item.state || 'بسته',
            timestamp: new Date(),
            source: 'tsetmc'
        }));
    }

    processCryptoData(data) {
        if (!Array.isArray(data)) {
            return this.getFallbackData('CRYPTO');
        }
        
        return data.slice(0, 20).map(item => ({
            name: item.name || 'N/A',
            symbol: item.symbol || 'N/A',
            price: item.price || 0,
            priceToman: item.price_toman || 0,
            changePercent: item.change_percent || 0,
            marketCap: item.market_cap || 0,
            icon: item.link_icon || '',
            timestamp: item.time_unix ? new Date(item.time_unix * 1000) : new Date(),
            source: 'crypto_api',
            rank: data.indexOf(item) + 1
        }));
    }

    processGoldData(data) {
        if (!Array.isArray(data)) {
            return this.getFallbackData('GOLD');
        }
        
        return data.map(item => ({
            symbol: item.symbol || 'N/A',
            name: item.name || 'N/A',
            nameEn: item.name_en || 'N/A',
            price: item.price || 0,
            change: item.change_value || 0,
            changePercent: item.change_percent || 0,
            unit: item.unit || 'تومان',
            timestamp: item.time_unix ? new Date(item.time_unix * 1000) : new Date(),
            source: 'gold_api'
        }));
    }

    processCommodityData(data) {
        if (!Array.isArray(data)) {
            return this.getFallbackData('COMMODITY_METALS');
        }
        
        return data.map(item => ({
            symbol: item.symbol || 'N/A',
            name: item.name || 'N/A',
            price: item.price || 0,
            change: item.change_value || 0,
            changePercent: item.change_percent || 0,
            unit: item.unit || 'دلار',
            timestamp: item.time_unix ? new Date(item.time_unix * 1000) : new Date(),
            source: 'commodity_api'
        }));
    }

    validateMarketData(data, type) {
        if (!data) return false;
        
        const validators = {
            'STOCK_SYMBOLS': (d) => Array.isArray(d) && d.length > 0 && d[0].symbol,
            'STOCK_INDEX': (d) => Array.isArray(d) && d.length > 0 && d[0].name,
            'CRYPTO': (d) => Array.isArray(d) && d.length > 0 && d[0].name,
            'GOLD': (d) => Array.isArray(d) && d.length > 0 && d[0].name
        };
        
        const validator = validators[type];
        return validator ? validator(data) : true;
    }

    validateResponse(response) {
        if (response.status !== 200) {
            return false;
        }
        
        if (!response.data) {
            return false;
        }
        
        // بررسی ساختار پاسخ
        if (Array.isArray(response.data)) {
            return response.data.length > 0;
        }
        
        return typeof response.data === 'object' && Object.keys(response.data).length > 0;
    }

       // ادامه متدهای AdvancedAPIService

    handleRequestError(error, url) {
        this.retryCount++;
        
        const errorInfo = {
            message: error.message,
            code: error.code,
            url: url,
            timestamp: new Date().toISOString(),
            retryCount: this.retryCount,
            status: error.response?.status
        };

        // لاگ خطا
        this.securityService.logSecurityEvent('API_REQUEST_ERROR', errorInfo);
        this.log(`خطای API: ${error.message}`, 'error');

        // تصمیم‌گیری برای تلاش مجدد
        if (this.shouldRetry(error) && this.retryCount <= this.config.RETRY_ATTEMPTS) {
            const delay = this.calculateRetryDelay(this.retryCount);
            this.log(`تلاش مجدد در ${delay}ms (${this.retryCount}/${this.config.RETRY_ATTEMPTS})`, 'warning');
            
            return new Promise(resolve => 
                setTimeout(() => resolve(this.retryRequest(url)), delay)
            );
        }

        // بازنشانی شمارنده
        this.retryCount = 0;
        
        // ایجاد خطای کاربرپسند
        const userFriendlyError = this.createUserFriendlyError(error);
        return Promise.reject(userFriendlyError);
    }

    shouldRetry(error) {
        // خطاهایی که قابل تلاش مجدد هستند
        const retryableErrors = [
            'ETIMEDOUT',
            'ECONNRESET', 
            'ECONNREFUSED',
            'ENOTFOUND',
            'NETWORK_ERROR'
        ];
        
        const statusCodes = [500, 502, 503, 504]; // خطاهای سرور
        
        return retryableErrors.includes(error.code) || 
               statusCodes.includes(error.response?.status);
    }

    calculateRetryDelay(retryCount) {
        // Exponential backoff با jitter
        const baseDelay = 1000; // 1 ثانیه
        const maxDelay = 30000; // 30 ثانیه
        const exponentialDelay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
        const jitter = Math.random() * 1000; // 1 ثانیه jitter
        
        return exponentialDelay + jitter;
    }

    async retryRequest(url) {
        this.log(`تلاش مجدد برای: ${url}`, 'info');
        return this.executeRequest(url, { timeout: this.config.TIMEOUT });
    }

    createUserFriendlyError(error) {
        const errorMap = {
            'ETIMEDOUT': 'زمان اتصال به سرور به پایان رسید',
            'ECONNREFUSED': 'اتصال به سرور رد شد',
            'ENOTFOUND': 'سرور یافت نشد',
            'NETWORK_ERROR': 'خطای شبکه رخ داده است',
            '404': 'منبع درخواستی یافت نشد',
            '500': 'خطای داخلی سرور',
            '503': 'سرور موقتاً در دسترس نیست'
        };

        const userMessage = errorMap[error.code] || 
                           errorMap[error.response?.status] || 
                           'خطای ناشناخته در دریافت داده';

        return new Error(userMessage);
    }

    checkRateLimit() {
        const now = Date.now();
        const timeSinceReset = now - this.rateLimit.lastReset;
        
        if (timeSinceReset > this.rateLimit.resetInterval) {
            this.rateLimit.requests = 0;
            this.rateLimit.lastReset = now;
        }
        
        return this.rateLimit.requests < this.config.RATE_LIMIT;
    }

    checkConnectivity() {
        // بررسی ساده اتصال اینترنت
        fetch('https://www.google.com/favicon.ico', { 
            mode: 'no-cors',
            cache: 'no-cache'
        })
        .then(() => {
            if (!this.isOnline) {
                this.isOnline = true;
                this.log('اتصال اینترنت برقرار شد', 'success');
            }
        })
        .catch(() => {
            if (this.isOnline) {
                this.isOnline = false;
                this.log('اتصال اینترنت قطع شد', 'warning');
            }
        });
    }

    async processQueuedRequests() {
        if (this.requestQueue.size > 0) {
            this.log(`پردازش ${this.requestQueue.size} درخواست در صف`, 'info');
            
            for (const [url, promise] of this.requestQueue.entries()) {
                try {
                    await promise;
                } catch (error) {
                    console.warn(`خطا در پردازش درخواست صف: ${error.message}`);
                }
            }
        }
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateSignature(config) {
        // ایجاد امضای امنیتی برای درخواست‌ها
        const timestamp = Date.now();
        const data = `${config.url}${timestamp}${this.securityService.getApiKey()}`;
        return CryptoJS.SHA256(data).toString();
    }

    getFallbackData(type) {
        const fallbackGenerators = {
            'STOCK_SYMBOLS': this.generateMockStocks.bind(this),
            'STOCK_INDEX': this.generateMockIndices.bind(this),
            'FARABOURSE_INDEX': this.generateMockIndices.bind(this),
            'CRYPTO': this.generateMockCrypto.bind(this),
            'GOLD': this.generateMockGold.bind(this),
            'CURRENCY': this.generateMockCurrency.bind(this),
            'COMMODITY_METALS': this.generateMockCommodities.bind(this)
        };

        const data = fallbackGenerators[type] ? fallbackGenerators[type]() : [];
        this.log(`استفاده از داده‌های نمونه برای: ${type}`, 'warning');
        
        return data;
    }

    generateMockStocks() {
        const symbols = [
            'شتران', 'فولاد', 'خساپا', 'وبصادر', 'شپنا', 
            'کگل', 'فملی', 'وتجارت', 'خپارس', 'برکت',
            'شبندر', 'غگل', 'غالبر', 'فخوز', 'وبملت',
            'کچاد', 'شستا', 'فاسمین', 'خکار', 'غدشت'
        ];
        
        return symbols.map((symbol, index) => ({
            symbol: symbol,
            name: `شرکت ${symbol}`,
            price: Math.floor(Math.random() * 50000) + 10000,
            change: (Math.random() * 2000) - 1000,
            changePercent: (Math.random() * 10) - 5,
            volume: Math.floor(Math.random() * 10000000),
            value: Math.floor(Math.random() * 500000000000),
            high: Math.floor(Math.random() * 60000) + 10000,
            low: Math.floor(Math.random() * 40000) + 5000,
            open: Math.floor(Math.random() * 45000) + 11000,
            previousClose: Math.floor(Math.random() * 45000) + 11000,
            eps: Math.floor(Math.random() * 2000) + 500,
            pe: (Math.random() * 10) + 3,
            marketCap: Math.floor(Math.random() * 10000000000000),
            tradeCount: Math.floor(Math.random() * 10000),
            buyers: {
                individual: Math.floor(Math.random() * 1000),
                institutional: Math.floor(Math.random() * 50),
                volume: Math.floor(Math.random() * 5000000)
            },
            sellers: {
                individual: Math.floor(Math.random() * 800),
                institutional: Math.floor(Math.random() * 30),
                volume: Math.floor(Math.random() * 4000000)
            },
            timestamp: new Date(),
            source: 'mock',
            validated: false
        }));
    }

    generateMockIndices() {
        const indices = [
            'شاخص کل', 'شاخص هم وزن', 'شاخص کل هم وزن', 
            'شاخص صنعت', 'شاخص مالی', 'شاخص فرابورس'
        ];
        
        return indices.map(name => ({
            name: name,
            value: Math.floor(Math.random() * 5000000) + 2000000,
            change: (Math.random() * 50000) - 25000,
            changePercent: (Math.random() * 5) - 2.5,
            high: Math.floor(Math.random() * 6000000) + 2000000,
            low: Math.floor(Math.random() * 4000000) + 1000000,
            marketValue: Math.floor(Math.random() * 1000000000000000),
            tradeVolume: Math.floor(Math.random() * 1000000000),
            tradeValue: Math.floor(Math.random() * 5000000000000),
            state: 'بسته',
            timestamp: new Date()
        }));
    }

    generateMockCrypto() {
        const cryptos = [
            'بیت‌کوین', 'اتریوم', 'ریپل', 'کاردانو', 'سولانا',
            'دوج‌کوین', 'پolkadot', 'لایت‌کوین', 'ترون', 'چین لینک'
        ];
        
        return cryptos.map((name, index) => ({
            name: name,
            symbol: name.replace(/\s/g, '').toUpperCase(),
            price: Math.floor(Math.random() * 50000) + 20000,
            priceToman: Math.floor(Math.random() * 5000000000) + 2000000000,
            changePercent: (Math.random() * 15) - 7.5,
            marketCap: Math.floor(Math.random() * 1000000000000) + 500000000000,
            icon: `https://s2.coinmarketcap.com/static/img/coins/64x64/${index + 1}.png`,
            timestamp: new Date(),
            source: 'mock',
            rank: index + 1
        }));
    }

    generateMockGold() {
        const goldItems = [
            'سکه امامی', 'سکه بهار آزادی', 'نیم سکه', 'ربع سکه', 'طلای 18 عیار'
        ];
        
        return goldItems.map(name => ({
            symbol: name.replace(/\s/g, '_'),
            name: name,
            nameEn: name.replace('سکه', 'Coin').replace('طلای', 'Gold'),
            price: Math.floor(Math.random() * 50000000) + 50000000,
            change: (Math.random() * 2000000) - 1000000,
            changePercent: (Math.random() * 8) - 4,
            unit: 'تومان',
            timestamp: new Date(),
            source: 'mock'
        }));
    }

    generateMockCurrency() {
        const currencies = [
            'دلار', 'یورو', 'پوند', 'درهم', 'ین', 'فرانک'
        ];
        
        return currencies.map(name => ({
            symbol: name,
            name: name,
            price: Math.floor(Math.random() * 50000) + 10000,
            change: (Math.random() * 1000) - 500,
            changePercent: (Math.random() * 6) - 3,
            unit: 'تومان',
            timestamp: new Date(),
            source: 'mock'
        }));
    }

    generateMockCommodities() {
        const commodities = [
            'نفت برنت', 'طلای جهانی', 'نقره', 'مس', 'آلومینیوم', 'روی'
        ];
        
        return commodities.map(name => ({
            symbol: name.replace(/\s/g, '_'),
            name: name,
            price: Math.floor(Math.random() * 200) + 50,
            change: (Math.random() * 10) - 5,
            changePercent: (Math.random() * 8) - 4,
            unit: 'دلار',
            timestamp: new Date(),
            source: 'mock'
        }));
    }

    warmupCache() {
        // پیش‌بارگذاری داده‌های مهم در کش
        const importantEndpoints = ['STOCK_SYMBOLS', 'STOCK_INDEX', 'CRYPTO'];
        
        setTimeout(() => {
            importantEndpoints.forEach(endpoint => {
                this.fetchMarketData(endpoint, { useCache: true })
                    .then(() => this.log(`پیش‌بارگذاری ${endpoint} انجام شد`, 'info'))
                    .catch(error => console.warn(`خطا در پیش‌بارگذاری ${endpoint}:`, error));
            });
        }, 5000);
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('fa-IR');
        const styles = {
            info: 'color: blue;',
            success: 'color: green;',
            warning: 'color: orange;',
            error: 'color: red;'
        };
        
        console.log(`%c[${timestamp}] ${message}`, styles[type] || 'color: black;');
        
        // ارسال به UI اگر لازم باشد
        if (type === 'error' || type === 'warning') {
            this.notifyUI(message, type);
        }
    }

    notifyUI(message, type) {
        // ارسال نوتیفیکیشن به رابط کاربری
        if (window.UIManager && window.UIManager.showNotification) {
            window.UIManager.showNotification(message, type);
        }
    }

    // متدهای کمکی برای مدیریت درخواست‌ها
    getActiveRequestsCount() {
        return this.activeRequests;
    }

    getQueueSize() {
        return this.requestQueue.size;
    }

    clearCache() {
        this.cacheService.clear();
        this.log('کش سیستم پاک شد', 'info');
    }

    getPerformanceMetrics() {
        return {
            activeRequests: this.activeRequests,
            queueSize: this.requestQueue.size,
            retryCount: this.retryCount,
            rateLimit: this.rateLimit,
            isOnline: this.isOnline,
            cacheSize: this.cacheService.getSize()
        };
    }
}
}
