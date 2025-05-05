'use client';

import { useState } from 'react';
import axios from 'axios';

export default function OllamaTest() {
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testOllamaModels = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('http://localhost:11434/api/tags');
      setResult(JSON.stringify(response.data, null, 2));
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded mt-8">
      <h2 className="text-xl font-bold mb-4">Ollama Direct Test</h2>
      <button 
        onClick={testOllamaModels}
        disabled={loading}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-green-300"
      >
        Test Ollama Connection
      </button>
      
      {loading && <p className="mt-2">Testing...</p>}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {result && (
        <div className="mt-4">
          <h3 className="font-bold">Result:</h3>
          <pre className="p-3 bg-gray-100 rounded overflow-auto max-h-60">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}