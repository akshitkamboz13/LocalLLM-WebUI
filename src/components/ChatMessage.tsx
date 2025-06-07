'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { 
  User, 
  Bot, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  MessageSquare
} from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  models?: Array<{ name: string }>;
  onRegenerate?: (modelName: string) => void;
  onLike?: () => void;
  onDislike?: () => void;
  onEdit?: () => void;
  alternateVersions?: string[];
  currentVersionIndex?: number;
  onSelectVersion?: (index: number) => void;
}

export default function ChatMessage({ 
  role, 
  content, 
  timestamp, 
  models = [],
  onRegenerate,
  onLike,
  onDislike,
  onEdit,
  alternateVersions = [],
  currentVersionIndex = 0,
  onSelectVersion
}: ChatMessageProps) {
  const isUser = role === 'user';
  const [showActions, setShowActions] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const modelsRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside the models dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelsRef.current && !modelsRef.current.contains(event.target as Node)) {
        setShowModels(false);
      }
    }
    
    if (showModels) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModels]);
  
  // Handle copy to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(content).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => console.error('Could not copy text: ', err)
    );
  };
  
  // Handle like/dislike
  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setDisliked(false);
      if (onLike) onLike();
    } else {
      setLiked(false);
    }
  };
  
  const handleDislike = () => {
    if (!disliked) {
      setDisliked(true);
      setLiked(false);
      if (onDislike) onDislike();
    } else {
      setDisliked(false);
    }
  };
  
  // Handle version navigation
  const hasAlternateVersions = !isUser && alternateVersions.length > 1;
  const canShowActions = !isUser && (onRegenerate || onEdit || onLike || onDislike);
  
  return (
    <div 
      className={`flex mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => !isUser && setShowActions(true)}
      onMouseLeave={() => !isUser && setShowActions(false)}
    >
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-8 h-8 rounded-full bg-[#6C63FF] flex items-center justify-center text-white">
            <Bot size={18} />
          </div>
        </div>
      )}
      
      <div className={`relative max-w-[80%] rounded-lg p-4 shadow-sm
        ${isUser 
          ? 'bg-[#6C63FF] text-white' 
          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white'}`}
      >
        <div className="font-semibold mb-1 flex items-center justify-between">
          <span>{isUser ? 'You' : 'AI'}</span>
          {timestamp && (
            <span className="text-xs opacity-70 ml-2">
              {new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {isUser ? (
          <div className="whitespace-pre-wrap">{content}</div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              skipHtml={true}
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const inline = className?.includes('inline');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      // @ts-ignore - The type definitions for react-syntax-highlighter are incorrect
                      style={atomDark as any}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: '#282c34',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
            
            {/* Navigation controls for alternate versions */}
            {hasAlternateVersions && (
              <div className="version-navigation">
                <button 
                  onClick={() => onSelectVersion && onSelectVersion(currentVersionIndex - 1)}
                  disabled={currentVersionIndex === 0}
                  className={`p-1 rounded-full ${currentVersionIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Previous version"
                >
                  <ChevronLeft size={16} />
                </button>
                <span>Version {currentVersionIndex + 1} of {alternateVersions.length}</span>
                <button 
                  onClick={() => onSelectVersion && onSelectVersion(currentVersionIndex + 1)}
                  disabled={currentVersionIndex === alternateVersions.length - 1}
                  className={`p-1 rounded-full ${currentVersionIndex === alternateVersions.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  title="Next version"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            
            {/* Action bar that appears on hover for AI messages */}
            {!isUser && showActions && (
              <div 
                ref={actionsRef}
                className="message-actions absolute bottom-0 left-0 right-0 py-2 px-3 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 flex justify-center gap-4 z-10 visible"
              >
                <button 
                  onClick={copyToClipboard}
                  className="message-action-button text-gray-700 dark:text-gray-300 hover:text-[#6C63FF] dark:hover:text-[#5754D2] tooltip-container"
                  title="Copy response"
                >
                  {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
                  <span className="tooltip-text">Copy</span>
                </button>
                
                {onLike && (
                  <button 
                    onClick={handleLike}
                    className={`message-action-button hover:text-[#6C63FF] dark:hover:text-[#5754D2] tooltip-container ${liked ? 'text-[#6C63FF] dark:text-[#5754D2]' : 'text-gray-700 dark:text-gray-300'}`}
                    title="Like response"
                  >
                    <ThumbsUp size={18} />
                    <span className="tooltip-text">Like</span>
                  </button>
                )}
                
                {onDislike && (
                  <button 
                    onClick={handleDislike}
                    className={`message-action-button hover:text-[#6C63FF] dark:hover:text-[#5754D2] tooltip-container ${disliked ? 'text-[#6C63FF] dark:text-[#5754D2]' : 'text-gray-700 dark:text-gray-300'}`}
                    title="Dislike response"
                  >
                    <ThumbsDown size={18} />
                    <span className="tooltip-text">Dislike</span>
                  </button>
                )}
                
                {onEdit && (
                  <button 
                    onClick={onEdit}
                    className="message-action-button text-gray-700 dark:text-gray-300 hover:text-[#6C63FF] dark:hover:text-[#5754D2] tooltip-container"
                    title="Edit response"
                  >
                    <Edit3 size={18} />
                    <span className="tooltip-text">Edit</span>
                  </button>
                )}
                
                {onRegenerate && models.length > 0 && (
                  <div className="relative tooltip-container" ref={modelsRef}>
                    <button 
                      onClick={() => setShowModels(!showModels)}
                      className="message-action-button text-gray-700 dark:text-gray-300 hover:text-[#6C63FF] dark:hover:text-[#5754D2] tooltip-container"
                      title="Regenerate response"
                    >
                      <RefreshCw size={18} />
                      <span className="tooltip-text">Regenerate</span>
                    </button>
                    
                    {showModels && (
                      <div className="absolute bottom-8 right-0 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-1 border-b border-gray-200 dark:border-gray-600">
                          Select model to regenerate
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {models.map((model) => (
                            <button
                              key={model.name}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center"
                              onClick={() => {
                                if (onRegenerate) onRegenerate(model.name);
                                setShowModels(false);
                              }}
                            >
                              <MessageSquare size={14} className="mr-2 text-gray-500 dark:text-gray-400" />
                              {model.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300">
            <User size={18} />
          </div>
        </div>
      )}
    </div>
  );
}
