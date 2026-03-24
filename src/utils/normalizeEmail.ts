export function normalizeEmail(email: string): string {
  const [local, domain] = email.toLowerCase().trim().split('@');
  if (!local || !domain) return email.toLowerCase().trim();
  
  // Strip everything after '+' in the local part
  const normalizedLocal = local.split('+')[0];
  
  return `${normalizedLocal}@${domain}`;
}
