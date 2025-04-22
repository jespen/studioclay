import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logInfo, logError, logDebug } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test endpoint to check storage bucket policies and permissions
 * This will help troubleshoot why bucket storage is failing in production
 */
export async function GET() {
  const requestId = uuidv4();
  
  try {
    logInfo('Checking storage bucket policies', { requestId });
    const supabase = createServerSupabaseClient();
    
    // Test buckets
    const bucketNames = ['invoices', 'giftcards'];
    const results: Record<string, any> = {};
    
    // Check each bucket
    for (const bucketName of bucketNames) {
      logInfo(`Checking bucket: ${bucketName}`, { requestId });
      
      // 1. Check if the bucket exists
      const { data: bucket, error: bucketError } = await supabase
        .storage
        .getBucket(bucketName);
        
      if (bucketError) {
        logError(`Error getting bucket ${bucketName}`, {
          requestId,
          error: bucketError.message
        });
        
        results[bucketName] = {
          exists: false,
          error: bucketError.message
        };
        continue;
      }
      
      // 2. Try to upload a test file
      const testContent = `Test file created at ${new Date().toISOString()}`;
      const testFileName = `test-file-${Date.now()}.txt`;
      
      try {
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from(bucketName)
          .upload(testFileName, testContent, {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (uploadError) {
          logError(`Failed to upload test file to ${bucketName}`, {
            requestId,
            error: uploadError.message
          });
          
          results[bucketName] = {
            exists: true,
            canUpload: false,
            isPublic: bucket.public,
            allowedMimeTypes: bucket.allowed_mime_types,
            error: uploadError.message
          };
        } else {
          logInfo(`Successfully uploaded test file to ${bucketName}`, {
            requestId,
            path: uploadData.path
          });
          
          // 3. Try to get a public URL
          const { data: urlData } = await supabase
            .storage
            .from(bucketName)
            .getPublicUrl(uploadData.path);
            
          // 4. Try to delete the test file
          const { error: deleteError } = await supabase
            .storage
            .from(bucketName)
            .remove([uploadData.path]);
            
          results[bucketName] = {
            exists: true,
            canUpload: true,
            publicUrl: urlData?.publicUrl,
            hasPublicUrl: !!urlData?.publicUrl,
            isPublic: bucket.public,
            allowedMimeTypes: bucket.allowed_mime_types,
            deleteSuccessful: !deleteError,
            deleteError: deleteError?.message
          };
          
          logInfo(`Completed test for bucket ${bucketName}`, {
            requestId,
            hasPublicUrl: !!urlData?.publicUrl
          });
        }
      } catch (error) {
        logError(`Exception testing bucket ${bucketName}`, {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        results[bucketName] = {
          exists: true,
          canUpload: false,
          isPublic: bucket.public,
          allowedMimeTypes: bucket.allowed_mime_types,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    // Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      isDevelopment: process.env.NODE_ENV === 'development',
      isProduction: process.env.NODE_ENV === 'production'
    };
    
    return NextResponse.json({
      success: true,
      message: 'Storage bucket policy check completed',
      results,
      environment: envCheck
    });
    
  } catch (error) {
    logError('Error checking storage bucket policies', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error checking storage bucket policies' },
      { status: 500 }
    );
  }
} 