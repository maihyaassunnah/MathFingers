/**
 * Supabase Network & Payload Size Telemetry Monitor
 * Tracks real-time request/response payload sizes, egress, ingress, and detects large objects.
 */

export interface NetworkLogEntry {
  id: string;
  timestamp: number;
  url: string;
  endpoint: string;
  table: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | string;
  status: number;
  statusText: string;
  durationMs: number;
  requestSizeBytes: number;
  responseSizeBytes: number;
  requestBodyPreview?: string | null;
  responseBodyPreview?: string | null;
  isLargeEgress: boolean; // > 30 KB response
  isLargeIngress: boolean; // > 30 KB request
  detectedLargeFields?: Array<{ field: string; sizeBytes: number; preview: string }>;
  isError: boolean;
  queued?: boolean;
}

export interface TableBandwidthStat {
  table: string;
  requestCount: number;
  egressBytes: number;
  ingressBytes: number;
  lastAccessed: number;
}

export interface NetworkStats {
  totalRequests: number;
  totalEgressBytes: number;
  totalIngressBytes: number;
  avgDurationMs: number;
  largeTransfersCount: number;
  tableStats: Record<string, TableBandwidthStat>;
}

type NetworkLogListener = (logs: NetworkLogEntry[], stats: NetworkStats) => void;

class NetworkMonitorService {
  private logs: NetworkLogEntry[] = [];
  private listeners: Set<NetworkLogListener> = new Set();
  private maxLogs: number = 250;
  private storageKey = 'MATH_FINGERS_NETWORK_TELEMETRY';

  constructor() {
    this.loadPersistedStats();
  }

  private loadPersistedStats() {
    try {
      if (typeof window !== 'undefined') {
        const saved = sessionStorage.getItem(this.storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.logs = parsed.slice(-this.maxLogs);
          }
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }

  private persistLogs() {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(this.storageKey, JSON.stringify(this.logs.slice(-50)));
      }
    } catch {
      // Ignore quota errors
    }
  }

  public subscribe(listener: NetworkLogListener): () => void {
    this.listeners.add(listener);
    // Trigger initial notification
    listener(this.logs, this.getStats());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const stats = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener([...this.logs], stats);
      } catch (err) {
        console.error('[NetworkMonitor] Error in listener:', err);
      }
    });
    this.persistLogs();
  }

  public extractTableName(url: string): string {
    try {
      const parsedUrl = new URL(url, 'https://supabase.co');
      const pathname = parsedUrl.pathname;
      // Match /rest/v1/{tableName}
      const match = pathname.match(/\/rest\/v1\/([^/?#]+)/);
      if (match && match[1]) {
        return match[1];
      }
      // Match /storage/v1/object/public/{bucketName}
      const storageMatch = pathname.match(/\/storage\/v1\/object\/public\/([^/?#]+)/);
      if (storageMatch && storageMatch[1]) {
        return `storage:${storageMatch[1]}`;
      }
      // Match /auth/v1/...
      if (pathname.includes('/auth/v1/')) {
        return 'auth';
      }
      return 'rpc/other';
    } catch {
      return 'unknown';
    }
  }

  public analyzeLargeFields(jsonObj: any): Array<{ field: string; sizeBytes: number; preview: string }> {
    const results: Array<{ field: string; sizeBytes: number; preview: string }> = [];
    if (!jsonObj || typeof jsonObj !== 'object') return results;

    const items = Array.isArray(jsonObj) ? jsonObj : [jsonObj];
    items.slice(0, 5).forEach((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([key, val]) => {
          if (val === null || val === undefined) return;
          const strVal = typeof val === 'string' ? val : JSON.stringify(val);
          const size = new Blob([strVal]).size;
          // Flag fields larger than 5 KB (such as base64 images or giant nested json)
          if (size > 5000) {
            results.push({
              field: Array.isArray(jsonObj) ? `[row ${idx}].${key}` : key,
              sizeBytes: size,
              preview: strVal.length > 80 ? `${strVal.substring(0, 80)}... [${strVal.length} chars]` : strVal
            });
          }
        });
      }
    });

    return results;
  }

  public recordRequest(entry: Omit<NetworkLogEntry, 'id' | 'isLargeEgress' | 'isLargeIngress'>): NetworkLogEntry {
    const isLargeEgress = entry.responseSizeBytes > 30 * 1024; // > 30 KB
    const isLargeIngress = entry.requestSizeBytes > 30 * 1024; // > 30 KB

    const fullEntry: NetworkLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isLargeEgress,
      isLargeIngress
    };

    this.logs.unshift(fullEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.notify();
    return fullEntry;
  }

  public getLogs(): NetworkLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public getStats(): NetworkStats {
    let totalEgressBytes = 0;
    let totalIngressBytes = 0;
    let totalDuration = 0;
    let largeTransfersCount = 0;
    const tableStats: Record<string, TableBandwidthStat> = {};

    this.logs.forEach((log) => {
      totalEgressBytes += log.responseSizeBytes;
      totalIngressBytes += log.requestSizeBytes;
      totalDuration += log.durationMs;
      if (log.isLargeEgress || log.isLargeIngress) {
        largeTransfersCount++;
      }

      const tbl = log.table || 'unknown';
      if (!tableStats[tbl]) {
        tableStats[tbl] = {
          table: tbl,
          requestCount: 0,
          egressBytes: 0,
          ingressBytes: 0,
          lastAccessed: log.timestamp
        };
      }
      tableStats[tbl].requestCount += 1;
      tableStats[tbl].egressBytes += log.responseSizeBytes;
      tableStats[tbl].ingressBytes += log.requestSizeBytes;
      if (log.timestamp > tableStats[tbl].lastAccessed) {
        tableStats[tbl].lastAccessed = log.timestamp;
      }
    });

    const totalRequests = this.logs.length;
    const avgDurationMs = totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0;

    return {
      totalRequests,
      totalEgressBytes,
      totalIngressBytes,
      avgDurationMs,
      largeTransfersCount,
      tableStats
    };
  }
}

export const networkMonitor = new NetworkMonitorService();

/**
 * Format bytes to readable string (e.g. 1.25 KB, 4.5 MB)
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'B'}`;
}
