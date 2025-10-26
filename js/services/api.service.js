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

    // بقیه متدها به دلیل محدودیت طول ادامه دارند...
}
