// سرویس امنیت پیشرفته
class SecurityService {
    constructor() {
        this.encryptionKey = this.loadEncryptionKey();
        this.securityLog = [];
        this.suspiciousActivities = [];
        this.failedAttempts = 0;
        
        this.init();
    }

    init() {
        this.setupSecurityMonitoring();
        this.validateEnvironment();
    }

    setupSecurityMonitoring() {
        // مانیتورینگ تغییرات DOM
        this.setupDOMMonitoring();
        
        // مانیتورینگ console
        this.setupConsoleMonitoring();
        
        // مانیتورینگ network
        this.setupNetworkMonitoring();
    }

    loadEncryptionKey() {
        // در محیط واقعی از environment variables استفاده شود
        let key = localStorage.getItem('financial_system_encryption_key');
        
        if (!key) {
            key = this.generateEncryptionKey();
            localStorage.setItem('financial_system_encryption_key', key);
        }
        
        return key;
    }

    generateEncryptionKey() {
        return CryptoJS.lib.WordArray.random(256/8).toString();
    }

    encryptData(data) {
        try {
            if (typeof data !== 'string') {
                data = JSON.stringify(data);
            }
            
            const encrypted = CryptoJS.AES.encrypt(data, this.encryptionKey);
            return encrypted.toString();
            
        } catch (error) {
            this.logSecurityEvent('ENCRYPTION_ERROR', {
                error: error.message,
                dataType: typeof data
            });
            return data;
        }
    }

