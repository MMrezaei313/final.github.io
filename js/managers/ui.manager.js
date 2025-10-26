// مدیر رابط کاربری پیشرفته
class UIManager {
    constructor() {
        this.debounceTimers = new Map();
        this.intersectionObservers = new Map();
        this.modalStack = [];
        this.currentTheme = this.getSavedTheme();
        this.isSidebarOpen = true;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabs();
        this.initializeCharts();
        this.setupPerformanceMonitoring();
        this.applyTheme(this.currentTheme);
        this.setupResizeObserver();
    }

    setupEventListeners() {
        // Event Delegation برای عملکرد بهتر
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('input', this.handleGlobalInput.bind(this));
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // رویدادهای مربوط به theme
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // رویدادهای مربوط به sidebar
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // رویدادهای مربوط به fullscreen
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        this.setupDebouncedInputs();
        this.setupTabSpecificHandlers();
    }

    handleGlobalClick(event) {
        const target = event.target;
        
        // مدیریت تب‌ها
        if (target.classList.contains('tab')) {
            this.handleTabClick(target);
            return;
        }
        
        // مدیریت دکمه‌ها
        if (target.id === 'refreshBtn') {
            this.debounce('refresh', () => window.FinancialAnalysisApp.loadMarketData(), 300);
        } else if (target.id === 'analyzeBtn') {
            this.debounce('analyze', () => window.FinancialAnalysisApp.performAIAnalysis(), 300);
        } else if (target.id === 'securityBtn') {
            this.debounce('security', () => window.FinancialAnalysisApp.testSecurity(), 300);
        } else if (target.id === 'settingsBtn') {
            this.openSettingsModal();
        }
        
        // بستن modal با کلیک خارج
        if (target.classList.contains('modal')) {
            this.closeModal();
        }
        
        // بستن notification
        if (target.classList.contains('close-notification')) {
            target.closest('.notification').remove();
        }
    }

    handleGlobalInput(event) {
        // مدیریت ورودی‌های real-time
        const target = event.target;
        
        if (target.id === 'marketType' || target.id === 'timeFrame') {
            this.debounce('filter', () => {
                window.FinancialAnalysisApp.updateMarketDisplay();
                window.FinancialAnalysisApp.updateCharts();
            }, 500);
        }
    }

