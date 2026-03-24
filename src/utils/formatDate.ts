export function formatDate(date: any): string {
  if (!date) return '';
  
  const d = date.toDate ? date.toDate() : new Date(date);
  
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}
