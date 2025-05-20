// This is a script to create placeholder icons
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

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log(`Created directory: ${iconsDir}`);
}

// Create a simple placeholder for each icon
icons.forEach(icon => {
  const iconPath = path.join(iconsDir, `${icon}.png`);
  
  // Skip if the file already exists
  if (fs.existsSync(iconPath)) {
    console.log(`Icon already exists: ${iconPath}`);
    return;
  }
  
  // Create a simple text file as a placeholder
  // In a real app, you would create actual PNG files
  fs.writeFileSync(
    iconPath, 
    `This is a placeholder for the ${icon} icon. Replace with an actual PNG file.`
  );
  console.log(`Created placeholder for: ${iconPath}`);
});

console.log('Done creating icon placeholders.');