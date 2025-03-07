// Type definitions for Instagram API responses
export interface InstagramPost {
  id: string;
  caption: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username: string;
}

export interface InstagramApiResponse {
  posts: InstagramPost[];
  error?: string;
}

// Function to fetch Instagram posts from our Next.js API route
export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    const response = await fetch(`${apiUrl}/instagram`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram posts: ${response.statusText}`);
    }
    
    const data: InstagramApiResponse = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.posts || [];
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return [];
  }
}

// Function to categorize Instagram posts based on caption content
export function categorizeInstagramPosts(posts: InstagramPost[]): Record<string, InstagramPost[]> {
  const categoriesKeywords: Record<string, string[]> = {
    'pottery': ['pottery', 'ceramic', 'clay', 'bowl', 'plate', 'cup', 'mug', 'vase'],
    'workshops': ['workshop', 'class', 'learn', 'teaching', 'student', 'course'],
    'artistic': ['art', 'sculpture', 'artist', 'creative', 'design'],
    'process': ['process', 'making', 'glazing', 'kiln', 'throwing', 'wheel'],
    'studio': ['studio', 'space', 'equipment'],
    'decorative': ['decor', 'home', 'decoration', 'ornament']
  };
  
  // Initialize categories
  const categories: Record<string, InstagramPost[]> = {
    'all': posts,
    'pottery': [],
    'workshops': [],
    'artistic': [],
    'process': [],
    'studio': [],
    'decorative': [],
  };
  
  // Categorize posts based on caption content
  posts.forEach(post => {
    const caption = post.caption?.toLowerCase() || '';
    
    Object.entries(categoriesKeywords).forEach(([category, keywords]) => {
      if (keywords.some(keyword => caption.includes(keyword))) {
        categories[category].push(post);
      }
    });
    
    // If post didn't match any category, add to artistic as default
    const isUncategorized = Object.keys(categoriesKeywords).every(category => 
      !categories[category].includes(post)
    );
    
    if (isUncategorized && post.caption) {
      categories['artistic'].push(post);
    }
  });
  
  return categories;
} 