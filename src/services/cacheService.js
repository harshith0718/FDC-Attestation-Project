const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheService {
    constructor(ttlSeconds = 3600) {
        this.cache = new NodeCache({
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false
        });
    }

    async get(key, storeFunction) {
        const value = this.cache.get(key);
        if (value) {
            logger.debug(`Cache hit for key: ${key}`);
            return value;
        }

        try {
            const result = await storeFunction();
            this.cache.set(key, result);
            return result;
        } catch (error) {
            logger.error(`Error in cache get: ${error.message}`, { error });
            throw error;
        }
    }

    del(keys) {
        this.cache.del(keys);
    }

    flush() {
        this.cache.flushAll();
    }

    stats() {
        return {
            keys: this.cache.keys().length,
            stats: this.cache.getStats()
        };
    }
}

module.exports = new CacheService(process.env.CACHE_TTL || 3600);
