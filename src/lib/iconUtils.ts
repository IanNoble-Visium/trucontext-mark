/**
 * List of known icon types that have corresponding PNG files
 */
export const KNOWN_ICONS = [
  'server',
  'workstation',
  'user',
  'threatactor',
  'application',
  'database',
  'entity',
  'router',
  'firewall',
  'switch',
  'client',
  'character'  // Added character to the known icons list
];

/**
 * Gets the path to an icon based on the node type
 * @param type The type of the node
 * @param preferSvg Whether to prefer SVG over PNG (default: true)
 * @returns Path to the icon file
 */
export function getIconPath(type?: string, preferSvg: boolean = true): string {
  // If type is undefined, null, or empty, return unknown icon
  if (!type || type.trim() === '') {
    console.log('No type provided, using Unknown icon');
    return preferSvg ? '/icons/unknown.svg' : '/icons/unknown.png';
  }

  // Convert to lowercase for case-insensitive matching
  const key = type.toLowerCase().trim();

  // Check if the type is in our known icons list
  if (KNOWN_ICONS.includes(key)) {
    return preferSvg ? `/icons/${key}.svg` : `/icons/${key}.png`;
  }

  // Log when using fallback icon
  console.log(`No icon found for type "${type}", using Unknown icon`);
  return preferSvg ? '/icons/unknown.svg' : '/icons/unknown.png';
}
