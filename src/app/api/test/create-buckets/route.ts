import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/utils/supabase-server';
import { logError, logInfo } from '@/utils/logger';

// List of bucket names required by the application
const REQUIRED_BUCKETS = ['invoices', 'giftcards', 'products'];

/**
 * Test endpoint to create any missing required buckets for the application
 * This helps setup or fix storage-related issues
 */
export async function POST() {
  const requestId = uuidv4();
  logInfo({
    message: 'Creating missing storage buckets',
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
    const existingBuckets = buckets.map(bucket => bucket.name);
    
    // Determine which buckets need to be created
    const missingBuckets = REQUIRED_BUCKETS.filter(
      bucketName => !existingBuckets.includes(bucketName)
    );
    
    // Create missing buckets
    const creationResults = await Promise.all(
      missingBuckets.map(async (bucketName) => {
        try {
          const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: false,  // Set to true if files should be publicly accessible
          });
          
          if (error) {
            return {
              name: bucketName,
              success: false,
              error: error.message,
            };
          }
          
          return {
            name: bucketName,
            success: true,
          };
        } catch (createError) {
          const errorMessage = createError instanceof Error 
            ? createError.message 
            : 'Unknown error';
            
          return {
            name: bucketName,
            success: false,
            error: errorMessage,
          };
        }
      })
    );
    
    // Check final status of all required buckets
    const { data: updatedBuckets } = await supabase.storage.listBuckets();
    const updatedBucketNames = updatedBuckets?.map(bucket => bucket.name) || [];
    
    logInfo({
      message: 'Bucket creation process completed',
      createdBuckets: creationResults,
      requestId,
    });
    
    return NextResponse.json({
      createdBuckets: creationResults,
      allBuckets: updatedBucketNames,
      remainingMissingBuckets: REQUIRED_BUCKETS.filter(
        bucket => !updatedBucketNames.includes(bucket)
      ),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logError({
      message: 'Error creating storage buckets',
      error: errorMessage,
      requestId,
    });
    
    return NextResponse.json(
      { error: 'Failed to create storage buckets', details: errorMessage },
      { status: 500 }
    );
  }
} 