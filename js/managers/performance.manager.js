class PerformanceManager {
    constructor(config = {}) {
        this.config = {
            monitoringEnabled: true,
            sampleRate: 1000, // میلی‌ثانیه
            maxMetrics: 1000,
            alertThresholds: {
                memory: 0.8, // 80% استفاده از memory
                cpu: 0.7,    // 70% استفاده از CPU
                fps: 30,     // 30 FPS حداقل
                loadTime: 3000 // 3 ثانیه
            },
            ...config
        };
        
        this.metrics = {
            timing: new Map(),
            memory: new Map(),
            network: new Map(),
            rendering: new Map(),
            business: new Map()
        };
        
        this.observers = [];
        this.alerts = [];
        this.isMonitoring = false;
        
        this.init();
    }

    init() {
        if (!this.config.monitoringEnabled) return;
        
        this.setupPerformanceObservers();
        this.startContinuousMonitoring();
        this.setupUserTiming();
    }

    setupPerformanceObservers() {
        // Observer برای اندازه‌گیری عملکرد
        if ('PerformanceObserver' in window) {
            // اندازه‌گیری زمان لود منابع
            this.resourceObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.recordResourceTiming(entry);
                });
            });
            this.resourceObserver.observe({ entryTypes: ['resource'] });

            // اندازه‌گیری paint timing
            this.paintObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.recordPaintTiming(entry);
                });
            });
            this.paintObserver.observe({ entryTypes: ['paint'] });

            // اندازه‌گیری largest contentful paint
            this.lcpObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.recordLCP(entry);
                });
            });
            this.lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // اندازه‌گیری first input delay
            this.fidObserver = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    this.recordFID(entry);
                });
            });
            this.fidObserver.observe({ entryTypes: ['first-input'] });
        }
    }

    startContinuousMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectPerformanceMetrics();
        }, this.config.sampleRate);

        // ثبت metrics اولیه
        this.recordInitialLoad();
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.isMonitoring = false;
        }
    }

    setupUserTiming() {
        // ایجاد mark و measure های سفارشی
        performance.mark('app-init-start');
        
        // زمانی که app لود شد
        window.addEventListener('load', () => {
            performance.mark('app-load-complete');
            performance.measure('app-load-time', 'app-init-start', 'app-load-complete');
        });
    }

    collectPerformanceMetrics() {
        this.measureMemoryUsage();
        this.measureCPULoad();
        this.measureFPS();
        this.measureNetworkStatus();
        this.checkAlertConditions();
    }

    measureMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            const usage = {
                used: memory.usedJSHeapSize,
                total: memory.totalJSHeapSize,
                limit: memory.jsHeapSizeLimit,
                percentage: memory.usedJSHeapSize / memory.jsHeapSizeLimit
            };
            
            this.recordMetric('memory', 'heap-usage', usage);
            
            if (usage.percentage > this.config.alertThresholds.memory) {
                this.triggerAlert('HIGH_MEMORY_USAGE', {
                    percentage: (usage.percentage * 100).toFixed(1),
                    used: this.formatBytes(usage.used),
                    limit: this.formatBytes(usage.limit)
                });
            }
        }
    }

    measureCPULoad() {
        // شبیه‌سازی اندازه‌گیری بار CPU
        // در مرورگرهای مدرن این امکان محدود است
        const load = this.estimateCPULoad();
        this.recordMetric('system', 'cpu-load', load);
        
        if (load > this.config.alertThresholds.cpu) {
            this.triggerAlert('HIGH_CPU_LOAD', {
                load: (load * 100).toFixed(1)
            });
        }
    }

    estimateCPULoad() {
        // یک تخمین ساده از بار CPU
        const now = performance.now();
        let load = 0.1; // حداقل بار
        
        // افزایش بار بر اساس تعداد درخواست‌های همزمان
        const activeRequests = this.getActiveRequestCount();
        load += activeRequests * 0.05;
        
        // افزایش بار بر اساس پیچیدگی DOM
        const domComplexity = this.measureDOMComplexity();
        load += domComplexity * 0.02;
        
        return Math.min(1, load);
    }

    measureFPS() {
        let fps = 60;
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFrame = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                frameCount = 0;
                lastTime = currentTime;
                
                this.recordMetric('rendering', 'fps', fps);
                
                if (fps < this.config.alertThresholds.fps) {
                    this.triggerAlert('LOW_FPS', { fps });
                }
            }
            
            requestAnimationFrame(measureFrame);
        };
        
        requestAnimationFrame(measureFrame);
    }

    measureNetworkStatus() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            const networkInfo = {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
            
            this.recordMetric('network', 'connection', networkInfo);
        }
    }

    recordInitialLoad() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            const loadMetrics = {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
                tcpConnect: navigation.connectEnd - navigation.connectStart,
                request: navigation.responseEnd - navigation.requestStart,
                total: navigation.loadEventEnd - navigation.navigationStart
            };
            
            this.recordMetric('timing', 'page-load', loadMetrics);
            
            if (loadMetrics.total > this.config.alertThresholds.loadTime) {
                this.triggerAlert('SLOW_LOAD_TIME', {
                    time: loadMetrics.total,
                    threshold: this.config.alertThresholds.loadTime
                });
            }
        }
    }

    recordResourceTiming(entry) {
        const resourceInfo = {
            name: entry.name,
            duration: entry.duration,
            size: entry.encodedBodySize || 0,
            type: entry.initiatorType,
            startTime: entry.startTime
        };
        
        this.recordMetric('network', 'resource', resourceInfo);
    }

    recordPaintTiming(entry) {
        const paintInfo = {
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration
        };
        
        this.recordMetric('rendering', 'paint', paintInfo);
    }

    recordLCP(entry) {
        const lcpInfo = {
            element: entry.element?.tagName || 'unknown',
            url: entry.url || '',
            startTime: entry.startTime,
            size: entry.size,
            loadTime: entry.loadTime || 0
        };
        
        this.recordMetric('rendering', 'lcp', lcpInfo);
        
        // LCP باید زیر 2.5 ثانیه باشد
        if (entry.startTime > 2500) {
            this.triggerAlert('POOR_LCP', {
                time: entry.startTime,
                element: lcpInfo.element
            });
        }
    }

    recordFID(entry) {
        const fidInfo = {
            name: entry.name,
            startTime: entry.startTime,
            processingStart: entry.processingStart,
            processingEnd: entry.processingEnd,
            duration: entry.duration
        };
        
        this.recordMetric('rendering', 'fid', fidInfo);
        
        // FID باید زیر 100ms باشد
        if (entry.duration > 100) {
            this.triggerAlert('POOR_FID', {
                duration: entry.duration,
                interaction: entry.name
            });
        }
    }

    recordMetric(category, name, value) {
        if (!this.metrics[category]) {
            this.metrics[category] = new Map();
        }
        
        const timestamp = Date.now();
        const metricData = {
            value,
            timestamp,
            category,
            name
        };
        
        this.metrics[category].set(`${name}_${timestamp}`, metricData);
        
        // حفظ اندازه معقول
        if (this.metrics[category].size > this.config.maxMetrics) {
            const firstKey = this.metrics[category].keys().next().value;
            this.metrics[category].delete(firstKey);
        }
        
        // اطلاع‌رسانی به observers
        this.notifyObservers(metricData);
    }

    recordBusinessMetric(name, value, tags = {}) {
        const metricData = {
            name,
            value,
            tags,
            timestamp: Date.now(),
            category: 'business'
        };
        
        this.recordMetric('business', name, metricData);
    }

    // مدیریت Observers
    addObserver(observer) {
        this.observers.push(observer);
    }

    removeObserver(observer) {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    notifyObservers(metricData) {
        this.observers.forEach(observer => {
            try {
                observer(metricData);
            } catch (error) {
                console.error('Error in performance observer:', error);
            }
        });
    }

    // سیستم هشدار
    checkAlertConditions() {
        // بررسی شرایط هشدار بر اساس metrics جمع‌آوری شده
        this.checkMemoryAlerts();
        this.checkRenderAlerts();
        this.checkNetworkAlerts();
    }

    checkMemoryAlerts() {
        const memoryMetrics = Array.from(this.metrics.memory.values());
        if (memoryMetrics.length === 0) return;
        
        const recentMemory = memoryMetrics.slice(-10); // 10 نمونه اخیر
        const avgUsage = recentMemory.reduce((sum, m) => sum + m.value.percentage, 0) / recentMemory.length;
        
        if (avgUsage > this.config.alertThresholds.memory) {
            this.triggerAlert('HIGH_MEMORY_USAGE', {
                averageUsage: (avgUsage * 100).toFixed(1),
                threshold: (this.config.alertThresholds.memory * 100).toFixed(1)
            });
        }
    }

    checkRenderAlerts() {
        const fpsMetrics = Array.from(this.metrics.rendering.values())
            .filter(m => m.name === 'fps')
            .slice(-30); // 30 نمونه اخیر
        
        if (fpsMetrics.length === 0) return;
        
        const lowFpsCount = fpsMetrics.filter(m => m.value < this.config.alertThresholds.fps).length;
        const lowFpsRatio = lowFpsCount / fpsMetrics.length;
        
        if (lowFpsRatio > 0.3) { // اگر 30% نمونه‌ها FPS پایین داشته باشند
            this.triggerAlert('PERSISTENT_LOW_FPS', {
                lowFpsRatio: (lowFpsRatio * 100).toFixed(1),
                sampleSize: fpsMetrics.length
            });
        }
    }

    checkNetworkAlerts() {
        if (!('connection' in navigator)) return;
        
        const connection = navigator.connection;
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            this.triggerAlert('POOR_NETWORK', {
                effectiveType: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt
            });
        }
    }

    triggerAlert(type, data) {
        const alert = {
            id: `ALERT_${Date.now()}`,
            type,
            severity: this.getAlertSeverity(type),
            timestamp: new Date(),
            data,
            acknowledged: false
        };
        
        this.alerts.push(alert);
        
        // حفظ اندازه معقول
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }
        
        // نمایش notification به کاربر
        this.showAlertNotification(alert);
        
        // لاگ کردن alert
        console.warn(`🚨 Performance Alert: ${type}`, data);
        
        return alert;
    }

    getAlertSeverity(alertType) {
        const severities = {
            'HIGH_MEMORY_USAGE': 'HIGH',
            'HIGH_CPU_LOAD': 'MEDIUM',
            'LOW_FPS': 'MEDIUM',
            'PERSISTENT_LOW_FPS': 'HIGH',
            'SLOW_LOAD_TIME': 'LOW',
            'POOR_LCP': 'MEDIUM',
            'POOR_FID': 'MEDIUM',
            'POOR_NETWORK': 'LOW'
        };
        
        return severities[alertType] || 'LOW';
    }

    showAlertNotification(alert) {
        if (!this.config.showAlerts) return;
        
        const notification = document.createElement('div');
        notification.className = `performance-alert alert-${alert.severity.toLowerCase()}`;
        
        const messages = {
            'HIGH_MEMORY_USAGE': '⚠️ مصرف حافظه بالا - ممکن است عملکرد کاهش یابد',
            'HIGH_CPU_LOAD': '🔧 بار پردازشی بالا - در حال بهینه‌سازی...',
            'LOW_FPS': '🎮 نرخ فریم پایین - در حال بهبود رندر...',
            'PERSISTENT_LOW_FPS': '🚨 نرخ فریم به طور مداوم پایین است',
            'SLOW_LOAD_TIME': '⏳ زمان لود صفحه طولانی است',
            'POOR_LCP': '🖼️ نمایش محتوای اصلی با تاخیر',
            'POOR_FID': '⌨️ تاخیر در پاسخ به تعامل کاربر',
            'POOR_NETWORK': '📡 اتصال شبکه ضعیف'
        };
        
        notification.innerHTML = `
            <div class="alert-content">
                <span class="alert-message">${messages[alert.type] || 'هشدار عملکرد'}</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: alert.severity === 'HIGH' ? '#f8d7da' : 
                           alert.severity === 'MEDIUM' ? '#fff3cd' : '#d1ecf1',
            color: alert.severity === 'HIGH' ? '#721c24' : 
                  alert.severity === 'MEDIUM' ? '#856404' : '#0c5460',
            border: `1px solid ${alert.severity === 'HIGH' ? '#f5c6cb' : 
                    alert.severity === 'MEDIUM' ? '#ffeaa7' : '#bee5eb'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: '10000',
            fontFamily: 'Tahoma, sans-serif',
            fontSize: '13px'
        });
        
        document.body.appendChild(notification);
        
        // حذف خودکار پس از 5 ثانیه
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // متدهای گزارش‌گیری و آنالیز
    getPerformanceReport() {
        return {
            summary: this.getPerformanceSummary(),
            metrics: this.getAggregatedMetrics(),
            alerts: this.getRecentAlerts(),
            recommendations: this.generateRecommendations()
        };
    }

    getPerformanceSummary() {
        const navigation = performance.getEntriesByType('navigation')[0];
        const resources = performance.getEntriesByType('resource');
        
        return {
            loadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
            resourceCount: resources.length,
            totalResourceSize: resources.reduce((sum, r) => sum + (r.encodedBodySize || 0), 0),
            averageFPS: this.calculateAverageFPS(),
            memoryUsage: this.getAverageMemoryUsage(),
            userTimings: this.getUserTimings()
        };
    }

    calculateAverageFPS() {
        const fpsMetrics = Array.from(this.metrics.rendering.values())
            .filter(m => m.name === 'fps')
            .map(m => m.value);
        
        return fpsMetrics.length > 0 ? 
            fpsMetrics.reduce((sum, fps) => sum + fps, 0) / fpsMetrics.length : 60;
    }

    getAverageMemoryUsage() {
        const memoryMetrics = Array.from(this.metrics.memory.values())
            .map(m => m.value.percentage);
        
        return memoryMetrics.length > 0 ? 
            memoryMetrics.reduce((sum, usage) => sum + usage, 0) / memoryMetrics.length : 0;
    }

    getUserTimings() {
        const measures = performance.getEntriesByType('measure');
        return measures.map(measure => ({
            name: measure.name,
            duration: measure.duration,
            startTime: measure.startTime
        }));
    }

    getAggregatedMetrics() {
        const aggregated = {};
        
        for (const [category, metrics] of Object.entries(this.metrics)) {
            aggregated[category] = {};
            
            const metricsArray = Array.from(metrics.values());
            const groupedByName = this.groupBy(metricsArray, 'name');
            
            for (const [name, group] of Object.entries(groupedByName)) {
                const values = group.map(m => m.value);
                aggregated[category][name] = {
                    count: values.length,
                    average: values.reduce((sum, val) => {
                        if (typeof val === 'object' && val.percentage) {
                            return sum + val.percentage;
                        }
                        return sum + val;
                    }, 0) / values.length,
                    min: Math.min(...values),
                    max: Math.max(...values),
                    recent: values.slice(-5)
                };
            }
        }
        
        return aggregated;
    }

    getRecentAlerts(limit = 10) {
        return this.alerts.slice(-limit).reverse();
    }

    generateRecommendations() {
        const recommendations = [];
        const metrics = this.getAggregatedMetrics();
        
        // توصیه‌های مبتنی بر memory
        if (metrics.memory?.['heap-usage']?.average > 0.7) {
            recommendations.push({
                type: 'MEMORY_OPTIMIZATION',
                priority: 'HIGH',
                description: 'مصرف حافظه بالا است. تصاویر و داده‌های کش شده را بررسی کنید.',
                action: 'بهینه‌سازی مدیریت حافظه و پاک‌سازی دوره‌ای'
            });
        }
        
        // توصیه‌های مبتنی بر FPS
        if (metrics.rendering?.['fps']?.average < 45) {
            recommendations.push({
                type: 'RENDERING_OPTIMIZATION',
                priority: 'MEDIUM',
                description: 'نرخ فریم پایین است. عملیات‌های سنگین رندر را بهینه کنید.',
                action: 'استفاده از requestAnimationFrame و بهینه‌سازی انیمیشن‌ها'
            });
        }
        
        // توصیه‌های مبتنی بر لود تایم
        const loadTime = this.getPerformanceSummary().loadTime;
        if (loadTime > 3000) {
            recommendations.push({
                type: 'LOAD_TIME_OPTIMIZATION',
                priority: 'HIGH',
                description: 'زمان لود صفحه طولانی است.',
                action: 'فشرده‌سازی منابع، lazy loading و بهینه‌سازی کش'
            });
        }
        
        return recommendations;
    }

    // utility methods
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const val = item[key];
            groups[val] = groups[val] || [];
            groups[val].push(item);
            return groups;
        }, {});
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getActiveRequestCount() {
        // شبیه‌سازی شمارش درخواست‌های فعال
        return Math.floor(Math.random() * 5);
    }

    measureDOMComplexity() {
        const elementCount = document.querySelectorAll('*').length;
        return Math.min(1, elementCount / 1000); // نرمال‌سازی
    }

    // متدهای مدیریت چرخه حیات
    start() {
        this.startContinuousMonitoring();
    }

    stop() {
        this.stopMonitoring();
    }

    reset() {
        this.metrics = {
            timing: new Map(),
            memory: new Map(),
            network: new Map(),
            rendering: new Map(),
            business: new Map()
        };
        this.alerts = [];
    }

    // متدهای توسعه و دیباگ
    enableVerboseLogging() {
        this.verbose = true;
        console.log('📊 Performance Manager Verbose Logging Enabled');
    }

    simulateLoad() {
        // شبیه‌سازی بار سنگین برای تست
        const heavyOperation = () => {
            let result = 0;
            for (let i = 0; i < 1000000; i++) {
                result += Math.sqrt(i) * Math.sin(i);
            }
            return result;
        };
        
        // اجرای چندین بار برای ایجاد بار
        for (let i = 0; i < 5; i++) {
            setTimeout(() => heavyOperation(), i * 100);
        }
        
        this.triggerAlert('SIMULATED_LOAD', { operations: 5 });
    }
}

// ایجاد instance جهانی
const performanceManager = new PerformanceManager();

// export برای استفاده در ماژول‌های دیگر
export default performanceManager;
export { PerformanceManager };