    handleGlobalKeydown(event) {
        // مدیریت کلیدهای میانبر
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case 'r':
                    event.preventDefault();
                    window.FinancialAnalysisApp.loadMarketData();
                    break;
                case 'k':
                    event.preventDefault();
                    this.toggleSidebar();
                    break;
                case 'd':
                    event.preventDefault();
                    this.toggleTheme();
                    break;
                case 'f':
                    event.preventDefault();
                    this.toggleFullscreen();
                    break;
            }
        }
        
        // کلید Escape
        if (event.key === 'Escape') {
            this.closeModal();
        }
    }

    setupDebouncedInputs() {
        const debouncedInputs = {
            'marketType': (value) => {
                window.FinancialAnalysisApp.updateMarketDisplay();
                window.FinancialAnalysisApp.updateCharts();
            },
            'timeFrame': (value) => {
                window.FinancialAnalysisApp.updateCharts();
            }
        };

        Object.keys(debouncedInputs).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', this.debounce(
                    id, 
                    () => debouncedInputs[id](element.value), 
                    500
                ));
            }
        });
    }

    setupTabSpecificHandlers() {
        // مدیریت رویدادهای خاص هر تب
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('tab')) {
                const tabId = target.getAttribute('data-tab');
                this.handleTabSpecificEvents(tabId);
            }
        });
    }

    handleTabSpecificEvents(tabId) {
        switch(tabId) {
            case 'feature-importance':
                window.FinancialAnalysisApp.performAdvancedFeatureAnalysis();
                break;
            case 'model-interpretability':
                window.FinancialAnalysisApp.performModelInterpretabilityAnalysis();
                break;
            case 'advanced-sentiment':
                window.FinancialAnalysisApp.performAdvancedSentimentAnalysis();
                break;
            case 'portfolio-management':
                window.FinancialAnalysisApp.loadPortfolioData();
                break;
            case 'backtesting':
                window.FinancialAnalysisApp.setupBacktesting();
                break;
            case 'real-time':
                window.FinancialAnalysisApp.startRealTimeUpdates();
                break;
        }
    }

    handleTabClick(tab) {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // غیرفعال کردن همه تب‌ها
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // فعال کردن تب انتخاب شده
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        const tabContent = document.getElementById(`${tabId}-tab`);
        
        if (tabContent) {
            tabContent.classList.add('active');
            tabContent.classList.add('fade-in');
            
            // حذف انیمیشن بعد از اجرا
            setTimeout(() => {
                tabContent.classList.remove('fade-in');
            }, 500);
        }
        
        // رویدادهای خاص تب
        this.onTabChange(tabId);
    }

    onTabChange(tabId) {
        console.log(`تب فعال: ${tabId}`);
        
        // به‌روزرسانی عنوان مرورگر
        const tabNames = {
            'dashboard': 'داشبورد',
            'analysis': 'تحلیل پیشرفته',
            'trading': 'معاملات',
            'reports': 'گزارش‌ها'
        };
        
        const tabName = tabNames[tabId] || 'سیستم تحلیل مالی';
        document.title = `${tabName} - سامانه تحلیل هوشمند`;
        
        // ردیابی analytics (در محیط واقعی)
        this.trackTabView(tabId);
    }

    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.handleTabClick(tab));
        });
    }

    initializeCharts() {
        const chartContainers = [
            'indicesChart', 'priceChart', 'connectionChart', 'featureImportanceChart',
            'shapChart', 'limeChart', 'counterfactualChart', 'transformerPredictionsChart',
            'performanceChart', 'riskChart', 'portfolioChart'
        ];

        chartContainers.forEach(containerId => {
            this.createEmptyChart(containerId, '📊 در حال بارگذاری نمودار...');
        });
    }

    createEmptyChart(containerId, message) {
        const layout = {
            title: {
                text: message,
                font: { 
                    family: 'Tahoma',
                    size: 16,
                    color: 'var(--text-secondary)'
                }
            },
            xaxis: { 
                title: 'زمان',
                showgrid: true,
                gridcolor: 'var(--border-color)'
            },
            yaxis: { 
                title: 'مقدار',
                showgrid: true,
                gridcolor: 'var(--border-color)'
            },
            font: { 
                family: 'Tahoma',
                size: 12
            },
            showlegend: false,
            plot_bgcolor: 'var(--bg-primary)',
            paper_bgcolor: 'var(--bg-primary)',
            margin: { t: 50, r: 50, b: 50, l: 50 }
        };
        
        Plotly.newPlot(containerId, [], layout, { 
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
        });
    }

    debounce(key, func, wait) {
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, wait);
        
        this.debounceTimers.set(key, timer);
    }

    showNotification(message, type = 'info', duration = 5000) {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type} fade-in`;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || '📢'}</span>
                <span class="notification-message">${message}</span>
            </div>
            <button class="close-notification" onclick="this.parentElement.remove()">×</button>
        `;
        
        const notificationCenter = document.getElementById('notificationCenter') || 
                                 this.createNotificationCenter();
        
        notificationCenter.appendChild(notification);
        
        // حذف خودکار
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
        
        return notification;
    }

    createNotificationCenter() {
        const center = document.createElement('div');
        center.className = 'notification-center';
        center.id = 'notificationCenter';
        document.body.appendChild(center);
        return center;
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        this.isSidebarOpen = !this.isSidebarOpen;
        
        if (this.isSidebarOpen) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
        
        // ذخیره وضعیت در localStorage
        localStorage.setItem('sidebarOpen', this.isSidebarOpen);
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        this.saveTheme(this.currentTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        // به‌روزرسانی آیکون theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    getSavedTheme() {
        return localStorage.getItem('theme') || 
               (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('خطا در ورود به حالت تمام صفحه:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'block';
            this.modalStack.push('settings');
        }
    }

    closeModal() {
        if (this.modalStack.length > 0) {
            const modalId = this.modalStack.pop();
            const modal = document.getElementById(`${modalId}Modal`);
            if (modal) {
                modal.style.display = 'none';
            }
        }
    }

    setupPerformanceMonitoring() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.entryType === 'measure') {
                        this.updatePerformanceMetrics(entry);
                    }
                });
            });
            
            observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        }
    }

    updatePerformanceMetrics(entry) {
        const meter = document.getElementById('performanceMeter');
        const text = document.getElementById('performanceText');
        
        if (!meter || !text) return;

        let performanceLevel, width, color;
        
        if (entry.duration < 100) {
            performanceLevel = 'عالی';
            width = '95%';
            color = 'var(--success-color)';
        } else if (entry.duration < 500) {
            performanceLevel = 'خوب';
            width = '75%';
            color = 'var(--warning-color)';
        } else {
            performanceLevel = 'نیاز به بهبود';
            width = '50%';
            color = 'var(--danger-color)';
        }
        
        meter.style.width = width;
        meter.style.background = color;
        text.textContent = performanceLevel;
    }

    setupResizeObserver() {
        const observer = new ResizeObserver((entries) => {
            entries.forEach(entry => {
                this.handleResize(entry.target, entry.contentRect);
            });
        });
        
        // مشاهده تغییرات اندازه المان‌های مهم
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            observer.observe(mainContent);
        }
    }

    handleResize(element, rect) {
        // بهینه‌سازی layout بر اساس اندازه صفحه
        if (rect.width < 768) {
            element.classList.add('mobile-layout');
        } else {
            element.classList.remove('mobile-layout');
        }
    }

    showLoading(elementId, message = 'در حال بارگذاری...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner-small"></div>
                    <div class="loading-text">${message}</div>
                </div>
            `;
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">❌</div>
                    <div class="error-text">${message}</div>
                    <button class="btn-outline" onclick="window.location.reload()">تلاش مجدد</button>
                </div>
            `;
        }
    }

    updateMarketItem(symbol, data) {
        // به‌روزرسانی آیتم بازار به صورت real-time
        const item = document.querySelector(`[data-symbol="${symbol}"]`);
        if (item) {
            const priceElement = item.querySelector('.market-price');
            const changeElement = item.querySelector('.market-change');
            
            if (priceElement) {
                priceElement.textContent = this.formatNumber(data.price) + ' تومان';
            }
            
            if (changeElement) {
                changeElement.textContent = `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
                changeElement.className = `market-change ${data.changePercent >= 0 ? 'positive' : 'negative'}`;
            }
            
            // انیمیشن تغییر
            item.classList.add('price-update');
            setTimeout(() => item.classList.remove('price-update'), 1000);
        }
    }

    formatNumber(num) {
        return new Intl.NumberFormat('fa-IR').format(Math.round(num));
    }

    trackTabView(tabId) {
        // ردیابی analytics (در محیط واقعی)
        if (typeof gtag !== 'undefined') {
            gtag('event', 'tab_view', {
                'event_category': 'navigation',
                'event_label': tabId
            });
        }
    }

    // متدهای کمکی برای مدیریت state
    getUIState() {
        return {
            theme: this.currentTheme,
            sidebarOpen: this.isSidebarOpen,
            activeTab: this.getActiveTab(),
            performance: this.getPerformanceStats()
        };
    }

    getActiveTab() {
        const activeTab = document.querySelector('.tab.active');
        return activeTab ? activeTab.getAttribute('data-tab') : 'dashboard';
    }

    getPerformanceStats() {
        return {
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            pageSize: performance.getEntriesByType('navigation')[0]?.transferSize || 0
        };
    }
}
