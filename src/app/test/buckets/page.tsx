'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function BucketTestPage() {
  const [checkResults, setCheckResults] = useState<any>(null);
  const [createResults, setCreateResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<{ check: boolean; create: boolean }>({
    check: false,
    create: false,
  });

  const checkBuckets = async () => {
    setLoading((prev) => ({ ...prev, check: true }));
    setError(null);
    
    try {
      const response = await fetch('/api/test/check-buckets');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCheckResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading((prev) => ({ ...prev, check: false }));
    }
  };

  const createBuckets = async () => {
    setLoading((prev) => ({ ...prev, create: true }));
    setError(null);
    
    try {
      const response = await fetch('/api/test/create-buckets', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setCreateResults(data);
      
      // Refresh the check results after creating buckets
      checkBuckets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading((prev) => ({ ...prev, create: false }));
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Storage Bucket Management</h1>
      <p className="mb-8 text-muted-foreground">
        This utility helps verify and fix Supabase storage buckets required by the application.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Storage Bucket Operations</CardTitle>
            <CardDescription>
              Check bucket status or create missing buckets
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button 
              onClick={checkBuckets} 
              disabled={loading.check}
              variant="outline"
            >
              {loading.check ? 'Checking...' : 'Check Buckets'}
            </Button>
            <Button 
              onClick={createBuckets} 
              disabled={loading.create}
            >
              {loading.create ? 'Creating...' : 'Create Missing Buckets'}
            </Button>
          </CardContent>
        </Card>

        {(checkResults || createResults) && (
          <Tabs defaultValue="check">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="check">Check Results</TabsTrigger>
              <TabsTrigger value="create">Create Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="check">
              {checkResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bucket Check Results</CardTitle>
                    <CardDescription>
                      Status of required storage buckets
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Required Buckets:</h3>
                        <ul className="list-disc pl-5">
                          {checkResults.requiredBuckets?.map((bucket: any) => (
                            <li key={bucket.name} className="mb-1">
                              <span className={bucket.exists ? 'text-green-600' : 'text-red-600'}>
                                {bucket.name}
                              </span>
                              {bucket.exists && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  ({bucket.fileCount} files)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">All Buckets:</h3>
                        <ul className="list-disc pl-5">
                          {checkResults.allBuckets?.map((bucket: any) => (
                            <li key={bucket} className="mb-1">{bucket}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Last checked: {new Date().toLocaleString()}
                    </p>
                  </CardFooter>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="create">
              {createResults && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bucket Creation Results</CardTitle>
                    <CardDescription>
                      Status: {createResults.success ? 'Success' : 'Incomplete'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {createResults.message && (
                        <Alert variant={createResults.success ? "default" : "warning"}>
                          <AlertTitle>Status</AlertTitle>
                          <AlertDescription>{createResults.message}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div>
                        <h3 className="font-semibold mb-2">Created Buckets:</h3>
                        {createResults.created?.length > 0 ? (
                          <ul className="list-disc pl-5">
                            {createResults.created.map((result: any) => (
                              <li key={result.bucket} className="mb-1">
                                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                                  {result.bucket}
                                </span>
                                {!result.success && result.error && (
                                  <span className="text-sm text-red-600 ml-2">
                                    Error: {result.error}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No buckets needed to be created</p>
                        )}
                      </div>
                      
                      {createResults.stillMissing?.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 text-red-600">Still Missing:</h3>
                          <ul className="list-disc pl-5">
                            {createResults.stillMissing.map((bucket: string) => (
                              <li key={bucket} className="mb-1 text-red-600">{bucket}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      Last operation: {new Date().toLocaleString()}
                    </p>
                  </CardFooter>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
} 