import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET_NAME = 'pictures';

// Ensure bucket exists with proper permissions
async function ensureBucketExists() {
  try {
    // Check if bucket already exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // Create bucket with public access
      const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }
      
      console.log(`Created new bucket: ${BUCKET_NAME}`);
    }
    
    // Update bucket to ensure it's public
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (updateError) {
      console.error('Error updating bucket settings:', updateError);
      return false;
    }
    
    // Set a public policy for the bucket (allow anyone to read)
    try {
      // First check if the policy already exists
      const { data: policies } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);
      
      // If public access isn't already set up, create a policy for it
      if (!policies?.public) {
        const { error: policyError } = await supabaseAdmin.storage.from(BUCKET_NAME)
          .createSignedUrls(['test.jpg'], 60); // This is a workaround to test if we can create signed URLs
        
        if (policyError) {
          console.error('Warning: Unable to create signed URLs, may need to set policies in Supabase console:', policyError);
        }
      }
    } catch (policyError) {
      console.error('Error checking/setting bucket policy:', policyError);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    return false;
  }
}

// Function to serve image directly from Supabase instead of using public URL
async function proxyImage(imageName: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .download(imageName);
      
    if (error) {
      console.error('Error downloading image:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error proxying image:', error);
    return null;
  }
}

// Get all images from the pictures bucket
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const imageName = url.searchParams.get('image');
    
    // If requesting a specific image, proxy it directly
    if (imageName) {
      const imageData = await proxyImage(imageName);
      if (!imageData) {
        return NextResponse.json(
          { error: 'Image not found' },
          { status: 404 }
        );
      }
      
      // Return the image with the appropriate content type
      return new NextResponse(imageData, {
        headers: {
          'Content-Type': imageName.endsWith('.svg') ? 'image/svg+xml' :
                          imageName.endsWith('.png') ? 'image/png' :
                          imageName.endsWith('.gif') ? 'image/gif' :
                          imageName.endsWith('.webp') ? 'image/webp' :
                          'image/jpeg',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Otherwise, list all images
    const bucketExists = await ensureBucketExists();
    if (!bucketExists) {
      return NextResponse.json(
        { error: 'Failed to access storage bucket' },
        { status: 500 }
      );
    }
    
    // List files in the pictures bucket
    const { data, error } = await supabaseAdmin.storage.from(BUCKET_NAME).list();
    
    if (error) {
      console.error('Error listing files:', error);
      return NextResponse.json(
        { error: 'Failed to list images' },
        { status: 500 }
      );
    }
    
    // Filter image files
    const imageFiles = data.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.endsWith('.jpg') || 
             fileName.endsWith('.jpeg') || 
             fileName.endsWith('.png') || 
             fileName.endsWith('.gif') || 
             fileName.endsWith('.webp') || 
             fileName.endsWith('.svg');
    });
    
    // Create URLs through our own API proxy instead of direct Supabase URLs
    const baseUrl = request.nextUrl.origin;
    const imageUrls = imageFiles.map(file => 
      `${baseUrl}/api/storage/pictures/proxy/${file.name}`
    );
    
    return NextResponse.json({ images: imageUrls });
  } catch (error) {
    console.error('Error fetching images from storage:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve images from storage' },
      { status: 500 }
    );
  }
}

// Upload an image to the pictures bucket
export async function POST(request: NextRequest) {
  try {
    const bucketExists = await ensureBucketExists();
    if (!bucketExists) {
      return NextResponse.json(
        { error: 'Failed to access storage bucket' },
        { status: 500 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large (max 10MB)' },
        { status: 400 }
      );
    }
    
    // Generate a unique filename
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, arrayBuffer, {
        contentType: fileType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return NextResponse.json(
        { error: `Failed to upload image: ${error.message}` },
        { status: 500 }
      );
    }
    
    // Return our proxy URL instead of direct Supabase URL
    const baseUrl = request.nextUrl.origin;
    const proxyUrl = `${baseUrl}/api/storage/pictures/proxy/${fileName}`;
    
    return NextResponse.json({ url: proxyUrl });
  } catch (error) {
    console.error('Error uploading image to storage:', error);
    return NextResponse.json(
      { error: 'Failed to upload image to storage' },
      { status: 500 }
    );
  }
} 