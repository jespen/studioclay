import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client for backend operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Constants
const BUCKET_NAME = 'course-assets';

// Check if bucket exists, create it if it doesn't
const initializeBucket = async () => {
  try {
    // Check if the bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true, // Make files publicly accessible
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
        return false;
      }
      
      console.log(`Created storage bucket: ${BUCKET_NAME}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing bucket:', error);
    return false;
  }
};

// Ensure bucket exists on module load
(async () => {
  await initializeBucket();
})();

// GET - Fetch image by path
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }
  
  try {
    // Get public URL
    const { data } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error('Error getting image URL:', error);
    return NextResponse.json({ error: 'Failed to get image URL' }, { status: 500 });
  }
}

// POST - Upload image
export async function POST(request: NextRequest) {
  try {
    // Initialize bucket if it doesn't exist
    const bucketInitialized = await initializeBucket();
    if (!bucketInitialized) {
      return NextResponse.json({ error: 'Failed to initialize storage bucket' }, { status: 500 });
    }
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `course-images/${Date.now()}.${fileExt}`;
    
    // Convert file to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);
    
    return NextResponse.json({ 
      success: true, 
      path: fileName,
      url: publicUrl
    });
  } catch (error) {
    console.error('Unexpected error during upload:', error);
    return NextResponse.json({ error: 'Failed to process upload request' }, { status: 500 });
  }
}

// DELETE - Remove image
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');
  
  if (!path) {
    return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 });
  }
  
  try {
    // Delete file from storage
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([path]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error during deletion:', error);
    return NextResponse.json({ error: 'Failed to process deletion request' }, { status: 500 });
  }
} 