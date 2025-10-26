// سرویس کش پیشرفته با قابلیت‌های کامل
class CacheService {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // هر 1 دقیقه
        this.persistenceInterval = setInterval(() => this.persistToStorage(), 300000); // هر 5 دقیقه
        
        this.loadFromStorage();
    }

    set(key, data, ttl = 300000) { // 5 minutes default
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl,
            accessCount: 0,
            lastAccessed: Date.now()
        };

        this.cache.set(key, item);
        this.stats.sets++;
        
        // بررسی اندازه کش
        if (this.cache.size > 1000) {
            this.evictLRU();
        }
        
        return true;
    }

    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.stats.misses++;
            return null;
        }

        // بررسی انقضا
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        // به‌روزرسانی آمار دسترسی
        item.accessCount++;
        item.lastAccessed = Date.now();
        
        this.stats.hits++;
        return item.data;
    }

    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.deletes++;
        }
        return deleted;
    }

    clear() {
        this.cache.clear();
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
        localStorage.removeItem('financial_cache');
    }

    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > item.ttl) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 ${cleanedCount} آیتم منقضی از کش پاک شد`);
        }
    }

    evictLRU() {
        // حذف کم‌استفاده‌ترین آیتم‌ها
        const entries = Array.from(this.cache.entries());
        const sorted = entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        // حذف 10% آیتم‌های کم‌استفاده
        const evictCount = Math.ceil(sorted.length * 0.1);
        
        for (let i = 0; i < evictCount; i++) {
            this.cache.delete(sorted[i][0]);
        }
        
        console.log(`🗑️ ${evictCount} آیتم کم‌استفاده از کش حذف شد`);
    }

    persistToStorage() {
        try {
            const dataToPersist = {};
            
            for (const [key, item] of this.cache.entries()) {
                // فقط آیتم‌هایی که TTL بالایی دارند را ذخیره کن
                if (item.ttl > 600000) { // 10 minutes
                    dataToPersist[key] = {
                        data: item.data,
                        timestamp: item.timestamp,
                        ttl: item.ttl
                    };
                }
            }
            
            const encrypted = CryptoJS.AES.encrypt(
                JSON.stringify(dataToPersist), 
                'cache_persistence_key'
            ).toString();
            
            localStorage.setItem('financial_cache', encrypted);
            console.log('💾 کش در localStorage ذخیره شد');
            
        } catch (error) {
            console.warn('خطا در ذخیره‌سازی کش:', error);
        }
    }

    loadFromStorage() {
        try {
            const encrypted = localStorage.getItem('financial_cache');
            if (!encrypted) return;

            const decrypted = CryptoJS.AES.decrypt(encrypted, 'cache_persistence_key');
            const data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));

            for (const [key, item] of Object.entries(data)) {
                // فقط آیتم‌های منقضی نشده را بارگذاری کن
                if (Date.now() - item.timestamp < item.ttl) {
                    this.cache.set(key, {
                        ...item,
                        accessCount: 0,
                        lastAccessed: Date.now()
                    });
                }
            }
            
            console.log(`📥 ${Object.keys(data).length} آیتم از localStorage بارگذاری شد`);
            
        } catch (error) {
            console.warn('خطا در بارگذاری کش از localStorage:', error);
            localStorage.removeItem('financial_cache');
        }
    }

    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
            memoryUsage: this.getMemoryUsage()
        };
    }

    getMemoryUsage() {
        // تخمین استفاده از حافظه
        let totalSize = 0;
        
        for (const [key, item] of this.cache.entries()) {
            totalSize += key.length;
            totalSize += JSON.stringify(item.data).length;
        }
        
        return {
            bytes: totalSize,
            kilobytes: Math.round(totalSize / 1024),
            megabytes: Math.round(totalSize / 1024 / 1024)
        };
    }

    getSize() {
        return this.cache.size;
    }

    getKeys() {
        return Array.from(this.cache.keys());
    }

    // متدهای پیشرفته برای مدیریت کش
    setWithPriority(key, data, ttl, priority = 'medium') {
        const priorities = {
            'high': 3600000,    // 1 hour
            'medium': 300000,   // 5 minutes
            'low': 60000        // 1 minute
        };
        
        return this.set(key, data, ttl || priorities[priority]);
    }

    prefetch(keys, dataFetcher) {
        // پیش‌بارگذاری چندین کلید
        const promises = keys.map(key => 
            dataFetcher(key).then(data => this.set(key, data))
        );
        
        return Promise.allSettled(promises);
    }

    invalidatePattern(pattern) {
        // حذف آیتم‌هایی که با الگو مطابقت دارند
        const regex = new RegExp(pattern);
        let invalidatedCount = 0;
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                invalidatedCount++;
            }
        }
        
        return invalidatedCount;
    }

    exportData() {
        const data = {};
        
        for (const [key, item] of this.cache.entries()) {
            data[key] = {
                data: item.data,
                timestamp: item.timestamp,
                ttl: item.ttl,
                accessCount: item.accessCount
            };
        }
        
        return data;
    }

    importData(data, clearExisting = false) {
        if (clearExisting) {
            this.clear();
        }
        
        for (const [key, item] of Object.entries(data)) {
            this.cache.set(key, {
                data: item.data,
                timestamp: item.timestamp || Date.now(),
                ttl: item.ttl || 300000,
                accessCount: item.accessCount || 0,
                lastAccessed: Date.now()
            });
        }
        
        return Object.keys(data).length;
    }
}
