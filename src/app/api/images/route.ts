import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Path to the pictures folder
    const picturesDir = path.join(process.cwd(), 'public', 'pictures');
    
    // Read directory contents
    const files = fs.readdirSync(picturesDir);
    
    // Filter to only include image files
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
    });
    
    // Convert to URLs
    const imageUrls = imageFiles.map(file => `/pictures/${file}`);
    
    // Sort alphabetically to make the list consistent
    imageUrls.sort();
    
    // Ensure gronvas.jpg is first if it exists
    const gronvasIndex = imageUrls.findIndex(url => url.includes('gronvas.jpg'));
    if (gronvasIndex > 0) {
      const gronvas = imageUrls.splice(gronvasIndex, 1)[0];
      imageUrls.unshift(gronvas);
    }
    
    return NextResponse.json({ images: imageUrls });
  } catch (error) {
    console.error('Error reading pictures directory:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve images' },
      { status: 500 }
    );
  }
} 