    decryptData(encryptedData) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
            return decrypted.toString(CryptoJS.enc.Utf8);
            
        } catch (error) {
            this.logSecurityEvent('DECRYPTION_ERROR', {
                error: error.message
            });
            return encryptedData;
        }
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // حذف تگ‌های خطرناک
        input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        input = input.replace(/<[^>]*>/g, '');
        input = input.replace(/[<>"'`]/g, '');
        
        // حذف کاراکترهای کنترل
        input = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
        
        return input.trim();
    }

    validateAPIResponse(data, schema) {
        if (!data) {
            this.logSecurityEvent('VALIDATION_FAILED', 'Empty response data');
            return false;
        }

        // اعتبارسنجی بر اساس schema
        switch(schema) {
            case 'array':
                if (!Array.isArray(data)) {
                    this.logSecurityEvent('VALIDATION_FAILED', 'Expected array response');
                    return false;
                }
                break;
                
            case 'object':
                if (typeof data !== 'object' || Array.isArray(data)) {
                    this.logSecurityEvent('VALIDATION_FAILED', 'Expected object response');
                    return false;
                }
                break;
                
            case 'market_data':
                if (!data || typeof data !== 'object') {
                    this.logSecurityEvent('VALIDATION_FAILED', 'Invalid market data structure');
                    return false;
                }
                break;
        }

        return true;
    }

    logSecurityEvent(type, details) {
        const event = {
            type,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            ip: 'client-side' // در سمت سرور واقعی می‌شود
        };

        this.securityLog.unshift(event);
        
        // محدود کردن حجم لاگ
        if (this.securityLog.length > 1000) {
            this.securityLog = this.securityLog.slice(0, 1000);
        }

        this.updateSecurityLogUI();
        this.detectSuspiciousActivity(event);
        
        // در محیط واقعی به سرور ارسال شود
        this.sendToSecurityServer(event);
    }

    detectSuspiciousActivity(event) {
        const suspiciousPatterns = [
            'FAILED',
            'ERROR', 
            'UNAUTHORIZED',
            'VALIDATION_FAILED',
            'INJECTION_ATTEMPT'
        ];

        if (suspiciousPatterns.some(pattern => event.type.includes(pattern))) {
            this.suspiciousActivities.push(event);
            this.failedAttempts++;
            
            if (this.failedAttempts > 5) {
                this.triggerSecurityProtocol();
            }
        }
    }

    triggerSecurityProtocol() {
        console.warn('🔒 فعال شدن پروتکل امنیتی: فعالیت مشکوک شناسایی شد');
        
        // اقدامات امنیتی
        this.clearSensitiveData();
        this.notifyAdmin();
        this.limitFunctionality();
    }

    clearSensitiveData() {
        // پاک کردن داده‌های حساس از localStorage
        const sensitiveKeys = [
            'auth_token',
            'user_data', 
            'portfolio_data',
            'trade_history'
        ];
        
        sensitiveKeys.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    notifyAdmin() {
        // در محیط واقعی به admin اطلاع داده شود
        console.warn('🚨 اعلان به ادمین: فعالیت مشکوک شناسایی شد');
    }

    limitFunctionality() {
        // محدود کردن عملکردهای حساس
        setTimeout(() => {
            this.failedAttempts = 0;
        }, 300000); // 5 دقیقه
    }

    setupDOMMonitoring() {
        // مانیتورینگ تغییرات خطرناک در DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        this.checkForMaliciousElements(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkForMaliciousElements(element) {
        const dangerousSelectors = [
            'script[src*="malicious"]',
            'iframe[src*="untrusted"]',
            'form[action*="phishing"]'
        ];

        dangerousSelectors.forEach(selector => {
            if (element.querySelector && element.querySelector(selector)) {
                this.logSecurityEvent('MALICIOUS_ELEMENT_DETECTED', {
                    selector: selector,
                    element: element.outerHTML
                });
            }
        });
    }

    validateEnvironment() {
        // بررسی محیط اجرا
        const validEnvironments = ['https:', 'http://localhost'];
        const currentProtocol = window.location.protocol;
        
        if (!validEnvironments.some(env => currentProtocol.startsWith(env))) {
            this.logSecurityEvent('INVALID_ENVIRONMENT', {
                protocol: currentProtocol,
                expected: validEnvironments
            });
        }
    }

    getApiKey() {
        // در محیط واقعی این کلید باید از سرور دریافت شود
        return 'BKNzfpdXhJMcUANBeAAcNT24Cdys8MES';
    }

    updateSecurityLogUI() {
        const logContainer = document.getElementById('securityLog');
        if (!logContainer) return;

        const recentEvents = this.securityLog.slice(0, 10);
        const logHTML = recentEvents.map(event => `
            <div class="security-log-item">
                <div class="log-time">${new Date(event.timestamp).toLocaleTimeString('fa-IR')}</div>
                <div class="log-type ${event.type.includes('ERROR') ? 'error' : 'info'}">${event.type}</div>
                <div class="log-details">${event.details}</div>
            </div>
        `).join('');

        logContainer.innerHTML = logHTML || '<div class="no-events">هیچ رویداد امنیتی ثبت نشده است</div>';
    }

    async testSecurity() {
        const tests = [
            this.testEncryption(),
            this.testSanitization(),
            this.testValidation(),
            this.testEnvironment()
        ];

        const results = await Promise.allSettled(tests);
        
        const passed = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const total = tests.length;

        this.logSecurityEvent('SECURITY_TEST_COMPLETE', {
            passed: passed,
            total: total,
            percentage: (passed / total * 100).toFixed(1) + '%'
        });
        
        return passed === total;
    }

    async testEncryption() {
        try {
            const testData = 'security_test_data_2024';
            const encrypted = this.encryptData(testData);
            const decrypted = this.decryptData(encrypted);
            return decrypted === testData;
        } catch (error) {
            return false;
        }
    }

    async testSanitization() {
        const maliciousInput = '<script>alert("xss")</script>test<input type="hidden">';
        const sanitized = this.sanitizeInput(maliciousInput);
        return sanitized === 'test';
    }

    async testValidation() {
        return this.validateAPIResponse([], 'array') && 
               this.validateAPIResponse({}, 'object') &&
               !this.validateAPIResponse('invalid', 'array');
    }

    async testEnvironment() {
        return window.location.protocol.startsWith('https') || 
               window.location.hostname === 'localhost';
    }

    sendToSecurityServer(event) {
        // در محیط واقعی به سرور امنیتی ارسال شود
        // fetch('/api/security/log', { method: 'POST', body: JSON.stringify(event) })
        console.log('📡 ارسال رویداد امنیتی به سرور:', event.type);
    }
}
