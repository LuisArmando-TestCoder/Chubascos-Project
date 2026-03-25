export function formatDate(timestamp: unknown): string {
  if (!timestamp) return '';
  try {
    let date: Date;
    if (
      typeof timestamp === 'object' &&
      timestamp !== null &&
      'seconds' in timestamp
    ) {
      date = new Date((timestamp as { seconds: number }).seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(String(timestamp));
    }
    return date.toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatDateTime(timestamp: unknown): string {
  if (!timestamp) return '';
  try {
    let date: Date;
    if (
      typeof timestamp === 'object' &&
      timestamp !== null &&
      'seconds' in timestamp
    ) {
      date = new Date((timestamp as { seconds: number }).seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(String(timestamp));
    }
    return date.toLocaleString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
