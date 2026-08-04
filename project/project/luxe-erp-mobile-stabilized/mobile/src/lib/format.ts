export function formatCurrency(amount: number, currency = 'USD'): string {
  const prefix = currency === 'USD' ? '$' : '';
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 10_000) return `${prefix}${(amount / 1_000).toFixed(1)}K`;
  return `${prefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompactCurrency(amount: number, currency = 'USD'): string {
  const prefix = currency === 'USD' ? '$' : '';
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${prefix}${(amount / 1_000).toFixed(1)}K`;
  return `${prefix}${amount.toFixed(0)}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function isOverdue(dueDate: string | null, status?: string): boolean {
  if (!dueDate) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
