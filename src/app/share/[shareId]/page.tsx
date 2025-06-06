'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ChatMessage from '@/components/ChatMessage';
import { MessageSquare, ArrowLeft, Download, Copy, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface SharedConversation {
  _id: string;
  title: string;
  messages: Message[];
  model: string;
  shareSettings: {
    isPublic: boolean;
    expiresAt: string | null;
  };
}

export default function SharedConversationPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [conversation, setConversation] = useState<SharedConversation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        // Get MongoDB URI from localStorage if available
        const storedMongoUri = typeof window !== 'undefined' 
          ? localStorage.getItem('MONGODB_URI') || '' 
          : '';
            
        console.log('Fetching shared conversation with ID:', shareId);
        const response = await fetch(`/api/share/${shareId}`, {
          headers: {
            'X-MongoDB-URI': storedMongoUri
          }
        });
        
        console.log('Shared conversation API response status:', response.status);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Conversation not found or share link expired');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to view this conversation');
          } else {
            throw new Error('Failed to load conversation');
          }
        }
        
        const data = await response.json();
        console.log('Shared conversation API response:', data.success ? 'Success' : 'Failed');
        
        if (data.success && data.conversation) {
          setConversation(data.conversation);
        } else {
          throw new Error(data.error || 'Failed to load conversation');
        }
      } catch (error) {
        console.error('Error loading shared conversation:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    if (shareId) {
      fetchConversation();
    }
  }, [shareId]);
  
  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  const exportAsTxt = () => {
    if (!conversation) return;
    
    // Format conversation as text
    let textContent = `${conversation.title}\n\n`;
    
    conversation.messages.forEach(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      textContent += `${role}: ${message.content}\n\n`;
    });
    
    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
  };
  
  const exportAsPdf = async () => {
    if (!conversation) return;
    
    try {
      // Create a div with inline styles to avoid cross-origin CSS issues
      const contentDiv = document.createElement('div');
      contentDiv.style.backgroundColor = '#ffffff';
      contentDiv.style.padding = '32px';
      contentDiv.style.width = '800px';
      contentDiv.style.fontFamily = 'Arial, sans-serif';
      contentDiv.style.position = 'absolute';
      contentDiv.style.left = '-9999px';
      contentDiv.style.top = '-9999px';
      
      // Add title with inline styles
      const titleEl = document.createElement('h1');
      titleEl.style.fontSize = '24px';
      titleEl.style.fontWeight = 'bold';
      titleEl.style.marginBottom = '24px';
      titleEl.style.color = '#111827';
      titleEl.textContent = conversation.title;
      contentDiv.appendChild(titleEl);
      
      // Add messages with inline styles
      conversation.messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.style.marginBottom = '32px';
        
        const roleDiv = document.createElement('div');
        roleDiv.style.fontWeight = 'bold';
        roleDiv.style.fontSize = '18px';
        roleDiv.style.marginBottom = '8px';
        roleDiv.style.color = message.role === 'user' ? '#1d4ed8' : '#047857';
        roleDiv.textContent = message.role === 'user' ? 'User:' : 'Assistant:';
        messageDiv.appendChild(roleDiv);
        
        const contentP = document.createElement('div');
        contentP.style.whiteSpace = 'pre-wrap';
        contentP.style.color = '#1f2937';
        contentP.style.lineHeight = '1.5';
        contentP.textContent = message.content;
        messageDiv.appendChild(contentP);
        
        contentDiv.appendChild(messageDiv);
      });
      
      // Add to document temporarily
      document.body.appendChild(contentDiv);
      
      // Use html2canvas with options to avoid cross-origin issues
      const canvas = await html2canvas(contentDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
        removeContainer: true,
        ignoreElements: (element) => {
          // Ignore any elements that might cause cross-origin issues
          return element.tagName === 'LINK' || element.tagName === 'STYLE';
        },
      });
      
      // Clean up
      document.body.removeChild(contentDiv);
      
      const imgData = canvas.toDataURL('image/png');
      
      // Initialize PDF with proper dimensions
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate scale to fit content while maintaining aspect ratio
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Top margin
      
      // Add image of conversation to PDF
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Save PDF
      const fileName = `${conversation.title.replace(/[^a-zA-Z0-9]/g, '_')}_conversation.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting as PDF:', error);
      alert('Failed to export PDF. Check console for details.');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse flex space-x-3">
          <div className="h-3 w-3 bg-blue-400 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-400 rounded-full"></div>
          <div className="h-3 w-3 bg-blue-400 rounded-full"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-lg w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 dark:bg-red-900 rounded-full p-3">
              <svg className="w-8 h-8 text-red-500 dark:text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Error Loading Conversation</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <Link href="/" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <ArrowLeft size={16} className="mr-2" />
            Return Home
          </Link>
        </div>
      </div>
    );
  }
  
  if (!conversation) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 rounded-lg mb-6">
          <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquare size={20} className="text-blue-600 dark:text-blue-400" />
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{conversation.title}</h1>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Shared conversation using model: <span className="font-medium">{conversation.model}</span>
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={16} className="mr-2 text-green-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="mr-2" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={exportAsTxt}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Download size={16} className="mr-2" />
                  <span>Export as Text</span>
                </button>
                
                <button
                  onClick={exportAsPdf}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <FileText size={16} className="mr-2" />
                  <span>Export as PDF</span>
                </button>
                
                <Link
                  href="/"
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  <span>Open App</span>
                </Link>
              </div>
            </div>
            
            {conversation.shareSettings.expiresAt && (
              <div className="mt-3 text-sm text-amber-600 dark:text-amber-400">
                <p>
                  This shared conversation will expire on{' '}
                  {new Date(conversation.shareSettings.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Conversation Messages */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border dark:border-gray-700 rounded-lg">
          <div className="p-4 space-y-6">
            {conversation.messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Shared via{' '}
            <Link href="https://silynkr.si4k.me/" className="text-blue-600 dark:text-blue-400 hover:underline">
              SiLynkr
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 