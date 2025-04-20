import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/utils/supabase';
import { logError, logInfo } from '@/lib/logging';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test endpoint för att kontrollera innehåll i storage buckets
 * Endast tillgänglig i utvecklingsläge
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
  const bucketNames = ['invoices', 'giftcards'];
  const results: Record<string, any> = {};
  
  try {
    logInfo('Checking storage content', { requestId });
    const supabase = createServerSupabaseClient();
    
    // Kontrollera bucket existens först
    const { data: buckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketError) {
      throw new Error(`Failed to list buckets: ${bucketError.message}`);
    }
    
    const existingBuckets = buckets.map(b => b.name);
    
    // Loop genom buckets och lista innehåll
    for (const bucketName of bucketNames) {
      if (!existingBuckets.includes(bucketName)) {
        results[bucketName] = {
          exists: false,
          error: `Bucket does not exist`
        };
        continue;
      }
      
      results[bucketName] = { exists: true };
      
      try {
        // Lista filer i bucket
        const { data: files, error: listError } = await supabase
          .storage
          .from(bucketName)
          .list();
          
        if (listError) {
          results[bucketName].error = `Failed to list files: ${listError.message}`;
          continue;
        }
        
        results[bucketName].fileCount = files.length;
        results[bucketName].files = files.map(file => {
          // Hämta publik URL för varje fil
          const { data: urlData } = supabase
            .storage
            .from(bucketName)
            .getPublicUrl(file.name);
            
          return {
            name: file.name,
            size: file.metadata?.size || 'unknown',
            created: file.created_at,
            publicUrl: urlData?.publicUrl || null
          };
        });
      } catch (error) {
        results[bucketName].error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Storage content check completed',
      buckets: results,
      tip: 'If no files are found, make sure buckets are configured properly by using /api/test/setup-storage'
    });
  } catch (error) {
    logError('Error checking storage content', { 
      requestId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to check storage content', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 