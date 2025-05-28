// This script creates SVG icons that can be used as fallbacks
// Run with: node scripts/create-svg-icons.js

const fs = require('fs');
const path = require('path');

// List of icons to create
const icons = [
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
  'unknown'
];

// Icon colors and symbols for different types
const iconConfig = {
  'server': { color: '#3182CE', symbol: '🖥️', letter: 'S' },
  'workstation': { color: '#DD6B20', symbol: '💻', letter: 'W' },
  'user': { color: '#38A169', symbol: '👤', letter: 'U' },
  'threatactor': { color: '#E53E3E', symbol: '⚠️', letter: 'T' },
  'application': { color: '#805AD5', symbol: '📱', letter: 'A' },
  'database': { color: '#D53F8C', symbol: '🗄️', letter: 'D' },
  'entity': { color: '#319795', symbol: '📊', letter: 'E' },
  'router': { color: '#D69E2E', symbol: '🔀', letter: 'R' },
  'firewall': { color: '#E53E3E', symbol: '🛡️', letter: 'F' },
  'switch': { color: '#38A169', symbol: '🔌', letter: 'S' },
  'client': { color: '#3182CE', symbol: '💻', letter: 'C' },
  'unknown': { color: '#718096', symbol: '❓', letter: '?' }
};

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log(`Created directory: ${iconsDir}`);
}

// Function to create an SVG icon
function createSVGIcon(iconName, config) {
  const { color, letter } = config;
  const svgContent = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <style>
      .icon-bg { fill: ${color}; stroke: #ffffff; stroke-width: 2; }
      .icon-text { fill: #ffffff; font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; text-anchor: middle; dominant-baseline: central; }
    </style>
  </defs>
  <circle cx="16" cy="16" r="14" class="icon-bg"/>
  <text x="16" y="16" class="icon-text">${letter}</text>
</svg>`;
  return svgContent;
}

// Create icons
icons.forEach(icon => {
  const config = iconConfig[icon] || iconConfig.unknown;

  // Create SVG version
  const svgPath = path.join(iconsDir, `${icon}.svg`);
  const svgContent = createSVGIcon(icon, config);
  fs.writeFileSync(svgPath, svgContent);
  console.log(`Created SVG icon: ${svgPath}`);

  // Create a minimal PNG placeholder (just a small data URL)
  const pngPath = path.join(iconsDir, `${icon}.png`);

  // Skip if PNG already exists and is not a text file
  if (fs.existsSync(pngPath)) {
    try {
      const content = fs.readFileSync(pngPath, 'utf8');
      if (!content.includes('placeholder')) {
        console.log(`PNG icon already exists: ${pngPath}`);
        return; // Skip this iteration
      }
    } catch (e) {
      // If we can't read as text, it's probably a real PNG file
      console.log(`PNG icon already exists: ${pngPath}`);
      return; // Skip this iteration
    }
  }

  // Create a simple 1x1 transparent PNG as base64
  const transparentPNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  fs.writeFileSync(pngPath, Buffer.from(transparentPNG, 'base64'));
  console.log(`Created minimal PNG placeholder: ${pngPath}`);
});

console.log('Done creating icons. SVG versions are recommended for better quality.');
