import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logInfo, logError, logDebug, logWarning } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test utility to check and setup storage buckets for PDFs
 * Only available in development mode
 */
export async function GET() {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  const requestId = uuidv4();
  const requiredBuckets = ['invoices', 'giftcards'];
  const results: Record<string, { exists: boolean; created?: boolean; error?: string }> = {};
  
  try {
    logInfo('Checking storage buckets', { requestId });
    const supabase = createServerSupabaseClient();
    
    // Get existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logError('Failed to list buckets', { requestId, error: listError.message });
      return NextResponse.json(
        { error: `Failed to list buckets: ${listError.message}` },
        { status: 500 }
      );
    }
    
    const existingBuckets = buckets.map(b => b.name);
    logDebug(`Found existing buckets: ${existingBuckets.join(', ')}`, { requestId });
    
    // Check each required bucket
    for (const bucketName of requiredBuckets) {
      const exists = existingBuckets.includes(bucketName);
      results[bucketName] = { exists };
      
      if (!exists) {
        logInfo(`Creating missing bucket: ${bucketName}`, { requestId });
        
        try {
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true // Make publicly accessible for PDFs that need direct access
          });
          
          if (createError) {
            logError(`Failed to create bucket ${bucketName}`, { 
              requestId, 
              error: createError.message 
            });
            results[bucketName].error = createError.message;
          } else {
            logInfo(`Successfully created bucket ${bucketName}`, { requestId });
            results[bucketName].created = true;
            
            // Make bucket publicly accessible
            logInfo(`Setting bucket ${bucketName} to public access`, { requestId });
            try {
              const { error: updateError } = await supabase
                .storage
                .updateBucket(bucketName, { 
                  public: true,
                  allowedMimeTypes: ['application/pdf']
                });
              
              if (updateError) {
                logWarning(`Error making bucket ${bucketName} public`, {
                  requestId, 
                  error: updateError.message
                });
              } else {
                logInfo(`Successfully set bucket ${bucketName} to public access`, { requestId });
              }
            } catch (policyError) {
              logWarning(`Exception updating bucket ${bucketName}`, {
                requestId,
                error: policyError instanceof Error ? policyError.message : 'Unknown policy error'
              });
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logError(`Exception creating bucket ${bucketName}`, { 
            requestId, 
            error: errorMessage 
          });
          results[bucketName].error = errorMessage;
        }
      }
    }
    
    // Final check to verify all buckets
    const { data: finalBuckets, error: finalListError } = await supabase.storage.listBuckets();
    
    if (finalListError) {
      logError('Failed to list buckets after creation', { 
        requestId, 
        error: finalListError.message 
      });
    } else {
      const finalExistingBuckets = finalBuckets.map(b => b.name);
      const allExist = requiredBuckets.every(bucket => finalExistingBuckets.includes(bucket));
      
      if (allExist) {
        logInfo('All required buckets exist', { requestId });
      } else {
        const missing = requiredBuckets.filter(bucket => !finalExistingBuckets.includes(bucket));
        logWarning(`Some buckets still missing: ${missing.join(', ')}`, { requestId });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Storage bucket check completed',
      results,
      hint: 'If any buckets are missing or had errors, check the Supabase dashboard'
    });
    
  } catch (error) {
    logError('Error checking storage buckets', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { error: 'Internal server error checking storage buckets', results },
      { status: 500 }
    );
  }
} 