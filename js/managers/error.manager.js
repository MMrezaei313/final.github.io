class ErrorManager {
    constructor(config = {}) {
        this.config = {
            maxErrors: 1000,
            autoReport: false,
            logToConsole: true,
            showUserFriendlyMessages: true,
            ...config
        };
        
        this.errors = [];
        this.errorCounts = new Map();
        this.ignoredErrors = new Set();
        this.customHandlers = new Map();
        
        this.init();
    }

    init() {
        // ثبت global error handlers
        this.setupGlobalHandlers();
        
        // ثبت unhandled rejection handler
        this.setupPromiseHandlers();
        
        // ثبت custom handlers برای خطاهای خاص
        this.setupCustomHandlers();
    }

    setupGlobalHandlers() {
        window.addEventListener('error', (event) => {
            this.handleGlobalError(
                event.error || new Error(event.message),
                event.filename,
                event.lineno,
                event.colno
            );
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event.reason);
        });
    }

    setupPromiseHandlers() {
        // اضافه کردن هندلر برای Promise.reject
        const originalPromiseReject = Promise.reject;
        Promise.reject = (reason) => {
            this.handlePromiseRejection(reason);
            return originalPromiseReject.call(Promise, reason);
        };
    }

    setupCustomHandlers() {
        // هندلرهای سفارشی برای خطاهای خاص
        this.customHandlers.set('NETWORK_ERROR', this.handleNetworkError.bind(this));
        this.customHandlers.set('API_ERROR', this.handleAPIError.bind(this));
        this.customHandlers.set('AUTH_ERROR', this.handleAuthError.bind(this));
        this.customHandlers.set('VALIDATION_ERROR', this.handleValidationError.bind(this));
        this.customHandlers.set('TIMEOUT_ERROR', this.handleTimeoutError.bind(this));
    }

    handleGlobalError(error, filename, lineno, colno) {
        const errorInfo = this.processError(error, {
            type: 'GLOBAL_ERROR',
            filename,
            lineno,
            colno,
            stack: error.stack
        });

        this.logError(errorInfo);
        this.notifyUser(errorInfo);
        
        return false; // جلوگیری از نمایش default error dialog
    }

    handlePromiseRejection(reason) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        
        const errorInfo = this.processError(error, {
            type: 'PROMISE_REJECTION',
            reason: reason
        });

        this.logError(errorInfo);
        this.notifyUser(errorInfo);
    }

    handleNetworkError(error, context) {
        const errorInfo = this.processError(error, {
            type: 'NETWORK_ERROR',
            context,
            severity: 'HIGH',
            userMessage: 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.'
        });

        this.logError(errorInfo);
        this.showNetworkErrorNotification(errorInfo);
    }

    handleAPIError(error, context) {
        const errorInfo = this.processError(error, {
            type: 'API_ERROR',
            context,
            severity: 'MEDIUM',
            userMessage: 'خطا در دریافت اطلاعات از سرور. لطفاً مجدداً تلاش کنید.'
        });

        this.logError(errorInfo);
        this.showAPIErrorNotification(errorInfo);
    }

    handleAuthError(error, context) {
        const errorInfo = this.processError(error, {
            type: 'AUTH_ERROR',
            context,
            severity: 'HIGH',
            userMessage: 'خطا در احراز هویت. لطفاً مجدداً وارد شوید.'
        });

        this.logError(errorInfo);
        this.showAuthErrorNotification(errorInfo);
    }

    handleValidationError(error, context) {
        const errorInfo = this.processError(error, {
            type: 'VALIDATION_ERROR',
            context,
            severity: 'LOW',
            userMessage: 'خطا در اعتبارسنجی داده‌ها. لطفاً اطلاعات را بررسی کنید.'
        });

        this.logError(errorInfo);
        this.showValidationErrorNotification(errorInfo);
    }

    handleTimeoutError(error, context) {
        const errorInfo = this.processError(error, {
            type: 'TIMEOUT_ERROR',
            context,
            severity: 'MEDIUM',
            userMessage: 'زمان درخواست به پایان رسید. لطفاً مجدداً تلاش کنید.'
        });

        this.logError(errorInfo);
        this.showTimeoutErrorNotification(errorInfo);
    }

    processError(error, additionalInfo = {}) {
        const errorId = this.generateErrorId();
        const timestamp = new Date();
        
        const errorInfo = {
            id: errorId,
            timestamp: timestamp,
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...additionalInfo
        };

        // اضافه کردن اطلاعات محیطی
        errorInfo.environment = this.getEnvironmentInfo();
        errorInfo.userInfo = this.getUserInfo();
        
        // شمارش خطاها
        this.incrementErrorCount(error.name);
        
        return errorInfo;
    }

    logError(errorInfo) {
        // اضافه کردن به تاریخچه خطاها
        this.errors.unshift(errorInfo);
        
        // حفظ اندازه معقول آرایه
        if (this.errors.length > this.config.maxErrors) {
            this.errors = this.errors.slice(0, this.config.maxErrors);
        }

        // لاگ کردن به کنسول
        if (this.config.logToConsole) {
            this.consoleLogError(errorInfo);
        }

        // ارسال به سرور (در صورت فعال بودن)
        if (this.config.autoReport) {
            this.reportToServer(errorInfo);
        }

        // ذخیره در localStorage برای دیباگ
        this.saveToStorage(errorInfo);
    }

    consoleLogError(errorInfo) {
        const styles = {
            error: 'color: #dc3545; font-weight: bold;',
            info: 'color: #6c757d;',
            highlight: 'color: #ffc107;'
        };

        console.group(`🚨 خطا: ${errorInfo.name}`);
        console.log(`%cپیام: ${errorInfo.message}`, styles.error);
        console.log(`%cزمان: ${errorInfo.timestamp.toLocaleString('fa-IR')}`, styles.info);
        console.log(`%cنوع: ${errorInfo.type}`, styles.info);
        
        if (errorInfo.context) {
            console.log(`%cکانتکست: ${errorInfo.context}`, styles.highlight);
        }
        
        if (errorInfo.stack) {
            console.log('Stack Trace:', errorInfo.stack);
        }
        
        console.groupEnd();
    }

    notifyUser(errorInfo) {
        if (!this.config.showUserFriendlyMessages) return;

        const userMessage = errorInfo.userMessage || this.getUserFriendlyMessage(errorInfo);
        
        this.showUserNotification(userMessage, errorInfo.severity || 'MEDIUM');
    }

    getUserFriendlyMessage(errorInfo) {
        const messages = {
            'GLOBAL_ERROR': 'خطای غیرمنتظره‌ای رخ داده است. صفحه را رفرش کنید.',
            'PROMISE_REJECTION': 'خطا در پردازش درخواست. لطفاً مجدداً تلاش کنید.',
            'NETWORK_ERROR': 'خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کنید.',
            'API_ERROR': 'خطا در دریافت اطلاعات از سرور.',
            'AUTH_ERROR': 'خطا در احراز هویت. لطفاً مجدداً وارد شوید.',
            'VALIDATION_ERROR': 'خطا در اعتبارسنجی داده‌ها.',
            'TIMEOUT_ERROR': 'زمان درخواست به پایان رسید.',
            'DEFAULT': 'خطایی رخ داده است. لطفاً مجدداً تلاش کنید.'
        };

        return messages[errorInfo.type] || messages.DEFAULT;
    }

    showUserNotification(message, severity = 'MEDIUM') {
        const notification = document.createElement('div');
        notification.className = `error-notification error-${severity.toLowerCase()}`;
        
        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // استایل‌های داینامیک
        const styles = {
            LOW: { background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' },
            MEDIUM: { background: '#fff3cd', color: '#856404', border: '1px solid #ffeaa7' },
            HIGH: { background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }
        };

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '10000',
            maxWidth: '400px',
            fontFamily: 'Tahoma, sans-serif',
            fontSize: '14px',
            ...styles[severity]
        });

        document.body.appendChild(notification);

        // حذف خودکار پس از 5 ثانیه
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showNetworkErrorNotification(errorInfo) {
        this.showUserNotification(
            'اتصال اینترنت خود را بررسی کنید. سیستم در حال تلاش برای اتصال مجدد است...',
            'HIGH'
        );
    }

    showAPIErrorNotification(errorInfo) {
        this.showUserNotification(
            'خطا در دریافت اطلاعات از سرور. لطفاً چند لحظه دیگر تلاش کنید.',
            'MEDIUM'
        );
    }

    showAuthErrorNotification(errorInfo) {
        this.showUserNotification(
            'احراز هویت ناموفق بود. لطفاً مجدداً وارد شوید.',
            'HIGH'
        );
    }

    showValidationErrorNotification(errorInfo) {
        this.showUserNotification(
            'خطا در اطلاعات ورودی. لطفاً مقادیر را بررسی کنید.',
            'LOW'
        );
    }

    showTimeoutErrorNotification(errorInfo) {
        this.showUserNotification(
            'زمان درخواست به پایان رسید. لطفاً مجدداً تلاش کنید.',
            'MEDIUM'
        );
    }

    generateErrorId() {
        return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getEnvironmentInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            url: window.location.href,
            timestamp: new Date().toISOString(),
            screen: {
                width: screen.width,
                height: screen.height
            },
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        };
    }

    getUserInfo() {
        // این اطلاعات باید از سیستم مدیریت کاربران گرفته شود
        return {
            userId: 'anonymous', // باید از auth system پر شود
            sessionId: this.getSessionId(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    getSessionId() {
        let sessionId = sessionStorage.getItem('error_session_id');
        if (!sessionId) {
            sessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('error_session_id', sessionId);
        }
        return sessionId;
    }

    incrementErrorCount(errorName) {
        const currentCount = this.errorCounts.get(errorName) || 0;
        this.errorCounts.set(errorName, currentCount + 1);
    }

    async reportToServer(errorInfo) {
        try {
            const response = await fetch('/api/errors/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(errorInfo)
            });

            if (!response.ok) {
                console.warn('Failed to report error to server:', response.status);
            }
        } catch (reportError) {
            console.warn('Error reporting failed:', reportError);
        }
    }

    saveToStorage(errorInfo) {
        try {
            const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
            storedErrors.unshift({
                id: errorInfo.id,
                timestamp: errorInfo.timestamp,
                type: errorInfo.type,
                message: errorInfo.message
            });

            // حفظ فقط 50 خطای آخر
            if (storedErrors.length > 50) {
                storedErrors.splice(50);
            }

            localStorage.setItem('app_errors', JSON.stringify(storedErrors));
        } catch (storageError) {
            console.warn('Failed to save error to storage:', storageError);
        }
    }

    // متدهای بازیابی و مدیریت خطاها
    getRecentErrors(limit = 10) {
        return this.errors.slice(0, limit);
    }

    getErrorCounts() {
        return Object.fromEntries(this.errorCounts);
    }

    getErrorStats() {
        const totalErrors = this.errors.length;
        const errorTypes = {};
        
        this.errors.forEach(error => {
            errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
        });

        return {
            totalErrors,
            errorTypes,
            firstError: this.errors[this.errors.length - 1]?.timestamp,
            lastError: this.errors[0]?.timestamp
        };
    }

    clearErrors() {
        this.errors = [];
        this.errorCounts.clear();
        localStorage.removeItem('app_errors');
    }

    ignoreError(errorPattern) {
        this.ignoredErrors.add(errorPattern);
    }

    isErrorIgnored(errorInfo) {
        for (const pattern of this.ignoredErrors) {
            if (errorInfo.message.includes(pattern) || errorInfo.name.includes(pattern)) {
                return true;
            }
        }
        return false;
    }

    // متدهای کمکی برای مدیریت خطاها در عملیات‌های خاص
    async executeWithRetry(operation, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                this.handleRetryError(error, attempt, maxRetries);
                
                if (attempt < maxRetries) {
                    await this.delay(delay * Math.pow(2, attempt - 1)); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    }

    handleRetryError(error, attempt, maxRetries) {
        const errorInfo = this.processError(error, {
            type: 'RETRY_ERROR',
            attempt,
            maxRetries
        });

        this.logError(errorInfo);
        
        if (this.config.logToConsole) {
            console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
        }
    }

    async executeWithFallback(primaryOperation, fallbackOperation, context = '') {
        try {
            return await primaryOperation();
        } catch (error) {
            this.handleFallbackError(error, context);
            
            try {
                console.warn(`Using fallback for ${context}`);
                return await fallbackOperation();
            } catch (fallbackError) {
                this.handleFallbackFailure(fallbackError, context);
                throw fallbackError;
            }
        }
    }

    handleFallbackError(error, context) {
        const errorInfo = this.processError(error, {
            type: 'FALLBACK_TRIGGERED',
            context,
            severity: 'MEDIUM'
        });

        this.logError(errorInfo);
    }

    handleFallbackFailure(error, context) {
        const errorInfo = this.processError(error, {
            type: 'FALLBACK_FAILED',
            context,
            severity: 'HIGH',
            userMessage: 'سیستم قادر به انجام عملیات نیست. لطفاً با پشتیبانی تماس بگیرید.'
        });

        this.logError(errorInfo);
        this.notifyUser(errorInfo);
    }

    // utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // متدهای دیباگ و توسعه
    enableDebugMode() {
        this.config.logToConsole = true;
        console.log('🔧 Error Manager Debug Mode Enabled');
    }

    disableDebugMode() {
        this.config.logToConsole = false;
    }

    getErrorReport() {
        return {
            stats: this.getErrorStats(),
            recentErrors: this.getRecentErrors(10),
            environment: this.getEnvironmentInfo()
        };
    }

    // متد برای تست و شبیه‌سازی خطا
    simulateError(errorType = 'TEST_ERROR', message = 'This is a test error') {
        const testError = new Error(message);
        testError.name = errorType;

        switch (errorType) {
            case 'NETWORK_ERROR':
                this.handleNetworkError(testError, 'TEST');
                break;
            case 'API_ERROR':
                this.handleAPIError(testError, 'TEST');
                break;
            case 'AUTH_ERROR':
                this.handleAuthError(testError, 'TEST');
                break;
            default:
                this.handleGlobalError(testError, 'test.js', 1, 1);
        }
    }
}

// ایجاد instance جهانی
const errorManager = new ErrorManager();

// export برای استفاده در ماژول‌های دیگر
export default errorManager;
export { ErrorManager };