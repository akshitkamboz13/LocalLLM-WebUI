import { useState, useRef, useEffect } from 'react';
import { X, Copy, Share, Download, Link, QrCode, Clipboard, CheckCircle, FileText, BookOpen } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Message } from '@/lib/conversationUtils';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  conversationId: string | null;
  title: string;
}

export default function ShareDialog({ open, onClose, messages, conversationId, title }: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'link' | 'qr'>('export');
  const [shareLink, setShareLink] = useState<string>('');
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareLinkError, setShareLinkError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiryOption, setExpiryOption] = useState<'never' | '1day' | '7days' | '30days'>('never');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const conversationContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && conversationId) {
      // Generate share link when dialog opens
      generateShareLink();
    }
  }, [open, conversationId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  const generateShareLink = async () => {
    if (!conversationId) return;
    
    setShareLinkLoading(true);
    setShareLinkError(null);
    
    try {
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined' 
        ? localStorage.getItem('MONGODB_URI') || '' 
        : '';
      
      const response = await fetch(`/api/conversations/${conversationId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({
          isPublic: true,
          expiry: expiryOption === 'never' ? null : expiryOption
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.shareLink) {
        // Create full URL including host
        const baseUrl = window.location.origin;
        const fullShareLink = `${baseUrl}/share/${data.shareLink}`;
        setShareLink(fullShareLink);
      } else {
        throw new Error(data.error || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareLinkError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setShareLinkLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const exportAsPDF = async () => {
    try {
      // Create a div with inline styles instead of classes to avoid cross-origin CSS issues
      const contentDiv = document.createElement('div');
      // Use inline styles instead of classes
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
      titleEl.textContent = title;
      contentDiv.appendChild(titleEl);
      
      // Add messages with inline styles
      messages.forEach(message => {
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
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_conversation.pdf`;
      pdf.save(fileName);
      
      showToast('PDF exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting as PDF:', error);
      showToast('Failed to export PDF. Check console for details.', 'error');
    }
  };

  const exportAsTxt = () => {
    // Format conversation as text
    let textContent = `${title}\n\n`;
    
    messages.forEach(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      textContent += `${role}: ${message.content}\n\n`;
    });
    
    // Create blob and download
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30 flex items-center justify-center z-50 animate-fade-in">
      {toastVisible && toastMessage && (
        <div 
          className={`fixed bottom-4 right-4 p-3 rounded-md shadow-lg max-w-xs animate-fade-in ${
            toastType === 'success' ? 'bg-green-500' : 
            toastType === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
          } text-white`}
        >
          {toastMessage}
        </div>
      )}
      <div 
        ref={dialogRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Share size={20} className="mr-2 text-blue-600 dark:text-blue-400" />
            Share Conversation
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex border-b dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'export' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'}`}
          >
            Export
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'link' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'}`}
          >
            Share Link
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'qr' 
              ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' 
              : 'text-gray-600 dark:text-gray-400'}`}
          >
            QR Code
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Export this conversation in various formats
              </p>
              
              <button 
                onClick={exportAsPDF}
                className="w-full flex items-center justify-between p-3 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center">
                  <Download size={20} className="mr-3 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium">Export as PDF</span>
                </div>
                <FileText size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              
              <button 
                onClick={exportAsTxt}
                className="w-full flex items-center justify-between p-3 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="flex items-center">
                  <Download size={20} className="mr-3 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium">Export as Text</span>
                </div>
                <BookOpen size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              
              {/* Hidden div for PDF content */}
              <div className="hidden">
                <div ref={conversationContentRef} className="bg-white p-4 max-w-3xl mx-auto">
                  <h1 className="text-2xl font-bold mb-4">{title}</h1>
                  {messages.map((message, index) => (
                    <div key={index} className="mb-6">
                      <div className="font-bold mb-1">
                        {message.role === 'user' ? 'User' : 'Assistant'}:
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'link' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share a link to this conversation that others can view
              </p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Link expires after:
                </label>
                <select
                  value={expiryOption}
                  onChange={(e) => setExpiryOption(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="never">Never</option>
                  <option value="1day">1 Day</option>
                  <option value="7days">7 Days</option>
                  <option value="30days">30 Days</option>
                </select>
              </div>
              
              {shareLinkError && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {shareLinkError}
                </div>
              )}
              
              <div className="relative">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="w-full p-3 pr-12 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder={shareLinkLoading ? "Generating link..." : "Share link will appear here"}
                />
                <button
                  onClick={copyToClipboard}
                  disabled={!shareLink || shareLinkLoading}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
                >
                  {copied ? <CheckCircle size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
              
              <button
                onClick={generateShareLink}
                disabled={shareLinkLoading}
                className={`w-full flex items-center justify-center p-2 rounded-md ${
                  shareLinkLoading 
                    ? 'bg-gray-300 dark:bg-gray-700 cursor-wait'
                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                } text-white`}
              >
                {shareLinkLoading ? (
                  <span>Generating...</span>
                ) : (
                  <>
                    <Link size={18} className="mr-2" />
                    <span>Generate Share Link</span>
                  </>
                )}
              </button>
            </div>
          )}
          
          {activeTab === 'qr' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Share this conversation via QR code
              </p>
              
              {!shareLink && !shareLinkLoading && (
                <div className="text-center">
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    Generate a share link first to create a QR code
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('link');
                      generateShareLink();
                    }}
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Generate Link
                  </button>
                </div>
              )}
              
              {shareLinkLoading && (
                <div className="flex justify-center">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-3 w-3 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-3 w-3 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-3 w-3 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  </div>
                </div>
              )}
              
              {shareLink && !shareLinkLoading && (
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-white rounded-md">
                    <QRCodeSVG 
                      value={shareLink} 
                      size={200}
                      bgColor={'#ffffff'}
                      fgColor={'#000000'}
                      level={'M'}
                      includeMargin={true}
                    />
                  </div>
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Scan this QR code to open the conversation on any device
                  </p>
                  
                  <button 
                    onClick={async () => {
                      try {
                        // Create canvas for QR code to enable download
                        const qrCanvas = document.createElement('canvas');
                        const ctx = qrCanvas.getContext('2d');
                        const qrCode = document.querySelector('svg') as SVGElement;
                        
                        // Convert SVG to canvas
                        const svgData = new XMLSerializer().serializeToString(qrCode);
                        const img = new Image();
                        img.onload = () => {
                          qrCanvas.width = img.width;
                          qrCanvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          
                          // Download
                          qrCanvas.toBlob(blob => {
                            if (blob) saveAs(blob, `${title.replace(/[^a-zA-Z0-9]/g, '_')}-qrcode.png`);
                          });
                        };
                        img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
                      } catch (error) {
                        console.error('Error saving QR code:', error);
                      }
                    }}
                    className="mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                  >
                    <Download size={18} className="mr-2" />
                    <span>Save QR Code</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 