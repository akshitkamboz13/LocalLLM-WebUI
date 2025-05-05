'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { ModelInfo } from '../../services/ollamaService';
import ChatMessage from './ChatMessage';
import { useRouter, useSearchParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export default function ChatInterface() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    isPublic: false,
    allowComments: false,
    expiresAt: null
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Handle URL parameters
  useEffect(() => {
    const modelParam = searchParams.get('model');
    const tempParam = searchParams.get('temperature');
    const systemPromptParam = searchParams.get('systemPrompt');
    
    if (modelParam && models.some(m => m.name === modelParam)) {
      setSelectedModel(modelParam);
    }
    
    if (tempParam) {
      const temp = parseFloat(tempParam);
      if (!isNaN(temp) && temp >= 0 && temp <= 2) {
        setTemperature(temp);
      }
    }
    
    if (systemPromptParam) {
      setSystemPrompt(systemPromptParam);
    }
  }, [searchParams, models]);
  
  // Fetch folders and tags
  useEffect(() => {
    async function fetchFoldersAndTags() {
      try {
        const [foldersRes, tagsRes] = await Promise.all([
          fetch('/api/folders'),
          fetch('/api/tags')
        ]);
        
        const foldersData = await foldersRes.json();
        const tagsData = await tagsRes.json();
        
        setFolders(foldersData.folders || []);
        setTags(tagsData.tags || []);
      } catch (err) {
        console.error('Error fetching folders and tags:', err);
      }
    }
    
    fetchFoldersAndTags();
  }, []);
  
  // Save conversation
  const saveConversation = async () => {
    if (messages.length === 0) return;
    
    try {
      const conversation = {
        title: messages[0].content.substring(0, 30) + '...',
        messages,
        model: selectedModel,
        systemPrompt,
        parameters: { temperature },
        folderId: currentFolder,
        tags: selectedTags,
        isShared,
        shareSettings
      };
      
      await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(conversation),
      });
      
    } catch (err) {
      console.error('Error saving conversation:', err);
    }
  };
  
  // Share conversation
  const shareConversation = async () => {
    // Implementation for sharing conversation
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Check system preference for dark mode
  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDarkMode);
  }, []);

  useEffect(() => {
    async function fetchModels() {
      try {
        setError(null);
        const response = await fetch('/api/models');
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0].name);
        } else {
          setError('No models available. Please make sure you have models installed in Ollama.');
        }
      } catch (err) {
        setError('Failed to load models. Make sure Ollama is running.');
        console.error('Error fetching models:', err);
      }
    }

    fetchModels();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedModel) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: input,
          options: {
            temperature,
          },
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      setError('Failed to generate response. Make sure Ollama is running.');
      console.error('Error generating response:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 py-4 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ollama Chat</h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button 
              onClick={clearChat} 
              className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
              disabled={messages.length === 0 && !error}
              aria-label="Clear chat history"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto h-full flex flex-col md:flex-row gap-4 p-4">
          <div className="w-full md:w-64 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model
              </label>
              <select
                id="model-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {models.length === 0 && (
                  <option value="">No models available</option>
                )}
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <label htmlFor="temperature-slider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                id="temperature-slider"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>Precise</span>
                <span>Balanced</span>
                <span>Creative</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 m-4 rounded">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Start a conversation</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md">
                    Ask questions, get creative responses, or explore what your local AI model can do.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message, index) => (
                    <ChatMessage 
                      key={index}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
              {loading && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t dark:border-gray-700 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  aria-label="Message input"
                />
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center disabled:bg-blue-300 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
                  disabled={loading || !selectedModel || !input.trim()}
                  aria-label="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Powered by Ollama running locally on your machine
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}