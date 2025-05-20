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
  'client'  // Added client to the known icons list
];

/**
 * Gets the path to an icon based on the node type
 * @param type The type of the node
 * @returns Path to the icon file
 */
export function getIconPath(type?: string): string {
  // If type is undefined, null, or empty, return unknown icon
  if (!type || type.trim() === '') {
    console.log('No type provided, using Unknown icon');
    return '/icons/unknown.png';  // Changed to lowercase for consistency
  }
  
  // Convert to lowercase for case-insensitive matching
  const key = type.toLowerCase().trim();
  
  // Check if the type is in our known icons list
  if (KNOWN_ICONS.includes(key)) {
    return `/icons/${key}.png`;
  }
  
  // Log when using fallback icon
  console.log(`No icon found for type "${type}", using Unknown icon`);
  return '/icons/unknown.png';  // Changed to lowercase for consistency
}
