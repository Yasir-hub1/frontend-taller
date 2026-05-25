import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NetworkStatusService } from './network-status.service';

export type OfflineScope = 'workshop' | 'admin';

export type OfflineOp =
  | 'accept'
  | 'reject'
  | 'status'
  | 'complete'
  | 'quote'
  | 'workshop_create'
  | 'workshop_update'
  | 'technician_create'
  | 'technician_update'
  | 'technician_delete'
  | 'technician_availability'
  | 'technician_app_access'
  | 'admin_commission'
  | 'admin_workshop_verify'
  | 'admin_workshop_toggle'
  | 'admin_user_toggle';

export interface OfflineQueueItem {
  id: string;
  scope: OfflineScope;
  op: OfflineOp;
  targetId: number;
  payload: Record<string, unknown>;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: string;
  error?: string;
}

const STORAGE_KEY = 'app_offline_queue_v2';

type QueueExecutor = (item: OfflineQueueItem) => Promise<void>;

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly network = inject(NetworkStatusService);
  private executor: QueueExecutor | null = null;
  private readonly _pendingCount = signal(0);

  readonly pendingCount = this._pendingCount.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.refreshPendingCount();
    window.addEventListener('online', () => void this.flush());
  }

  setExecutor(fn: QueueExecutor): void {
    this.executor = fn;
    void this.flush();
  }

  isOnline(): boolean {
    return this.network.isOnline();
  }

  load(): OfflineQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const items = JSON.parse(raw) as OfflineQueueItem[];
      return items.map((row) => ({
        ...row,
        targetId: row.targetId ?? (row as { incidentId?: number }).incidentId ?? 0,
      }));
    } catch {
      return [];
    }
  }

  private save(items: OfflineQueueItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    this.refreshPendingCount();
  }

  private refreshPendingCount(): void {
    this._pendingCount.set(
      this.load().filter((i) => i.status === 'pending' || i.status === 'failed').length,
    );
  }

  enqueue(item: Omit<OfflineQueueItem, 'id' | 'status' | 'createdAt'>): OfflineQueueItem {
    const row: OfflineQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const q = this.load();
    q.push(row);
    this.save(q);
    return row;
  }

  pendingCountValue(): number {
    return this._pendingCount();
  }

  async flush(): Promise<{ synced: number; failed: number }> {
    if (!this.executor || !this.network.isOnline()) {
      return { synced: 0, failed: 0 };
    }
    const q = this.load();
    let synced = 0;
    let failed = 0;
    for (const item of q) {
      if (item.status === 'synced') continue;
      item.status = 'syncing';
      this.save(q);
      try {
        await this.executor(item);
        item.status = 'synced';
        item.error = undefined;
        synced++;
      } catch (e) {
        item.status = 'failed';
        item.error = e instanceof Error ? e.message : 'Error de sincronización';
        failed++;
      }
      this.save(q);
    }
    return { synced, failed };
  }
}
