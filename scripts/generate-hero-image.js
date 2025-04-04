// const fs = require('fs');
// const path = require('path');

// // Create public directory if it doesn't exist
// const publicDir = path.join(__dirname, '../public');
// if (!fs.existsSync(publicDir)) {
//   fs.mkdirSync(publicDir, { recursive: true });
// }

// // Create a simple SVG hero image
// const svgContent = `
// <svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg">
//   <defs>
//     <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
//       <stop offset="0%" style="stop-color:#547264;stop-opacity:1" />
//       <stop offset="100%" style="stop-color:#2D3E4A;stop-opacity:1" />
//     </linearGradient>
//     <filter id="noise" x="0%" y="0%" width="100%" height="100%">
//       <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise"/>
//       <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"/>
//     </filter>
//   </defs>
//   <rect width="1600" height="900" fill="url(#grad)" filter="url(#noise)"/>
//   <circle cx="1400" cy="200" r="150" fill="rgba(255,255,255,0.1)"/>
//   <circle cx="200" cy="700" r="100" fill="rgba(255,255,255,0.05)"/>
//   <text x="800" y="450" font-family="Arial" font-size="80" fill="white" text-anchor="middle" font-weight="bold">
//     Studio Clay
//   </text>
//   <text x="800" y="520" font-family="Arial" font-size="30" fill="rgba(255,255,255,0.7)" text-anchor="middle">
//     Pottery · Workshops · Creative Space
//   </text>
// </svg>`;

// const filePath = path.join(publicDir, 'hero-image.svg');
// fs.writeFileSync(filePath, svgContent);

// console.log('Hero image placeholder created at: public/hero-image.svg'); 