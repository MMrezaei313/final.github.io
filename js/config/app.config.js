// تنظیمات جامع سیستم مالی - نسخه پیشرفته
const AppConfig = {
    // تنظیمات API
    API: {
        BASE_URL: 'https://BrsApi.ir/Api/',
        ENDPOINTS: {
            // بورس
            STOCK_SYMBOLS: 'Tsetmc/AllSymbols.php',
            STOCK_INDEX: 'Tsetmc/Index.php',
            FARABOURSE_INDEX: 'Tsetmc/Index.php',
            
            // ارز دیجیتال
            CRYPTO: 'Market/Cryptocurrency.php',
            CRYPTO2: 'Market/Gold_Currency.php',
            
            // کامودیتی‌ها
            COMMODITY_METALS: 'Market/Commodity.php',
            COMMODITY_BASE_METALS: 'Market/Commodity.php', 
            COMMODITY_ENERGY: 'Market/Commodity.php',
            
            // طلا و ارز
            GOLD: 'Market/Gold_Currency.php',
            CURRENCY: 'Market/Gold_Currency.php'
        },
        
        // پارامترهای هر endpoint
        ENDPOINT_PARAMS: {
            'Tsetmc/Index.php': [
                { type: 1, name: 'STOCK_INDEX' },
                { type: 2, name: 'FARABOURSE_INDEX' }
            ],
            'Market/Commodity.php': [
                { type: 1, name: 'COMMODITY_METALS' },
                { type: 2, name: 'COMMODITY_BASE_METALS' },
                { type: 3, name: 'COMMODITY_ENERGY' }
            ],
            'Market/Gold_Currency.php': [
                { type: 1, name: 'GOLD' },
                { type: 2, name: 'CURRENCY' },
                { type: 3, name: 'CRYPTO2' }
            ]
        },
        
        TIMEOUT: 15000,
        RETRY_ATTEMPTS: 3,
        CACHE_DURATION: 300000, // 5 دقیقه
        RATE_LIMIT: 100 // حداکثر درخواست در دقیقه
    },

    // تنظیمات امنیت
    SECURITY: {
        ENCRYPTION_ALGORITHM: 'AES',
        KEY_SIZE: 256,
        SESSION_TIMEOUT: 3600000, // 1 ساعت
        MAX_LOGIN_ATTEMPTS: 5,
        PASSWORD_STRENGTH: 'high',
        ALLOWED_DOMAINS: ['https://brsapi.ir']
    },

    // تنظیمات تریدینگ
    TRADING: {
        STRATEGIES: {
            MEAN_REVERSION: {
                name: 'بازگشت به میانگین',
                description: 'معامله بر اساس انحراف از میانگین متحرک',
                parameters: {
                    period: 20,
                    deviation: 2,
                    position_size: 0.05
                }
            },
            TREND_FOLLOWING: {
                name: 'پیروی از روند', 
                description: 'معامله در جهت روند اصلی بازار',
                parameters: {
                    fast_ma: 10,
                    slow_ma: 30,
                    trend_strength: 0.7
                }
            },
            BREAKOUT: {
                name: 'شکست مقاومت',
                description: 'معامله در نقطه شکست سطوح کلیدی',
                parameters: {
                    resistance_level: 0.02,
                    volume_spike: 1.5,
                    confirmation_bars: 3
                }
            },
            MOMENTUM: {
                name: 'مومنتوم',
                description: 'معامله بر اساس شتاب حرکتی قیمت',
                parameters: {
                    momentum_period: 14,
                    overbought: 70,
                    oversold: 30
                }
            }
        },
        
        RISK_MANAGEMENT: {
            MAX_POSITION_SIZE: 0.1, // 10% از سرمایه
            DAILY_LOSS_LIMIT: 0.05, // 5% ضرر روزانه
            MAX_DRAWDOWN: 0.15, // 15% حداکثر افت
            STOP_LOSS: 0.03, // 3% حد ضرر
            TAKE_PROFIT: 0.08, // 8% حد سود
            DIVERSIFICATION: 0.05 // حداکثر 5% در یک سهم
        },
        
        COMMISSION: {
            STOCK: 0.0015, // 0.15% کارمزد بورس
            CRYPTO: 0.002, // 0.2% کارمزد ارز دیجیتال
            GOLD: 0.001 // 0.1% کارمزد طلا
        }
    },

    // تنظیمات رابط کاربری
    UI: {
        THEME: {
            DARK: 'dark',
            LIGHT: 'light', 
            AUTO: 'auto'
        },
        LANGUAGE: 'fa',
        DIRECTION: 'rtl',
        
        CHARTS: {
            DEFAULT_PERIOD: '1m',
            UPDATE_INTERVAL: 10000,
            ANIMATION_DURATION: 1000,
            COLOR_SCHEME: {
                POSITIVE: '#28a745',
                NEGATIVE: '#dc3545',
                NEUTRAL: '#6c757d'
            }
        },
        
        NOTIFICATIONS: {
            ENABLED: true,
            DURATION: 5000,
            POSITION: 'top-right',
            TYPES: ['success', 'warning', 'error', 'info']
        },
        
        LAYOUT: {
            SIDEBAR_WIDTH: 320,
            HEADER_HEIGHT: 60,
            CARD_SPACING: 20
        }
    },

    // تنظیمات AI و تحلیل
    AI: {
        MODELS: {
            PREDICTION_CONFIDENCE_THRESHOLD: 0.7,
            SENTIMENT_ANALYSIS_ENABLED: true,
            RISK_ASSESSMENT_ENABLED: true,
            PATTERN_RECOGNITION_ENABLED: true,
            FEATURE_IMPORTANCE_ENABLED: true
        },
        
        ANALYSIS: {
            TECHNICAL_INDICATORS: ['RSI', 'MACD', 'BollingerBands', 'Stochastic'],
            TIME_FRAMES: ['1h', '4h', '1d', '1w'],
            CONFIDENCE_LEVELS: {
                VERY_HIGH: 0.9,
                HIGH: 0.8,
                MEDIUM: 0.7,
                LOW: 0.6
            }
        },
        
        TRAINING: {
            BATCH_SIZE: 32,
            EPOCHS: 100,
            LEARNING_RATE: 0.001,
            VALIDATION_SPLIT: 0.2
        }
    },

    // تنظیمات گزارش‌گیری
    REPORTING: {
        AUTO_GENERATE: true,
        SCHEDULE: {
            DAILY: '18:00',
            WEEKLY: '09:00',
            MONTHLY: '10:00'
        },
        FORMATS: ['pdf', 'excel', 'json', 'html'],
        RETENTION_DAYS: 365,
        
        TYPES: {
            PERFORMANCE: {
                name: 'گزارش عملکرد',
                sections: ['summary', 'trades', 'analysis', 'recommendations']
            },
            RISK: {
                name: 'گزارش ریسک', 
                sections: ['exposure', 'var', 'stress_test', 'scenarios']
            },
            TRADING: {
                name: 'گزارش معاملات',
                sections: ['daily_trades', 'performance', 'commissions', 'tax']
            }
        }
    },

    // تنظیمات عملکرد
    PERFORMANCE: {
        CACHE_ENABLED: true,
        COMPRESSION_ENABLED: true,
        LAZY_LOADING_ENABLED: true,
        DEBOUNCE_DELAY: 300,
        MAX_CONCURRENT_REQUESTS: 5
    }
};

// فریز کردن کانفیگ برای جلوگیری از تغییرات
Object.freeze(AppConfig);
