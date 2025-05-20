export const KNOWN_ICONS = ['server', 'workstation', 'user', 'threatactor'];

export function getIconPath(type?: string): string {
  if (!type) {
    return '/icons/Unknown.png';
  }
  const key = type.toLowerCase();
  if (KNOWN_ICONS.includes(key)) {
    return `/icons/${key}.png`;
  }
  return '/icons/Unknown.png';
}
