// فایل اصلی برنامه - نقطه ورود برنامه
import ErrorManager from './managers/error.manager.js';
import PerformanceManager from './managers/performance.manager.js';
import UIManager from './managers/ui.manager.js';
import DataManager from './managers/data.manager.js';
import StorageService from './services/storage.service.js';
import SecurityService from './services/security.service.js';
import APIService from './services/api.service.js';

class FinancialAnalysisApp {
    constructor(config = {}) {
        if (FinancialAnalysisApp.instance) {
            return FinancialAnalysisApp.instance;
        }
        FinancialAnalysisApp.instance = this;

        this.config = {
            appName: 'سیستم جامع تحلیل بازارهای مالی',
            version: '1.0.0',
            environment: this.getEnvironment(),
            debug: false,
            ...config
        };

        this.managers = {};
        this.services = {};
        this.modules = new Map();
        this.state = {
            isInitialized: false,
            isAuthenticated: false,
            currentView: 'dashboard',
            loading: false,
            errors: [],
            performance: {}
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
            console.log(`🚀 راه‌اندازی ${this.config.appName} v${this.config.version}`);

            // مقداردهی اولیه سرویس‌ها
            await this.initializeServices();

            // مقداردهی اولیه مدیران
            await this.initializeManagers();

            // راه‌اندازی ماژول‌ها
            await this.initializeModules();

            // راه‌اندازی رابط کاربری
            await this.initializeUI();

            // شروع مانیتورینگ
            this.startMonitoring();

            this.state.isInitialized = true;
            
            console.log('✅ برنامه با موفقیت راه‌اندازی شد');
            this.emit('app:initialized', this.state);

        } catch (error) {
            console.error('❌ خطا در راه‌اندازی برنامه:', error);
            this.handleCriticalError(error);
        }
    }

    async initializeServices() {
        console.log('🔧 در حال راه‌اندازی سرویس‌ها...');

        this.services = {
            storage: new StorageService(),
            security: new SecurityService(),
            api: new APIService(),
            error: new ErrorManager(),
            performance: new PerformanceManager()
        };

        // منتظر ماندن برای راه‌اندازی سرویس‌های حیاتی
        await Promise.all([
            this.services.storage.init(),
            this.services.security.init(),
            this.services.api.init()
        ]);

        console.log('✅ سرویس‌ها راه‌اندازی شدند');
    }

    async initializeManagers() {
        console.log('👨‍💼 در حال راه‌اندازی مدیران...');

        this.managers = {
            ui: new UIManager(),
            data: new DataManager(),
            error: this.services.error,
            performance: this.services.performance
        };

        // پیکربندی مدیران
        await this.managers.ui.init();
        await this.managers.data.init();

        console.log('✅ مدیران راه‌اندازی شدند');
    }

    async initializeModules() {
        console.log('📦 در حال راه‌اندازی ماژول‌ها...');

        const moduleConfigs = {
            'market-analysis': {
                enabled: true,
                config: { /* تنظیمات خاص ماژول */ }
            },
            'portfolio-management': {
                enabled: true,
                config: { /* تنظیمات خاص ماژول */ }
            },
            'risk-assessment': {
                enabled: true,
                config: { /* تنظیمات خاص ماژول */ }
            },
            'trading-engine': {
                enabled: true,
                config: { /* تنظیمات خاص ماژول */ }
            },
            'reporting': {
                enabled: true,
                config: { /* تنظیمات خاص ماژول */ }
            }
        };

        for (const [moduleName, config] of Object.entries(moduleConfigs)) {
            if (config.enabled) {
                try {
                    const module = await this.loadModule(moduleName, config);
                    this.modules.set(moduleName, module);
                    console.log(`✅ ماژول ${moduleName} راه‌اندازی شد`);
                } catch (error) {
                    console.error(`❌ خطا در راه‌اندازی ماژول ${moduleName}:`, error);
                }
            }
        }

        console.log(`✅ ${this.modules.size} ماژول راه‌اندازی شدند`);
    }

    async loadModule(moduleName, config) {
        // dynamic import ماژول
        const module = await import(`./modules/${moduleName}.js`);
        return new module.default(config);
    }

    async initializeUI() {
        console.log('🎨 در حال راه‌اندازی رابط کاربری...');

        // راه‌اندازی کامپوننت‌های اصلی UI
        await this.managers.ui.initializeCoreComponents();

        // ثبت event listeners
        this.setupGlobalEventListeners();

        // راه‌اندازی routing
        this.setupRouting();

        // نمایش صفحه اصلی
        await this.showView('dashboard');

        console.log('✅ رابط کاربری راه‌اندازی شد');
    }

