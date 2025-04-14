import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/utils/supabase-server';
import { logError, logInfo } from '@/utils/logger';

// List of bucket names required by the application
const REQUIRED_BUCKETS = ['invoices', 'giftcards', 'products'];

/**
 * Test endpoint to check if required buckets exist and display their information
 * This helps debug storage-related issues
 */
export async function GET() {
  const requestId = uuidv4();
  logInfo({
    message: 'Checking storage buckets',
    requestId,
  });

  try {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is not available in production' },
        { status: 403 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // List existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logError({
        message: 'Failed to list storage buckets',
        error: listError,
        requestId,
      });
      
      return NextResponse.json(
        { error: 'Failed to list storage buckets', details: listError.message },
        { status: 500 }
      );
    }
    
    // Get existing bucket names
    const existingBuckets = buckets.map((bucket) => bucket.name);
    
    // Determine which buckets are missing
    const missingBuckets = REQUIRED_BUCKETS.filter(
      (bucketName) => !existingBuckets.includes(bucketName)
    );
    
    // Count files in each required bucket
    const bucketsWithCounts = await Promise.all(
      REQUIRED_BUCKETS.map(async (bucketName) => {
        if (!existingBuckets.includes(bucketName)) {
          return {
            name: bucketName,
            exists: false,
            fileCount: 0
          };
        }
        
        try {
          const { data, error } = await supabase.storage.from(bucketName).list();
          
          if (error) {
            return {
              name: bucketName,
              exists: true,
              fileCount: 'Error counting files',
              error: error.message
            };
          }
          
          return {
            name: bucketName,
            exists: true,
            fileCount: data?.length || 0
          };
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          
          return {
            name: bucketName,
            exists: true,
            fileCount: 'Error counting files',
            error: errorMessage
          };
        }
      })
    );
    
    logInfo({
      message: 'Bucket check completed',
      bucketsWithCounts,
      requestId,
    });
    
    return NextResponse.json({
      allRequiredBucketsExist: missingBuckets.length === 0,
      requiredBuckets: bucketsWithCounts,
      existingBuckets,
      missingBuckets,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError({
      message: 'Error checking storage buckets',
      error: errorMessage,
      requestId,
    });
    
    return NextResponse.json(
      { error: 'Failed to check storage buckets', details: errorMessage },
      { status: 500 }
    );
  }
} 