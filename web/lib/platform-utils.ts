export type Platform = string | null | undefined;

export function getPlatformIcon(platform: Platform): string {
  const p = (platform ?? '').toLowerCase();
  if (p.includes('instagram')) return '📸';
  if (p.includes('linkedin')) return '💼';
  if (p.includes('twitter') || p.includes('x')) return '🐦';
  if (p.includes('email')) return '📧';
  if (p.includes('phone')) return '📞';
  return '🔗';
}

export function getContactUrl(
  platform: Platform,
  profileLink?: string | null,
  email?: string | null,
): string | null {
  if (profileLink) return profileLink;
  if (email) return `mailto:${email}`;
  return null;
}

export function getContactLabel(platform: Platform, profileLink?: string | null, email?: string | null): string {
  if (profileLink) {
    const p = (platform ?? '').toLowerCase();
    if (p.includes('instagram')) return 'DM on Instagram';
    if (p.includes('linkedin')) return 'Message on LinkedIn';
    return 'Open Profile';
  }
  if (email) return 'Send Email';
  return 'Contact';
}
