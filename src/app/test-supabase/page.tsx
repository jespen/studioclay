'use client';

import { useState, useEffect } from 'react';
import { getBrowserSupabaseInstance } from '@/utils/supabase';

export default function TestSupabasePage() {
  const [clientResult, setClientResult] = useState<any>(null);
  const [serverResult, setServerResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testClientSide = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = getBrowserSupabaseInstance();
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      
      setClientResult({
        success: true,
        hasData: data && data.length > 0,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Client test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setClientResult({ success: false });
    } finally {
      setLoading(false);
    }
  };

  const testServerSide = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test-supabase');
      const result = await response.json();
      
      setServerResult(result);
    } catch (err) {
      console.error('Server test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setServerResult({ success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Client-side Test</h2>
          <button
            onClick={testClientSide}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            {loading ? 'Testing...' : 'Test Client Connection'}
          </button>
          
          {clientResult && (
            <div className="mt-4">
              <h3 className="font-semibold">Result:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(clientResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Server-side Test</h2>
          <button
            onClick={testServerSide}
            disabled={loading}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-4"
          >
            {loading ? 'Testing...' : 'Test Server Connection'}
          </button>
          
          {serverResult && (
            <div className="mt-4">
              <h3 className="font-semibold">Result:</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(serverResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 