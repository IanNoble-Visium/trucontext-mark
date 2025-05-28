// This is a script to create placeholder icons using Canvas
// Run with: node scripts/create-icons.js

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

// Icon colors for different types
const iconColors = {
  'server': '#3182CE',
  'workstation': '#DD6B20',
  'user': '#38A169',
  'threatactor': '#E53E3E',
  'application': '#805AD5',
  'database': '#D53F8C',
  'entity': '#319795',
  'router': '#D69E2E',
  'firewall': '#E53E3E',
  'switch': '#38A169',
  'client': '#3182CE',
  'unknown': '#718096'
};

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log(`Created directory: ${iconsDir}`);
}

// Function to create a simple SVG icon and convert to PNG-like format
function createSVGIcon(iconName, color) {
  const firstLetter = iconName.charAt(0).toUpperCase();
  const svgContent = `<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <text x="16" y="22" font-family="Arial, sans-serif" font-size="14" font-weight="bold"
          text-anchor="middle" fill="#ffffff">${firstLetter}</text>
  </svg>`;
  return svgContent;
}

// Create icons
icons.forEach(icon => {
  const iconPath = path.join(iconsDir, `${icon}.png`);

  // Skip if the file already exists
  if (fs.existsSync(iconPath)) {
    console.log(`Icon already exists: ${iconPath}`);
    return;
  }

  // Create SVG content
  const color = iconColors[icon] || iconColors.unknown;
  const svgContent = createSVGIcon(icon, color);

  // For now, save as SVG (browsers can handle SVG in img tags)
  // In production, you'd want to convert to actual PNG
  const svgPath = path.join(iconsDir, `${icon}.svg`);
  fs.writeFileSync(svgPath, svgContent);

  // Create a simple placeholder PNG file (just a text file for now)
  // This ensures the .png file exists to prevent 404 errors
  fs.writeFileSync(
    iconPath,
    `PNG placeholder for ${icon} icon. Replace with actual PNG file or use ${icon}.svg instead.`
  );
  console.log(`Created placeholder PNG and SVG for: ${icon}`);
});

console.log('Done creating icon placeholders.');