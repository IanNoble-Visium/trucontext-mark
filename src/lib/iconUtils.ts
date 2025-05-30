/**
 * List of known icon types that have corresponding PNG/SVG files
 * This includes both basic node types and specialized ITOT icons
 */
export const KNOWN_ICONS = [
  // Basic node types
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
  'character',

  // ITOT (Industrial IoT) specialized icons
  'itot-activedirectory',
  'itot-businessintelligence',
  'itot-cve',
  'itot-cvss',
  'itot-cvssseverity',
  'itot-cwe',
  'itot-default',
  'itot-device',
  'itot-domain',
  'itot-erpserver',
  'itot-exploit',
  'itot-externalentry',
  'itot-flowcontrolvalve',
  'itot-messerver',
  'itot-metircs',
  'itot-node',
  'itot-plccontroller',
  'itot-processhistorian',
  'itot-productionsceduling',
  'itot-reference',
  'itot-scada',
  'itot-sensor',
  'itot-server',
  'itot-sofware',
  'itot-temperaturesensor',
  'itot_machine'
];

/**
 * Cache for icon availability checks to avoid repeated file system checks
 */
const iconAvailabilityCache = new Map<string, boolean>();

/**
 * Checks if an icon file exists by attempting to load it
 * @param iconPath The path to the icon file
 * @returns Promise that resolves to true if icon exists, false otherwise
 */
async function checkIconExists(iconPath: string): Promise<boolean> {
  // Check cache first
  if (iconAvailabilityCache.has(iconPath)) {
    return iconAvailabilityCache.get(iconPath)!;
  }

  try {
    const response = await fetch(iconPath, { method: 'HEAD' });
    const exists = response.ok;
    iconAvailabilityCache.set(iconPath, exists);
    return exists;
  } catch (error) {
    iconAvailabilityCache.set(iconPath, false);
    return false;
  }
}

/**
 * Gets the path to an icon based on the node type with enhanced fallback handling
 * @param type The type of the node
 * @returns Path to the PNG icon file
 */
export function getIconPath(type?: string): string {
  // If type is undefined, null, or empty, return unknown icon
  if (!type || type.trim() === '') {
    console.log('No type provided, using Unknown icon');
    return '/icons/unknown.png';
  }

  // Convert to lowercase for case-insensitive matching and normalize
  const normalizedType = type.toLowerCase().trim();

  // Direct match in known icons
  if (KNOWN_ICONS.includes(normalizedType)) {
    return `/icons/${normalizedType}.png`;
  }

  // Try common variations and mappings
  const typeVariations = getTypeVariations(normalizedType);
  for (const variation of typeVariations) {
    if (KNOWN_ICONS.includes(variation)) {
      console.log(`Mapped "${type}" to "${variation}" icon`);
      return `/icons/${variation}.png`;
    }
  }

  // Log when using fallback icon
  console.log(`No icon found for type "${type}", using Unknown icon`);
  return '/icons/unknown.png';
}

/**
 * Gets variations of a node type for flexible matching
 * @param type The normalized node type
 * @returns Array of possible variations to try
 */
function getTypeVariations(type: string): string[] {
  const variations: string[] = [];

  // Add the original type
  variations.push(type);

  // Common mappings for different naming conventions
  const typeMappings: Record<string, string[]> = {
    // Server variations
    'servers': ['server'],
    'srv': ['server'],
    'host': ['server'],
    'machine': ['server', 'itot_machine'],

    // Workstation variations
    'workstations': ['workstation'],
    'desktop': ['workstation'],
    'pc': ['workstation'],
    'computer': ['workstation'],

    // User variations
    'users': ['user'],
    'person': ['user'],
    'account': ['user'],
    'employee': ['user'],

    // Network device variations
    'routers': ['router'],
    'switches': ['switch'],
    'firewalls': ['firewall'],
    'gateway': ['router'],
    'hub': ['switch'],

    // Database variations
    'databases': ['database'],
    'db': ['database'],
    'datastore': ['database'],

    // Application variations
    'applications': ['application'],
    'app': ['application'],
    'software': ['application', 'itot-sofware'],
    'service': ['application'],

    // Threat variations
    'threat': ['threatactor'],
    'attacker': ['threatactor'],
    'malware': ['threatactor'],
    'actor': ['threatactor'],

    // Industrial/IoT variations
    'sensor': ['itot-sensor', 'itot-temperaturesensor'],
    'controller': ['itot-plccontroller'],
    'plc': ['itot-plccontroller'],
    'scada': ['itot-scada'],
    'device': ['itot-device'],
    'node': ['itot-node'],
    'valve': ['itot-flowcontrolvalve'],
    'historian': ['itot-processhistorian'],
    'activedirectory': ['itot-activedirectory'],
    'ad': ['itot-activedirectory'],
    'cve': ['itot-cve'],
    'cwe': ['itot-cwe'],
    'exploit': ['itot-exploit'],
    'vulnerability': ['itot-cve'],
    'domain': ['itot-domain']
  };

  // Add mapped variations
  if (typeMappings[type]) {
    variations.push(...typeMappings[type]);
  }

  // Try with 'itot-' prefix for industrial terms
  if (!type.startsWith('itot-')) {
    variations.push(`itot-${type}`);
  }

  // Remove duplicates while preserving order
  return [...new Set(variations)];
}

/**
 * Validates that an icon exists and provides fallback options
 * @param type The node type
 * @returns Promise with icon path and validation status
 */
export async function validateIconPath(type?: string): Promise<{
  iconPath: string;
  isValid: boolean;
  fallbackUsed: boolean;
}> {
  const iconPath = getIconPath(type);
  const isValid = await checkIconExists(iconPath);

  if (isValid) {
    return { iconPath, isValid: true, fallbackUsed: false };
  }

  // Use unknown icon as final fallback
  const fallbackPath = '/icons/unknown.png';
  return { iconPath: fallbackPath, isValid: false, fallbackUsed: true };
}

/**
 * Gets all available icon types for UI components
 * @returns Array of available icon types
 */
export function getAvailableIconTypes(): string[] {
  return [...KNOWN_ICONS].sort();
}
