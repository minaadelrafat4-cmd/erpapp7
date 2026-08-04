import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@luxe_erp_cache_';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      return entry.data;
    } catch {
      return null;
    }
  },

  async getWithTimestamp<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // storage may fail silently
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch {
      // ignore
    }
  },

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {
      // ignore
    }
  },

  isStale(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_TTL_MS;
  },

  prefix: CACHE_PREFIX,
  ttlMs: CACHE_TTL_MS,
};
