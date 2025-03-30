// const fs = require('fs');
// const path = require('path');

// // Create directories if they don't exist
// const galleryDir = path.join(__dirname, '../public/gallery');
// if (!fs.existsSync(galleryDir)) {
//   fs.mkdirSync(galleryDir, { recursive: true });
// }

// // Image file names based on our gallery component
// const imageFiles = [
//   { name: 'ceramic-bowls.jpg', color: '#8D6E63' },
//   { name: 'clay-vases.jpg', color: '#A1887F' },
//   { name: 'pottery-workshop.jpg', color: '#6D4C41' },
//   { name: 'hand-sculpting.jpg', color: '#795548' },
//   { name: 'glazed-mugs.jpg', color: '#5D4037' },
//   { name: 'clay-sculptures.jpg', color: '#4E342E' },
//   { name: 'studio-space.jpg', color: '#3E2723' },
//   { name: 'children-class.jpg', color: '#8D6E63' },
//   { name: 'handmade-plates.jpg', color: '#A1887F' },
//   { name: 'artistic-sculptures.jpg', color: '#6D4C41' },
//   { name: 'pottery-wheel-session.jpg', color: '#795548' },
//   { name: 'corporate-workshop.jpg', color: '#5D4037' },
//   { name: 'ceramic-teapots.jpg', color: '#4E342E' },
//   { name: 'studio-equipment.jpg', color: '#3E2723' },
//   { name: 'glaze-application.jpg', color: '#8D6E63' },
//   { name: 'decorative-piece.jpg', color: '#A1887F' },
//   { name: 'group-class.jpg', color: '#6D4C41' },
//   { name: 'clay-preparation.jpg', color: '#795548' },
//   { name: 'finished-pieces.jpg', color: '#5D4037' },
//   { name: 'kiln-room.jpg', color: '#4E342E' },
// ];

// // Create SVG placeholder images
// const generateSvgPlaceholder = (image) => {
//   const { name, color } = image;
//   const title = name.replace('.jpg', '').split('-').map(word => 
//     word.charAt(0).toUpperCase() + word.slice(1)
//   ).join(' ');

//   // Generate a pattern to make it look more like a photo
//   const svgContent = `
// <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
//   <defs>
//     <pattern id="pattern" width="40" height="40" patternUnits="userSpaceOnUse">
//       <rect width="40" height="40" fill="${color}" />
//       <circle cx="20" cy="20" r="15" fill="${darken(color, 20)}" />
//     </pattern>
//   </defs>
//   <rect width="800" height="600" fill="url(#pattern)" />
//   <rect width="800" height="150" fill="rgba(0,0,0,0.5)" y="450" />
//   <text x="400" y="520" font-family="Arial" font-size="32" fill="white" text-anchor="middle" font-weight="bold">
//     ${title}
//   </text>
//   <rect width="150" height="30" fill="${lighten(color, 20)}" x="325" y="70" rx="5" />
//   <text x="400" y="90" font-family="Arial" font-size="16" fill="${darken(color, 40)}" text-anchor="middle">
//     Studio Clay
//   </text>
// </svg>`;

//   const filePath = path.join(galleryDir, name.replace('.jpg', '.svg'));
//   fs.writeFileSync(filePath, svgContent);
//   console.log(`Created SVG placeholder for: ${name}`);
// };

// // Helper functions to lighten and darken colors
// function lighten(color, amount) {
//   return adjustColor(color, amount);
// }

// function darken(color, amount) {
//   return adjustColor(color, -amount);
// }

// function adjustColor(color, amount) {
//   // Remove the '#' character from the color string
//   const hex = color.replace('#', '');
  
//   // Parse the hex color to RGB
//   const r = parseInt(hex.substring(0, 2), 16);
//   const g = parseInt(hex.substring(2, 4), 16);
//   const b = parseInt(hex.substring(4, 6), 16);
  
//   // Adjust each color component
//   const adjustedR = Math.max(0, Math.min(255, r + amount));
//   const adjustedG = Math.max(0, Math.min(255, g + amount));
//   const adjustedB = Math.max(0, Math.min(255, b + amount));
  
//   // Convert back to hex and return
//   return `#${componentToHex(adjustedR)}${componentToHex(adjustedG)}${componentToHex(adjustedB)}`;
// }

// function componentToHex(c) {
//   const hex = c.toString(16);
//   return hex.length === 1 ? '0' + hex : hex;
// }

// // Generate all SVG placeholders
// imageFiles.forEach(generateSvgPlaceholder);

// console.log('All SVG placeholder images have been generated in the public/gallery directory.');
// console.log('NOTE: These are SVG placeholders. In a real scenario, replace with actual images from Instagram.'); 