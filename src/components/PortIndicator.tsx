'use client';

import { useState, useEffect } from 'react';

interface ServerInfo {
  port: string | number;
  portName?: string;
  baseUrl: string;
}

export default function PortIndicator() {
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    async function fetchServerInfo() {
      try {
        const response = await fetch('/api/server-info');
        const data = await response.json();
        
        if (data.success && data.serverInfo) {
          setServerInfo(data.serverInfo);
        } else {
          setError('Failed to get server port info');
        }
      } catch (err) {
        console.error('Error fetching server info:', err);
        setError('Error connecting to server');
      } finally {
        setLoading(false);
      }
    }
    
    fetchServerInfo();
  }, []);
  
  // Don't show anything while loading
  if (loading) return null;
  
  // Don't show errors to avoid cluttering the UI
  if (error || !serverInfo) return null;
  
  // Check if this is the primary port or a fallback
  const portDisplayName = serverInfo.portName || 'Port';
  const isPrimary = portDisplayName?.toLowerCase().includes('primary');
  
  return (
    <div className="relative inline-flex items-center" 
         onMouseEnter={() => setShowTooltip(true)}
         onMouseLeave={() => setShowTooltip(false)}
         onTouchStart={() => setShowTooltip(!showTooltip)}>
      
      {/* Just the dot with port number */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full animate-pulse 
          ${isPrimary ? 'bg-green-500 dark:bg-green-400' : 'bg-amber-500 dark:bg-amber-400'}`} 
          aria-hidden="true"></span>
        
      </div>
      
      {/* Tooltip that appears on hover */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-10 
                       bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                       shadow-lg rounded-md py-1.5 px-3 whitespace-nowrap text-xs">
          <div className="font-medium text-gray-900 dark:text-gray-100">{portDisplayName}</div>
          <div className="text-gray-500 dark:text-gray-400">
            {isPrimary ? 'Primary port' : 'Fallback port'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {serverInfo.baseUrl}
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 
                         rotate-45 w-2 h-2 bg-white dark:bg-gray-800 border-b border-r 
                         border-gray-200 dark:border-gray-700"></div>
        </div>
      )}
    </div>
  );
} 