    setupGlobalEventListeners() {
        // هندلرهای جهانی
        window.addEventListener('online', () => this.handleOnlineStatus());
        window.addEventListener('offline', () => this.handleOfflineStatus());
        window.addEventListener('resize', () => this.handleResize());
        
        // هندلرهای کلیدهای میانبر
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupRouting() {
        // مدیریت routing سمت کلاینت
        window.addEventListener('hashchange', () => {
            const view = window.location.hash.replace('#', '') || 'dashboard';
            this.showView(view);
        });
    }

    startMonitoring() {
        // شروع مانیتورینگ عملکرد
        this.managers.performance.start();

        // مانیتورینگ خطاها
        this.managers.error.addObserver((errorInfo) => {
            this.handleError(errorInfo);
        });

        // مانیتورینگ عملکرد
        this.managers.performance.addObserver((metric) => {
            this.handlePerformanceMetric(metric);
        });

        console.log('📊 سیستم‌های مانیتورینگ فعال شدند');
    }

    // ==================== Core Application Methods ====================

    async showView(viewName, params = {}) {
        if (this.state.currentView === viewName) return;

        try {
            this.setState({ loading: true, currentView: viewName });
            
            // اطلاع‌رسانی به ماژول‌ها درباره تغییر view
            this.modules.forEach(module => {
                if (module.onViewChange) {
                    module.onViewChange(viewName, params);
                }
            });

            // بارگذاری view
            await this.managers.ui.showView(viewName, params);
            
            // به‌روزرسانی URL
            window.location.hash = viewName;

            this.setState({ loading: false });
            
            this.emit('view:changed', { view: viewName, params });

        } catch (error) {
            console.error(`Error showing view ${viewName}:`, error);
            this.managers.error.handleError(error, `VIEW_${viewName.toUpperCase()}`);
            this.setState({ loading: false });
        }
    }

    async executeModuleAction(moduleName, action, ...args) {
        const module = this.modules.get(moduleName);
        if (!module) {
            throw new Error(`Module ${moduleName} not found`);
        }

        if (typeof module[action] !== 'function') {
            throw new Error(`Action ${action} not found in module ${moduleName}`);
        }

        try {
            this.setState({ loading: true });
            const result = await module[action](...args);
            this.setState({ loading: false });
            return result;
        } catch (error) {
            this.setState({ loading: false });
            this.managers.error.handleError(error, `MODULE_${moduleName.toUpperCase()}_${action.toUpperCase()}`);
            throw error;
        }
    }

    // ==================== State Management ====================

    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        
        // اطلاع‌رسانی به کامپوننت‌های علاقه‌مند
        this.emit('state:changed', {
            oldState,
            newState: this.state,
            changes: this.getStateChanges(oldState, this.state)
        });
    }

