class StorageService {
    constructor(config = {}) {
        this.config = {
            encryptionEnabled: true,
            compressionEnabled: true,
            defaultTTL: 24 * 60 * 60 * 1000, // 24 ساعت
            maxSize: 50 * 1024 * 1024, // 50MB
            cleanupInterval: 60 * 60 * 1000, // 1 ساعت
            ...config
        };
        
        this.encryptionKey = this.generateEncryptionKey();
        this.storage = window.localStorage;
        this.cache = new Map();
        this.cleanupJob = null;
        
        this.init();
    }

    init() {
        this.startCleanupJob();
        this.monitorStorageUsage();
    }

    // ==================== CRUD Operations ====================

    async set(key, value, options = {}) {
        try {
            const ttl = options.ttl || this.config.defaultTTL;
            const timestamp = Date.now();
            const expireAt = timestamp + ttl;

            const storageItem = {
                value: value,
                timestamp: timestamp,
                expireAt: expireAt,
                version: '1.0',
                metadata: options.metadata || {}
            };

            // فشرده‌سازی
            if (this.config.compressionEnabled) {
                storageItem.value = await this.compress(value);
            }

            // رمزنگاری
            if (this.config.encryptionEnabled) {
                storageItem.value = this.encrypt(JSON.stringify(storageItem.value));
            } else {
                storageItem.value = JSON.stringify(storageItem.value);
            }

            const storageKey = this.prefixKey(key);
            this.storage.setItem(storageKey, JSON.stringify(storageItem));
            
            // ذخیره در کش memory
            this.cache.set(key, {
                value: value,
                timestamp: timestamp,
                expireAt: expireAt
            });

            this.emit('storage:set', { key, value, options });
            return true;

        } catch (error) {
            console.error('Storage set error:', error);
            this.emit('storage:error', { error, operation: 'set', key });
            return false;
        }
    }

    async get(key, defaultValue = null) {
        try {
            // اول بررسی کش memory
            if (this.cache.has(key)) {
                const cached = this.cache.get(key);
                if (cached.expireAt > Date.now()) {
                    return cached.value;
                } else {
                    this.cache.delete(key);
                }
            }

            const storageKey = this.prefixKey(key);
            const stored = this.storage.getItem(storageKey);
            
            if (!stored) {
                return defaultValue;
            }

            let storageItem;
            try {
                storageItem = JSON.parse(stored);
            } catch (parseError) {
                this.remove(key);
                return defaultValue;
            }

            // بررسی انقضا
            if (storageItem.expireAt && storageItem.expireAt < Date.now()) {
                this.remove(key);
                return defaultValue;
            }

            let value = storageItem.value;

            // رمزگشایی
            if (this.config.encryptionEnabled) {
                value = this.decrypt(value);
            }

            // تبدیل به object
            try {
                value = JSON.parse(value);
            } catch (parseError) {
                console.warn('Failed to parse stored value:', parseError);
                return defaultValue;
            }

            // decompress
            if (this.config.compressionEnabled) {
                value = await this.decompress(value);
            }

            // ذخیره در کش memory
            this.cache.set(key, {
                value: value,
                timestamp: storageItem.timestamp,
                expireAt: storageItem.expireAt
            });

            return value;

        } catch (error) {
            console.error('Storage get error:', error);
            this.emit('storage:error', { error, operation: 'get', key });
            return defaultValue;
        }
    }

    async getMany(keys) {
        const results = {};
        const promises = keys.map(async key => {
            results[key] = await this.get(key);
        });
        
        await Promise.all(promises);
        return results;
    }

    remove(key) {
        try {
            const storageKey = this.prefixKey(key);
            this.storage.removeItem(storageKey);
            this.cache.delete(key);
            
            this.emit('storage:remove', { key });
            return true;
            
        } catch (error) {
            console.error('Storage remove error:', error);
            this.emit('storage:error', { error, operation: 'remove', key });
            return false;
        }
    }

    removeMany(keys) {
        const results = {};
        keys.forEach(key => {
            results[key] = this.remove(key);
        });
        return results;
    }

    clear() {
        try {
            const prefix = this.getPrefix();
            const keysToRemove = [];
            
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key.startsWith(prefix)) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => {
                this.storage.removeItem(key);
            });
            
            this.cache.clear();
            this.emit('storage:clear');
            return true;
            
        } catch (error) {
            console.error('Storage clear error:', error);
            this.emit('storage:error', { error, operation: 'clear' });
            return false;
        }
    }

    exists(key) {
        const storageKey = this.prefixKey(key);
        return this.storage.getItem(storageKey) !== null;
    }

    // ==================== Advanced Operations ====================

    async setWithRetry(key, value, options = {}, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const success = await this.set(key, value, options);
                if (success) return true;
                
                if (attempt < maxRetries) {
                    await this.delay(Math.pow(2, attempt) * 100); // exponential backoff
                }
            } catch (error) {
                console.warn(`Storage set attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) throw error;
            }
        }
        return false;
    }

    async getWithFallback(key, fallbackGenerator, options = {}) {
        let value = await this.get(key);
        
        if (value === null && fallbackGenerator) {
            value = await fallbackGenerator();
            if (value !== null) {
                await this.set(key, value, options);
            }
        }
        
        return value;
    }

    async update(key, updater, options = {}) {
        const currentValue = await this.get(key);
        const newValue = await updater(currentValue);
        return await this.set(key, newValue, options);
    }

    async increment(key, amount = 1, options = {}) {
        return this.update(key, (current) => {
            const currentNumber = Number(current) || 0;
            return currentNumber + amount;
        }, options);
    }

    async decrement(key, amount = 1, options = {}) {
        return this.increment(key, -amount, options);
    }

    // ==================== Query Operations ====================

    keys(pattern = null) {
        const prefix = this.getPrefix();
        const keys = [];
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(prefix)) {
                const cleanKey = key.substring(prefix.length);
                if (!pattern || cleanKey.match(pattern)) {
                    keys.push(cleanKey);
                }
            }
        }
        
        return keys;
    }

    async search(pattern) {
        const matchingKeys = this.keys(pattern);
        return await this.getMany(matchingKeys);
    }

    async findByMetadata(metadataQuery) {
        const allKeys = this.keys();
        const results = {};
        
        for (const key of allKeys) {
            const value = await this.get(key);
            if (value && this.matchesMetadata(value, metadataQuery)) {
                results[key] = value;
            }
        }
        
        return results;
    }

    matchesMetadata(value, query) {
        if (!value.metadata) return false;
        
        for (const [field, expectedValue] of Object.entries(query)) {
            if (value.metadata[field] !== expectedValue) {
                return false;
            }
        }
        
        return true;
    }

    // ==================== Management Operations ====================

    getInfo() {
        const prefix = this.getPrefix();
        let totalSize = 0;
        let itemCount = 0;
        const types = {};
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(prefix)) {
                const value = this.storage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
                itemCount++;
                
                // شمارش بر اساس نوع
                try {
                    const item = JSON.parse(value);
                    const type = typeof item.value;
                    types[type] = (types[type] || 0) + 1;
                } catch (e) {
                    types['unknown'] = (types['unknown'] || 0) + 1;
                }
            }
        }
        
        return {
            totalSize,
            itemCount,
            types,
            usagePercentage: (totalSize / this.config.maxSize) * 100,
            cacheSize: this.cache.size
        };
    }

    startCleanupJob() {
        if (this.cleanupJob) {
            clearInterval(this.cleanupJob);
        }
        
        this.cleanupJob = setInterval(() => {
            this.cleanupExpired();
            this.enforceSizeLimit();
        }, this.config.cleanupInterval);
    }

    stopCleanupJob() {
        if (this.cleanupJob) {
            clearInterval(this.cleanupJob);
            this.cleanupJob = null;
        }
    }

    cleanupExpired() {
        const prefix = this.getPrefix();
        const now = Date.now();
        let cleanedCount = 0;
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(prefix)) {
                try {
                    const item = JSON.parse(this.storage.getItem(key));
                    if (item.expireAt && item.expireAt < now) {
                        this.storage.removeItem(key);
                        this.cache.delete(key.substring(prefix.length));
                        cleanedCount++;
                    }
                } catch (error) {
                    // اگر آیتم معیوب باشد، حذفش کن
                    this.storage.removeItem(key);
                    cleanedCount++;
                }
            }
        }
        
        if (cleanedCount > 0) {
            this.emit('storage:cleanup', { cleanedCount });
        }
        
        return cleanedCount;
    }

    enforceSizeLimit() {
        const info = this.getInfo();
        if (info.totalSize <= this.config.maxSize) return 0;
        
        const overage = info.totalSize - this.config.maxSize;
        let freedSize = 0;
        let freedCount = 0;
        
        // حذف آیتم‌های قدیمی تا زمانی که اندازه تحت کنترل باشد
        const items = [];
        const prefix = this.getPrefix();
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(prefix)) {
                try {
                    const value = this.storage.getItem(key);
                    const item = JSON.parse(value);
                    items.push({
                        key: key,
                        size: key.length + value.length,
                        timestamp: item.timestamp
                    });
                } catch (error) {
                    // نادیده گرفتن آیتم‌های معیوب
                }
            }
        }
        
        // مرتب‌سازی بر اساس timestamp (قدیمی‌ها اول)
        items.sort((a, b) => a.timestamp - b.timestamp);
        
        for (const item of items) {
            if (freedSize >= overage) break;
            
            this.storage.removeItem(item.key);
            this.cache.delete(item.key.substring(prefix.length));
            freedSize += item.size;
            freedCount++;
        }
        
        if (freedCount > 0) {
            this.emit('storage:sizeEnforced', { freedSize, freedCount });
        }
        
        return freedCount;
    }

    monitorStorageUsage() {
        setInterval(() => {
            const info = this.getInfo();
            if (info.usagePercentage > 80) {
                this.emit('storage:highUsage', info);
            }
        }, 60000); // هر 1 دقیقه
    }

    // ==================== Encryption & Compression ====================

    generateEncryptionKey() {
        // در production باید از key management system استفاده شود
        let key = localStorage.getItem('storage_encryption_key');
        if (!key) {
            key = CryptoJS.lib.WordArray.random(128/8).toString();
            localStorage.setItem('storage_encryption_key', key);
        }
        return key;
    }

    encrypt(data) {
        if (!this.config.encryptionEnabled) return data;
        
        try {
            return CryptoJS.AES.encrypt(data, this.encryptionKey).toString();
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Encryption failed');
        }
    }

    decrypt(encryptedData) {
        if (!this.config.encryptionEnabled) return encryptedData;
        
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Decryption failed');
        }
    }

    async compress(data) {
        if (!this.config.compressionEnabled) return data;
        
        try {
            const jsonString = JSON.stringify(data);
            const compressed = LZString.compress(jsonString);
            return compressed;
        } catch (error) {
            console.error('Compression failed:', error);
            return data;
        }
    }

    async decompress(compressedData) {
        if (!this.config.compressionEnabled) return compressedData;
        
        try {
            const decompressed = LZString.decompress(compressedData);
            return JSON.parse(decompressed);
        } catch (error) {
            console.error('Decompression failed:', error);
            return compressedData;
        }
    }

    // ==================== Utility Methods ====================

    prefixKey(key) {
        return `${this.getPrefix()}${key}`;
    }

    getPrefix() {
        return `app_${this.getAppId()}_`;
    }

    getAppId() {
        // باید از config برنامه گرفته شود
        return 'financial_analysis';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    // ==================== Migration & Backup ====================

    async exportData() {
        const allData = {};
        const prefix = this.getPrefix();
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key.startsWith(prefix)) {
                const cleanKey = key.substring(prefix.length);
                allData[cleanKey] = await this.get(cleanKey);
            }
        }
        
        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            appId: this.getAppId(),
            data: allData
        };
    }

    async importData(exportData, options = {}) {
        const { overwrite = false, merge = true } = options;
        
        if (exportData.appId !== this.getAppId()) {
            throw new Error('Invalid app ID in import data');
        }
        
        let importedCount = 0;
        let skippedCount = 0;
        
        for (const [key, value] of Object.entries(exportData.data)) {
            const exists = this.exists(key);
            
            if (exists && !overwrite) {
                skippedCount++;
                continue;
            }
            
            if (exists && merge && value && typeof value === 'object') {
                // ادغام داده‌ها
                const current = await this.get(key, {});
                const merged = { ...current, ...value };
                await this.set(key, merged);
            } else {
                await this.set(key, value);
            }
            
            importedCount++;
        }
        
        this.emit('storage:import', { importedCount, skippedCount });
        return { importedCount, skippedCount };
    }

    async migrate(fromVersion, toVersion, migrationScript) {
        console.log(`Migrating storage from ${fromVersion} to ${toVersion}`);
        
        try {
            await migrationScript(this);
            await this.set('storage_version', toVersion);
            this.emit('storage:migrated', { fromVersion, toVersion });
            return true;
        } catch (error) {
            console.error('Migration failed:', error);
            this.emit('storage:migrationFailed', { error, fromVersion, toVersion });
            return false;
        }
    }

    // ==================== Debug & Development ====================

    enableDebugMode() {
        this.debug = true;
        console.log('🔧 Storage Service Debug Mode Enabled');
    }

    simulateStorageError() {
        const originalSetItem = this.storage.setItem;
        this.storage.setItem = function() {
            throw new Error('Simulated storage error');
        };
        
        setTimeout(() => {
            this.storage.setItem = originalSetItem;
        }, 1000);
    }

    getStats() {
        const info = this.getInfo();
        const cacheStats = {
            size: this.cache.size,
            hitRate: this.calculateCacheHitRate(),
            memoryUsage: this.estimateCacheMemoryUsage()
        };
        
        return {
            storage: info,
            cache: cacheStats,
            config: this.config
        };
    }

    calculateCacheHitRate() {
        // این نیاز به tracking دارد
        return 0.85; // مقدار نمونه
    }

    estimateCacheMemoryUsage() {
        let total = 0;
        this.cache.forEach((value, key) => {
            total += key.length;
            total += JSON.stringify(value).length;
        });
        return total;
    }
}

// ایجاد instance جهانی
const storageService = new StorageService();

// export برای استفاده در ماژول‌های دیگر
export default storageService;
export { StorageService };