    getStateChanges(oldState, newState) {
        const changes = {};
        for (const key in newState) {
            if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
                changes[key] = {
                    from: oldState[key],
                    to: newState[key]
                };
            }
        }
        return changes;
    }

    getState() {
        return { ...this.state };
    }

    // ==================== Event Handling ====================

    handleOnlineStatus() {
        console.log('🌐 دستگاه آنلاین شد');
        this.emit('network:online');
        
        // سینک داده‌های آفلاین
        this.syncOfflineData();
    }

    handleOfflineStatus() {
        console.log('📴 دستگاه آفلاین شد');
        this.emit('network:offline');
        
        // نمایش notification
        this.managers.ui.showNotification(
            'اتصال اینترنت قطع شد. حالت آفلاین فعال است.',
            'warning'
        );
    }

    handleResize() {
        this.emit('window:resized', {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }

    handleKeyboardShortcuts(event) {
        // کلیدهای میانبر جهانی
        const shortcuts = {
            'Escape': () => this.handleEscapeKey(),
            'F1': () => this.showHelp(),
            'F5': (e) => { e.preventDefault(); this.refreshData(); },
            'Control+r': (e) => { e.preventDefault(); this.refreshData(); },
            'Control+h': () => this.showView('dashboard'),
            'Control+a': () => this.showView('analysis'),
            'Control+t': () => this.showView('trading')
        };

        const key = event.key;
        const ctrlKey = event.ctrlKey || event.metaKey;
        const shortcutKey = ctrlKey ? `Control+${key.toLowerCase()}` : key;

        if (shortcuts[shortcutKey]) {
            event.preventDefault();
            shortcuts[shortcutKey](event);
        }
    }

    handleEscapeKey() {
        // بستن modal ها یا بازگشت به view قبلی
        this.managers.ui.closeAllModals();
    }

    handleError(errorInfo) {
        // مدیریت خطاهای سطح برنامه
        this.state.errors.unshift(errorInfo);
        
        if (this.state.errors.length > 100) {
            this.state.errors = this.state.errors.slice(0, 100);
        }

        this.emit('error:occurred', errorInfo);

        // برای خطاهای بحرانی
        if (errorInfo.severity === 'CRITICAL') {
            this.handleCriticalError(errorInfo.error);
        }
    }

    handleCriticalError(error) {
        console.error('💥 خطای بحرانی:', error);
        
        // نمایش صفحه خطا
        this.managers.ui.showErrorPage(error);
        
        // گزارش به سرور
        this.services.api.reportCriticalError(error);
    }

    handlePerformanceMetric(metric) {
        // ذخیره معیارهای عملکرد
        this.state.performance[metric.name] = metric.value;
        
        // برای معیارهای خاص اقدامات خاص انجام بده
        if (metric.name === 'memory' && metric.value.percentage > 0.8) {
            this.triggerMemoryCleanup();
        }
    }

    // ==================== Data Management ====================

    async refreshData() {
        try {
            this.setState({ loading: true });
            
            // بارگذاری مجدد داده‌های همه ماژول‌ها
            const refreshPromises = Array.from(this.modules.values()).map(module => {
                if (module.refreshData) {
                    return module.refreshData();
                }
                return Promise.resolve();
            });

            await Promise.all(refreshPromises);
            
            this.managers.ui.showNotification('داده‌ها با موفقیت بروزرسانی شدند', 'success');
            this.setState({ loading: false });
            
        } catch (error) {
            this.setState({ loading: false });
            this.managers.error.handleError(error, 'DATA_REFRESH');
        }
    }

    async syncOfflineData() {
        // سینک داده‌های ذخیره شده در حالت آفلاین
        const offlineData = await this.services.storage.get('offline_data', []);
        
        if (offlineData.length > 0) {
            console.log(`🔄 سینک ${offlineData.length} آیتم آفلاین`);
            
            try {
                // ارسال داده‌های آفلاین به سرور
                await this.services.api.syncOfflineData(offlineData);
                
                // پاک‌سازی داده‌های آفلاین
                await this.services.storage.remove('offline_data');
                
                this.managers.ui.showNotification('داده‌های آفلاین با موفقیت سینک شدند', 'success');
            } catch (error) {
                console.error('خطا در سینک داده‌های آفلاین:', error);
            }
        }
    }

    triggerMemoryCleanup() {
        // پاک‌سازی حافظه و کش‌ها
        this.services.storage.cleanupExpired();
        
        // اطلاع‌رسانی به ماژول‌ها برای پاک‌سازی
        this.modules.forEach(module => {
            if (module.cleanup) {
                module.cleanup();
            }
        });

        console.log('🧹 پاک‌سازی حافظه انجام شد');
    }

    // ==================== Utility Methods ====================

    getEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('staging')) {
            return 'staging';
        } else if (hostname.includes('test')) {
            return 'testing';
        } else {
            return 'production';
        }
    }

    showHelp() {
        this.showView('help');
    }

    // ==================== Lifecycle Management ====================

    async shutdown() {
        console.log('🛑 خاموش کردن برنامه...');
        
        try {
            // توقف ماژول‌ها
            for (const [name, module] of this.modules) {
                if (module.shutdown) {
                    await module.shutdown();
                }
            }

            // توقف سرویس‌ها
            this.services.performance.stop();
            this.services.storage.stopCleanupJob();

            // ذخیره state نهایی
            await this.saveAppState();

            console.log('✅ برنامه با موفقیت خاموش شد');
            
        } catch (error) {
            console.error('❌ خطا در خاموش کردن برنامه:', error);
        }
    }

    async saveAppState() {
        const appState = {
            state: this.state,
            timestamp: new Date(),
            version: this.config.version
        };

        await this.services.storage.set('app_state', appState, {
            ttl: 7 * 24 * 60 * 60 * 1000 // 7 روز
        });
    }

    async restoreAppState() {
        try {
            const savedState = await this.services.storage.get('app_state');
            if (savedState) {
                this.state = { ...this.state, ...savedState.state };
                console.log('✅ وضعیت برنامه بازیابی شد');
            }
        } catch (error) {
            console.warn('⚠️ خطا در بازیابی وضعیت برنامه:', error);
        }
    }

    // ==================== Event System ====================

    initEventSystem() {
        this.eventHandlers = new Map();
    }

    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // ==================== Debug & Development ====================

    enableDebugMode() {
        this.config.debug = true;
        console.log('🔧 حالت دیباگ فعال شد');
        
        // فعال کردن logging پیشرفته
        this.services.error.enableDebugMode();
        this.services.performance.enableVerboseLogging();
        
        // نمایش اطلاعات دیباگ در UI
        this.managers.ui.showDebugInfo();
    }

    getAppInfo() {
        return {
            config: this.config,
            state: this.state,
            modules: Array.from(this.modules.keys()),
            services: Object.keys(this.services),
            managers: Object.keys(this.managers),
            performance: this.services.performance.getPerformanceReport(),
            storage: this.services.storage.getStats()
        };
    }
}

// ایجاد instance جهانی و attach به window
const app = FinancialAnalysisApp.getInstance();
window.FinancialAnalysisApp = app;

// export برای استفاده در ماژول‌های دیگر
export default app;
export { FinancialAnalysisApp };

// راه‌اندازی برنامه وقتی DOM آماده شد
document.addEventListener('DOMContentLoaded', () => {
    app.init().catch(error => {
        console.error('Failed to initialize app:', error);
    });
});

// مدیریت خاموشی برنامه
window.addEventListener('beforeunload', (event) => {
    if (app.state.isInitialized) {
        app.shutdown();
    }
});