'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { ModelInfo } from '../../services/ollamaService';
import ChatMessage from './ChatMessage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, X, Plus, Settings, Folder as FolderIcon, Tag as TagIcon, Share, Moon, Sun, Database, MessageSquare, AlertCircle } from 'lucide-react';
import { Message, truncateConversationHistory, createPromptWithHistory } from '@/lib/conversationUtils';
import ShareDialog from './ShareDialog';
import SettingsDialog from './SettingsDialog';
import { getVersionString } from '@/lib/version';
import Image from 'next/image';
import PortIndicator from './PortIndicator';

interface Folder {
  _id: string;
  name: string;
  color?: string;
  parentId?: string | null;
  path?: string;
  level?: number;
}

interface Tag {
  _id: string;
  name: string;
  color?: string;
}

interface SavedConversation {
  _id: string;
  title: string;
  messages: Message[];
  model: string;
  folderId?: string | { _id: string } | null;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatInterfaceProps {
  conversationId?: string;
}

interface DragItem {
  type: 'conversation' | 'folder';
  id: string;
  folderId?: string | null;
}

export default function ChatInterface({ conversationId }: ChatInterfaceProps = {}) {
  // Remove the CSS effect setup, we'll use direct inline styles instead
  
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'obsidian' | 'nature' | 'sunset' | 'custom'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default width of 256px (64 in rem units)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsView, setSettingsView] = useState<'general' | 'advanced' | 'appearance' | 'updates'>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [shareSettings, setShareSettings] = useState({
    isPublic: false,
    allowComments: false,
    expiresAt: null
  });
  const [mongodbUri, setMongodbUri] = useState<string>('');
  const [usingLocalStorage, setUsingLocalStorage] = useState<boolean>(true);
  const [historyLength, setHistoryLength] = useState<number>(10);
  const [useConversationHistory, setUseConversationHistory] = useState<boolean>(true);
  const [promptTokens, setPromptTokens] = useState<number>(0);
  const [completionTokens, setCompletionTokens] = useState<number>(0);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [showTokenUsage, setShowTokenUsage] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [toastFading, setToastFading] = useState<boolean>(false);
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [lastConversationSaved, setLastConversationSaved] = useState<boolean>(true);
  const [savedConversations, setSavedConversations] = useState<SavedConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState<boolean>(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number; conversation: SavedConversation | null }>({
    x: 0,
    y: 0,
    conversation: null
  });
  const [showMoveDialog, setShowMoveDialog] = useState<boolean>(false);
  const [conversationToMove, setConversationToMove] = useState<SavedConversation | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [folderToMove, setFolderToMove] = useState<Folder | null>(null);
  const [isFolderMove, setIsFolderMove] = useState<boolean>(false);
  const [showShareDialog, setShowShareDialog] = useState<boolean>(false);
  const [formatOption, setFormatOption] = useState<string>('');
  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(false);
  const [keepAliveOption, setKeepAliveOption] = useState<string>('5m');
  const [rawModeEnabled, setRawModeEnabled] = useState<boolean>(false);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState<boolean>(false);
  const [topP, setTopP] = useState<number>(0.9);
  const [topK, setTopK] = useState<number>(40);
  const [suffixText, setSuffixText] = useState<string>('');
  const [customTemplate, setCustomTemplate] = useState<string>('');
  const [showSettingsDialog, setShowSettingsDialog] = useState<boolean>(false);
  const [folderContextMenu, setFolderContextMenu] = useState<{
    x: number;
    y: number;
    folder: Folder | null
  }>({
    x: 0,
    y: 0,
    folder: null
  });
  
  // Add new state variables for message versions and editing
  const [messageVersions, setMessageVersions] = useState<Record<number, string[]>>({});
  const [currentMessageVersions, setCurrentMessageVersions] = useState<Record<number, number>>({});
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<Record<number, 'liked' | 'disliked' | null>>({});
  
  // Add new state for version notification
  const [showVersionNotification, setShowVersionNotification] = useState(true);
  
  // Add additional useRef hooks at the component level
  const newFolderInputRef = useRef<HTMLDivElement>(null);
  
  // Add state for delete target
  const [showDeleteTarget, setShowDeleteTarget] = useState<boolean>(false);
  const [deleteTargetActive, setDeleteTargetActive] = useState<boolean>(false);
  // Add state for custom confirmation dialog
  const [confirmDelete, setConfirmDelete] = useState<{
    show: boolean;
    type: 'conversation' | 'folder' | null;
    item: SavedConversation | Folder | null;
    title: string;
  }>({
    show: false,
    type: null,
    item: null,
    title: ''
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
        // Get MongoDB URI from localStorage if available
        const storedMongoUri = typeof window !== 'undefined'
          ? localStorage.getItem('MONGODB_URI') || ''
          : '';

        console.log('Fetching folders and tags with MongoDB URI:', storedMongoUri ? 'URI provided' : 'No URI');

        const [foldersRes, tagsRes] = await Promise.all([
          fetch('/api/folders', {
            headers: {
              'X-MongoDB-URI': storedMongoUri
            }
          }),
          fetch('/api/tags', {
            headers: {
              'X-MongoDB-URI': storedMongoUri
            }
          })
        ]);
        
        const foldersData = await foldersRes.json();
        const tagsData = await tagsRes.json();
        
        if (foldersData.success && foldersData.folders) {
          console.log(`Successfully fetched ${foldersData.folders.length} folders`);
          setFolders(foldersData.folders);
        } else {
          console.error('Failed to fetch folders:', foldersData.error || 'No error message provided');
        }

        if (tagsData.success && tagsData.tags) {
          console.log(`Successfully fetched ${tagsData.tags.length} tags`);
          setTags(tagsData.tags);
        } else {
          console.error('Failed to fetch tags:', tagsData.error || 'No error message provided');
        }
      } catch (err) {
        console.error('Error fetching folders and tags:', err);
        showToast('Error loading folders. Check console for details.', 'error');
      }
    }
    
    fetchFoldersAndTags();
  }, []);
  
  // Initialize MongoDB URI from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUri = localStorage.getItem('MONGODB_URI') || '';
      setMongodbUri(savedUri);
      setUsingLocalStorage(!savedUri);
    }
  }, []);

  // Function to show toast with improved animation handling
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Clear any existing toast first
    if (toast) {
      dismissToast();
      setTimeout(() => {
        setToast({ message, type });
        setToastFading(false);
      }, 300); // Wait for fadeOut to complete
    } else {
      setToast({ message, type });
      setToastFading(false);
    }

    // Auto-hide toast after 4 seconds
    const timer = setTimeout(() => dismissToast(), 4000);
    return timer;
  };

  // Function to dismiss toast with animation
  const dismissToast = () => {
    setToastFading(true);
    setTimeout(() => setToast(null), 300); // Match animation duration
  };

  // Update saveMongoDbUri to use toast and close settings panel
  const saveMongoDbUri = async () => {
    try {
      if (mongodbUri) {
        // Test the connection via API endpoint first
        const response = await fetch('/api/mongodb', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uri: mongodbUri }),
        });

        const data = await response.json();

        if (data.success) {
        localStorage.setItem('MONGODB_URI', mongodbUri);
        setUsingLocalStorage(false);
          showToast('MongoDB connection successful! URI saved.', 'success');
          setShowSettings(false); // Close settings panel

          // Fetch conversations after successful connection
          setTimeout(() => fetchSavedConversations(), 500);
        } else {
          showToast(`MongoDB connection failed: ${data.error || data.message}`, 'error');
        }
      } else {
        localStorage.removeItem('MONGODB_URI');
        setUsingLocalStorage(true);
        showToast('MongoDB URI removed. Using local storage instead.', 'info');
        setShowSettings(false); // Close settings panel

        // Fetch conversations after removing URI (to get local storage conversations)
        setTimeout(() => fetchSavedConversations(), 500);
      }
    } catch (err) {
      console.error('Error testing MongoDB connection:', err);
      showToast('Error testing MongoDB connection. Check console for details.', 'error');
    }
  };
  
  // Update saveConversation function to track saved state
  const saveConversation = async () => {
    if (messages.length === 0) {
      showToast('Nothing to save. Start a conversation first.', 'info');
      return;
    }

    // Show "Saving..." toast immediately
    showToast('Saving conversation...', 'info');

    try {
      // Generate a better title based on first message
      const title = generateConversationTitle(messages);

      const conversation = {
        title,
        messages,
        model: selectedModel,
        systemPrompt,
        parameters: { temperature },
        folderId: currentFolder,
        tags: selectedTags,
        isShared,
        shareSettings
      };
      
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      // Use API endpoint to save
      const method = currentConversationId ? 'PUT' : 'POST';
      const url = currentConversationId
        ? `/api/conversations/${currentConversationId}`
        : '/api/conversations';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({ conversation }),
      });

      const data = await response.json();

      if (data.success) {
        // Update saved state and conversation ID if new
        setLastConversationSaved(true);
        if (data.conversation && data.conversation._id) {
          setCurrentConversationId(data.conversation._id);

          // Auto-expand the folder if saving to a folder
          if (currentFolder) {
            setExpandedFolders(prev => ({
              ...prev,
              [currentFolder]: true
            }));
          }

          // If this is an update to an existing conversation, update it in the savedConversations list
          if (currentConversationId) {
            setSavedConversations(prev =>
              prev.map(conv =>
                conv._id === currentConversationId
                  ? {
                    ...conv,
                    title,
                    folderId: currentFolder,
                    updatedAt: new Date()
                  }
                  : conv
              )
            );
          } else {
            // If this is a new conversation, add it to the savedConversations list
            const newConversation = {
              _id: data.conversation._id,
              title,
              messages,
              model: selectedModel,
              folderId: currentFolder,
              tags: selectedTags,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            setSavedConversations(prev => [newConversation, ...prev]);
          }
        }

        // Refresh conversations list with a slight delay to ensure DB consistency
        setTimeout(() => fetchSavedConversations(), 500);

        showToast('Conversation saved successfully!', 'success');
      } else {
        throw new Error(data.error || 'Failed to save conversation');
      }
    } catch (err) {
      console.error('Error saving conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      showToast(`Failed to save: ${errorMessage}`, 'error');
    }
  };
  
  // Share conversation
  const shareConversation = async () => {
    if (messages.length === 0) {
      showToast('Nothing to share. Start a conversation first.', 'info');
      return;
    }

    // If not saved yet, save first
    if (!currentConversationId) {
      showToast('Saving conversation before sharing...', 'info');
      await saveConversation();
      // Wait a moment for the save to complete
      setTimeout(() => setShowShareDialog(true), 500);
    } else {
      setShowShareDialog(true);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Check system preference for dark mode
  useEffect(() => {
    // Get theme from local storage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('silynkr-theme') as 'light' | 'dark' | 'obsidian' | 'nature' | 'sunset' | 'custom' | null;

      if (savedTheme) {
        setAppTheme(savedTheme);
      } else {
        // Default to system preference for dark mode
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setAppTheme(isDarkMode ? 'dark' : 'light');
      }
    }
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

  // Function to regenerate a specific message using a selected model
  const regenerateMessage = async (messageIndex: number, modelName: string) => {
    if (messageIndex < 0 || messageIndex >= messages.length || messages[messageIndex].role !== 'assistant') {
      return;
    }
    
    // Find the user message that preceded this assistant message
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0 || messages[userMessageIndex].role !== 'user') {
      showToast('Cannot find the user message to regenerate response', 'error');
      return;
    }
    
    const userMessage = messages[userMessageIndex];
    
    // Show loading state
    setLoading(true);
    setError(null);
    
    try {
      // Get recent conversation history excluding the message we're regenerating
      const conversationHistory = useConversationHistory 
        ? truncateConversationHistory(
            messages.slice(0, userMessageIndex), 
            historyLength
          )
        : [];
      
      // Create prompt with conversation history if enabled
      const promptWithHistory = useConversationHistory
        ? createPromptWithHistory(userMessage.content, conversationHistory)
        : userMessage.content;
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: promptWithHistory,
          rawPrompt: userMessage.content, // Original prompt without history
          system: systemPrompt,
          options: {
            temperature,
            top_p: topP,
            top_k: topK
          },
          suffix: suffixText || undefined,
          format: formatOption || undefined,
          template: customTemplate || undefined,
          think: thinkingEnabled,
          raw: rawModeEnabled,
          keep_alive: keepAliveOption,
          conversationHistory: useConversationHistory ? conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })) : []
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Create new message with regenerated content
        const newMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        // Store the new version in messageVersions
        const messageId = messageIndex;
        const currentVersions = messageVersions[messageId] || [messages[messageIndex].content];
        const updatedVersions = [...currentVersions, newMessage.content];
        
        setMessageVersions({
          ...messageVersions,
          [messageId]: updatedVersions
        });
        
        // Set current version to the newest one
        setCurrentMessageVersions({
          ...currentMessageVersions,
          [messageId]: updatedVersions.length - 1
        });
        
        // Update the message in the messages array
        const updatedMessages = [...messages];
        updatedMessages[messageIndex] = newMessage;
        setMessages(updatedMessages);
        
        // Track token usage if available
        if (data.promptTokens || data.completionTokens) {
          setPromptTokens(data.promptTokens || 0);
          setCompletionTokens(data.completionTokens || 0);
          setTotalTokens((data.promptTokens || 0) + (data.completionTokens || 0));
          
          // Show token usage briefly
          setShowTokenUsage(true);
          setTimeout(() => setShowTokenUsage(false), 5000);
        }
        
        // Mark conversation as unsaved
        setLastConversationSaved(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to regenerate response: ${errorMessage}`);
      console.error('Error regenerating response:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting a specific version of a message
  const selectMessageVersion = (messageIndex: number, versionIndex: number) => {
    const messageId = messageIndex;
    const versions = messageVersions[messageId];
    
    if (!versions || versionIndex < 0 || versionIndex >= versions.length) return;
    
    // Update current version index
    setCurrentMessageVersions({
      ...currentMessageVersions,
      [messageId]: versionIndex
    });
    
    // Update the message in the messages array
    const updatedMessages = [...messages];
    updatedMessages[messageIndex] = {
      ...updatedMessages[messageIndex],
      content: versions[versionIndex]
    };
    setMessages(updatedMessages);
    
    // Mark conversation as unsaved
    setLastConversationSaved(false);
  };
  
  // Handle user providing feedback on a message
  const handleMessageFeedback = (messageIndex: number, feedbackType: 'liked' | 'disliked') => {
    setFeedbackMessages({
      ...feedbackMessages,
      [messageIndex]: feedbackType
    });
    
    // Here you could send the feedback to your backend or analytics
    console.log(`User ${feedbackType} message at index ${messageIndex}`);
  };
  
  // Handle editing a message
  const startEditingMessage = (messageIndex: number) => {
    setEditingMessageIndex(messageIndex);
    // In a full implementation, you'd open a modal or canvas for editing
    showToast('Editing messages will be available in a future update', 'info');
  };

  // In your handleSubmit function, update to include conversation history
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
    setLastConversationSaved(false); // Mark as unsaved when new message is added
  
    try {
      // Get recent conversation history based on settings
      const conversationHistory = useConversationHistory 
        ? truncateConversationHistory(messages, historyLength)
        : [];
      
      // Create prompt with conversation history if enabled
      const promptWithHistory = useConversationHistory
        ? createPromptWithHistory(input, conversationHistory)
        : input;
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          prompt: promptWithHistory,
          rawPrompt: input, // Original prompt without history
          system: systemPrompt,
          options: {
            temperature,
            top_p: topP,
            top_k: topK
          },
          suffix: suffixText || undefined,
          format: formatOption || undefined,
          template: customTemplate || undefined,
          think: thinkingEnabled,
          raw: rawModeEnabled,
          keep_alive: keepAliveOption,
          // Include the conversation history in a structured format
          conversationHistory: useConversationHistory ? conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })) : []
        }),
      });
  
      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
  
      // Try to parse the JSON with error handling
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing response JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
  
      if (data.error) {
        setError(data.error);
      } else {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        // Update messages with new assistant message
        setMessages((prev) => {
          const newMessages = [...prev, assistantMessage];
          
          // Store the initial version in messageVersions (index is messages.length because we're adding to prev)
          const messageId = newMessages.length - 1;
          
          // Update message versions in a separate effect to avoid state batching issues
          setTimeout(() => {
            setMessageVersions(versions => ({
              ...versions,
              [messageId]: [assistantMessage.content]
            }));
            
            setCurrentMessageVersions(currentVersions => ({
              ...currentVersions,
              [messageId]: 0
            }));
          }, 0);
          
          return newMessages;
        });
        
        // Track token usage if available
        const promptTokens = data.promptTokens || 0;
        const completionTokens = data.completionTokens || 0;
        const totalTokens = promptTokens + completionTokens;
        
        setPromptTokens(promptTokens);
        setCompletionTokens(completionTokens);
        setTotalTokens(totalTokens);
        
        // Show token usage briefly
        setShowTokenUsage(true);
        setTimeout(() => setShowTokenUsage(false), 5000); // Hide after 5 seconds
        
        // Check for auto-save after response received
        checkAutoSave();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate response: ${errorMessage}. Make sure Ollama is running.`);
      console.error('Error generating response:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Update clearChat function to reset saved state
  const clearChat = () => {
    setMessages([]);
    setError(null);
    setLastConversationSaved(true); // No content to save, so mark as saved
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Enhanced function to handle multiple themes
  const setAppTheme = (newTheme: 'light' | 'dark' | 'obsidian' | 'nature' | 'sunset' | 'custom') => {
    // Remove all existing theme classes
    document.documentElement.classList.remove('dark', 'theme-obsidian', 'theme-nature', 'theme-sunset', 'theme-custom');

    // Set the new theme
    setTheme(newTheme);

    // Update darkMode state for backward compatibility
    setDarkMode(newTheme !== 'light');

    // Apply the appropriate class based on the theme
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme !== 'light') {
      document.documentElement.classList.add(`theme-${newTheme}`);
    }

    // Save theme preference
    if (typeof window !== 'undefined') {
      localStorage.setItem('silynkr-theme', newTheme);
    }
  };

  // Function to auto-save after AI responses if enabled
  const checkAutoSave = () => {
    if (autoSave && messages.length > 0) {
      // Short delay before auto-saving to allow UI to update
      setTimeout(() => saveConversation(), 500);
    } else {
      // Mark conversation as not saved
      setLastConversationSaved(false);
    }
  };

  // Add a notification badge component for save indicator
  const SaveIndicator = () => {
    if (messages.length === 0) return null;

    const status = lastConversationSaved ? "Saved" : "Unsaved";
    const color = lastConversationSaved
      ? "bg-green-600 dark:bg-green-400"
      : "bg-amber-600 dark:bg-amber-400";

  return (
      <span className="relative group inline-flex items-center">
        {/* Colored status dot */}
        <span className={`w-2 h-2 rounded-full ${color} ${lastConversationSaved ? "" : "animate-pulse"}`} />

        {/* Enhanced Tooltip */}
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 
                      bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                      shadow-lg rounded-md py-1.5 px-3 whitespace-nowrap text-xs
                      opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {status} Conversation
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {lastConversationSaved
              ? "Changes have been saved"
              : "You have unsaved changes"}
          </div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 
                        rotate-45 w-2 h-2 bg-white dark:bg-gray-800 border-b border-r 
                        border-gray-200 dark:border-gray-700"></div>
        </span>
      </span>
    );
  };
  // Add function to update conversation title based on first message
  const generateConversationTitle = (messages: Array<{ role: string; content: string }>) => {
    if (!messages || messages.length === 0) return 'New Conversation';

    // Get first user message
    const firstUserMessage = messages.find((m: { role: string }) => m.role === 'user');
    if (!firstUserMessage) return 'New Conversation';

    // Truncate to reasonable length and add ellipsis if needed
    let title = firstUserMessage.content.trim();
    if (title.length > 50) {
      title = title.substring(0, 50) + '...';
    }
    return title;
  };

  // Update the useEffect that fetches saved conversations to depend on mongodbUri
  // Replace the existing useEffect for fetching conversations
  useEffect(() => {
    // Only fetch conversations when we have access to window
    if (typeof window !== 'undefined') {
      const storedMongoUri = localStorage.getItem('MONGODB_URI') || '';
      console.log('MongoDB URI changed, fetching conversations with URI:', storedMongoUri ? 'URI provided' : 'No URI');
      fetchSavedConversations();
    }
  }, [mongodbUri]); // Add dependency on mongodbUri

  // Function to fetch saved conversations
  const fetchSavedConversations = async () => {
    setLoadingConversations(true);
    try {
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      console.log('Fetching conversations with MongoDB URI:', storedMongoUri ? 'URI provided' : 'No URI');

      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/conversations?t=${timestamp}`, {
        headers: {
          'X-MongoDB-URI': storedMongoUri,
          'Cache-Control': 'no-cache'
        }
      });

      console.log('Conversations API response status:', response.status);

      const data = await response.json();
      console.log('Conversations API response data:', data);

      if (data.success && data.conversations) {
        console.log(`Successfully fetched ${data.conversations.length} conversations`);
        setSavedConversations(data.conversations);
      } else {
        console.error('Failed to fetch conversations:', data.error || 'No error message provided');
        showToast('Failed to load conversations: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      showToast('Error loading conversations. Check console for details.', 'error');
    } finally {
      setLoadingConversations(false);
    }
  };

  // Function to toggle folder expansion
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Function to load a saved conversation
  const loadConversation = (conversation: SavedConversation) => {
    setMessages(conversation.messages);
    setSelectedModel(conversation.model);
    setSystemPrompt((conversation as any).systemPrompt || '');
    setTemperature((conversation as any).parameters?.temperature || 0.7);
    setCurrentConversationId(conversation._id);

    // Extract folderId correctly regardless of type
    const folderIdValue = getFolderIdString(conversation.folderId);
    setCurrentFolder(folderIdValue);

    // Set tags if available
    setSelectedTags(conversation.tags || []);

    // Clear input
    setInput('');

    closeContextMenu();
  };

  // Function to create a new conversation
  const createNewConversation = () => {
    clearChat();
    setCurrentConversationId(null);
  };

  // Function to create a new folder
  const createFolder = async (parentId: string | null = null) => {
    try {
      // Use the existing newFolderName state instead of showing a prompt
      if (!newFolderName.trim()) {
        showToast('Please enter a folder name', 'info');
        return;
      }
      
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';
      
      // Calculate path if there's a parent folder
      let path = '';
      let level = 0;
      
      if (parentId) {
        const parentFolder = folders.find(f => f._id === parentId);
        if (parentFolder) {
          path = parentFolder.path ? `${parentFolder.path},${parentId}` : parentId;
          level = parentFolder.level ? parentFolder.level + 1 : 1;
        }
      }
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({
          name: newFolderName,
          color: '#6C63FF', // Default color purple
          parentId,
          path,
          level
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.folder) {
        setFolders([...folders, data.folder]);
        showToast(`Folder "${newFolderName}" created`, 'success');
        
        // Clear the input and hide it after successful creation
        setNewFolderName('');
        setShowNewSubfolderInput(false);
        setShowNewFolderInput(false);
        
        // Auto-expand the parent folder
        if (parentId) {
          setExpandedFolders(prev => ({
            ...prev,
            [parentId]: true
          }));
        }
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showToast('Failed to create folder', 'error');
    }
  };

  // Function to handle context menu
  const handleContextMenu = (e: React.MouseEvent, conversation: SavedConversation) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY,
      conversation
    });
  };

  // Function to close context menu
  const closeContextMenu = () => {
    setContextMenuPosition({
      x: 0,
      y: 0,
      conversation: null
    });
    
    // Also close color picker when context menu closes
    // setShowColorPicker(false);
  };

  // Function to delete a conversation
  const deleteConversation = async (conversation: SavedConversation) => {
    try {
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      const response = await fetch(`/api/conversations/${conversation._id}`, {
        method: 'DELETE',
        headers: {
          'X-MongoDB-URI': storedMongoUri
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove conversation from state
        setSavedConversations(savedConversations.filter(c => c._id !== conversation._id));

        // If this was the current conversation, clear it
        if (currentConversationId === conversation._id) {
          clearChat();
          setCurrentConversationId(null);
        }

        showToast('Conversation deleted successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast('Failed to delete conversation', 'error');
    } finally {
      closeContextMenu();
    }
  };

  // Function to show move folder dialog for a folder
  const showMoveFolderToFolderDialog = (folder: Folder) => {
    setFolderToMove(folder);
    setIsFolderMove(true);
    // Set current parent as default target, or null if it's a root folder
    setTargetFolderId(folder.parentId || null);
    setShowMoveDialog(true);
    closeFolderContextMenu();
  };

  // Function to show move dialog
  const showMoveFolderDialog = (conversation: SavedConversation) => {
    setConversationToMove(conversation);
    setIsFolderMove(false);
    // Use the helper function to extract a valid folder ID string
    const folderIdValue = getFolderIdString(conversation.folderId);
    setTargetFolderId(folderIdValue);
    setShowMoveDialog(true);
    console.log('Available folders for moving:', folders);
    closeContextMenu();
  };

  // Helper function to safely extract folder ID regardless of format
  const getFolderIdString = (folderId: string | { _id: string } | null | undefined): string | null => {
    if (!folderId) return null;
    if (typeof folderId === 'string') return folderId;
    if (typeof folderId === 'object' && '_id' in folderId) return folderId._id;
    return null;
  };

  // Function to move conversation to folder
  const moveConversation = async () => {
    if (!conversationToMove) return;

    try {
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      // Prepare the updated conversation
      const updatedConversation = {
        ...conversationToMove,
        folderId: targetFolderId
      };

      console.log('Moving conversation to folder:', targetFolderId);

      const response = await fetch(`/api/conversations/${conversationToMove._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({ conversation: updatedConversation }),
      });

      console.log('Move conversation API response status:', response.status);
      const data = await response.json();
      console.log('Move conversation API response data:', data);

      if (data.success) {
        // Update conversation in state
        setSavedConversations(savedConversations.map(c =>
          c._id === conversationToMove._id
            ? { ...c, folderId: targetFolderId }
            : c
        ));

        // Auto-expand the target folder if it's not already expanded
        if (targetFolderId) {
          setExpandedFolders(prev => ({
            ...prev,
            [targetFolderId]: true
          }));
        }

        setShowMoveDialog(false);
        setConversationToMove(null);
        showToast('Conversation moved successfully', 'success');

        // If this is the current conversation, update its folder
        if (currentConversationId === conversationToMove._id) {
          setCurrentFolder(targetFolderId);
        }

        // Refresh conversations list to ensure UI is up to date
        setTimeout(() => {
          // Get MongoDB URI from localStorage if available
          const storedMongoUri = typeof window !== 'undefined'
            ? localStorage.getItem('MONGODB_URI') || ''
            : '';
          
          // Fetch folders from API
          fetch('/api/folders', {
            headers: {
              'X-MongoDB-URI': storedMongoUri
            }
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.folders) {
              setFolders(data.folders);
            }
          })
          .catch(err => {
            console.error('Error fetching folders:', err);
          });
        }, 500);
      } else {
        throw new Error(data.error || 'Failed to move conversation');
      }
    } catch (error) {
      console.error('Error moving conversation:', error);
      showToast('Failed to move conversation', 'error');
    }
  };

  // Add specific effect for loading conversation from conversationId prop
  useEffect(() => {
    if (conversationId) {
      console.log('Loading conversation from URL param:', conversationId);
      loadConversationById(conversationId);
    }
  }, [conversationId]);

  // Function to load conversation by ID
  const loadConversationById = async (id: string) => {
    console.log('Attempting to load conversation ID:', id);
    setLoadingConversations(true);

    try {
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/conversations/${id}?t=${timestamp}`, {
        headers: {
          'X-MongoDB-URI': storedMongoUri,
          'Cache-Control': 'no-cache'
        }
      });

      console.log('Single conversation API response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.status}`);
      }

      const data = await response.json();
      console.log('Single conversation API response data:', data);

      if (data.success && data.conversation) {
        // Load the conversation
        setMessages(data.conversation.messages);
        setSelectedModel(data.conversation.model);
        setCurrentConversationId(data.conversation._id);
        setLastConversationSaved(true);

        // Set folder if applicable
        if (data.conversation.folderId) {
          // Use helper to extract folder ID string
          const folderIdString = getFolderIdString(data.conversation.folderId);
          setCurrentFolder(folderIdString);

          // Auto-expand folder
          if (folderIdString) {
            setExpandedFolders(prev => ({
              ...prev,
              [folderIdString]: true
            }));
          }
        }

        // Make sure this conversation is also in savedConversations list
        const exists = savedConversations.some(c => c._id === data.conversation._id);
        if (!exists) {
          setSavedConversations(prev => [data.conversation, ...prev]);
        }

        // Also fetch all conversations to update sidebar
        fetchSavedConversations();

      } else {
        throw new Error(data.error || 'Failed to load conversation');
      }
    } catch (error) {
      console.error('Error loading conversation by ID:', error);
      showToast(`Error loading conversation: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoadingConversations(false);
    }
  };

  // Helper function to get folders organized in a hierarchical structure
  const getFolderHierarchy = (allFolders: Folder[]) => {
    // First, separate root folders and child folders
    const rootFolders: Folder[] = [];
    const childFolders: Record<string, Folder[]> = {};

    allFolders.forEach(folder => {
      if (!folder.parentId) {
        rootFolders.push(folder);
      } else {
        const parentId = folder.parentId;
        if (!childFolders[parentId]) {
          childFolders[parentId] = [];
        }
        childFolders[parentId].push(folder);
      }
    });

    return { rootFolders, childFolders };
  };

  // Show folder context menu
  const showFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
    console.log('Right-click event detected', { x: e.clientX, y: e.clientY, folder });
    e.preventDefault();
    e.stopPropagation();
    setFolderContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder
    });
  };

  // Close folder context menu
  const closeFolderContextMenu = () => {
    setFolderContextMenu({
      x: 0,
      y: 0,
      folder: null
    });
    
    // Also close color picker when context menu closes
    // setShowColorPicker(false);
  };

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    try {
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'X-MongoDB-URI': storedMongoUri
        }
      });

      const data = await response.json();

      if (data.success) {
        // Remove folder from state
        setFolders(folders.filter(f => f._id !== folderId));

        // If this was the current folder, clear it
        if (currentFolder === folderId) {
          setCurrentFolder(null);
        }

        showToast('Folder deleted successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      showToast('Failed to delete folder', 'error');
    } finally {
      closeFolderContextMenu();
    }
  };

  // Function to add a new subfolder
  const [newSubfolderParentId, setNewSubfolderParentId] = useState<string | null>(null);
  const [showNewSubfolderInput, setShowNewSubfolderInput] = useState<boolean>(false);

  // Add effect for handling clicks outside the main folder input
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (newFolderInputRef.current && !newFolderInputRef.current.contains(event.target as Node)) {
        setShowNewFolderInput(false);
        setNewFolderName('');
      }
    }

    if (showNewFolderInput) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNewFolderInput]);
  
  // Add effect for handling clicks outside the subfolder input
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showNewSubfolderInput && !event.target) {
        return;
      }
      
      const subfolderInputs = document.querySelectorAll('.subfolder-input-container');
      let clickedInside = false;
      
      subfolderInputs.forEach(container => {
        if (container.contains(event.target as Node)) {
          clickedInside = true;
        }
      });
      
      if (!clickedInside && showNewSubfolderInput) {
        setShowNewSubfolderInput(false);
        setNewSubfolderParentId(null);
        setNewFolderName('');
      }
    }

    if (showNewSubfolderInput) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNewSubfolderInput]);

  const startCreateSubfolder = (parentId: string) => {
    setNewSubfolderParentId(parentId);
    setNewFolderName('');
    setShowNewSubfolderInput(true);
    closeFolderContextMenu();
  };

  // Update the RenderFolder component with simpler drag and drop handling
  const RenderFolder = ({ folder, childFolders }: { folder: Folder, childFolders: Record<string, Folder[]> }) => {
    const hasChildren = childFolders[folder._id] && childFolders[folder._id].length > 0;
    const isExpanded = expandedFolders[folder._id];
    const [showFolderDropdown, setShowFolderDropdown] = useState<boolean>(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicks outside the dropdown
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowFolderDropdown(false);
        }
      }

      if (showFolderDropdown) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showFolderDropdown]);

    // Create a new chat in this folder
    const createNewChatInFolder = () => {
      createNewConversation();
      setCurrentFolder(folder._id);
      setShowFolderDropdown(false);
    };

    return (
      <div className="mb-1">
        <div 
          className="relative group flex items-center justify-between rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
          onDragOver={(e) => handleDragOver(e, folder._id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder._id)}
        >
          <button
            onClick={() => toggleFolder(folder._id)}
            onContextMenu={(e) => {
              e.preventDefault();
              showFolderContextMenu(e, folder);
            }}
            className="flex-grow flex items-center justify-between px-2 py-1.5 rounded-md text-gray-700 dark:text-gray-300 cursor-grab"
            draggable
            onDragStart={(e) => handleDragStart(e, 'folder', folder._id, folder.parentId || null)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center gap-2 text-sm">
              <div style={{ paddingLeft: `${(folder.level || 0) * 12}px` }} className="flex items-center gap-2">
                <FolderIcon size={14} style={{ color: folder.color || '#6C63FF' }} />
                <span className="truncate">{folder.name}</span>
              </div>
            </div>

            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Folder dropdown menu */}
          {showFolderDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700" ref={dropdownRef}>
            <button
                onClick={createNewChatInFolder}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                New Chat in Folder
            </button>
                    <button
                      onClick={() => {
                        setShowFolderDropdown(false);
                  showMoveFolderToFolderDialog(folder);
                      }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    >
                Move Folder
                    </button>
                  </div>
            )}
        </div>

        {isExpanded && (
          <div className="ml-4 pl-2 border-l dark:border-gray-700 space-y-0.5">
            {/* Child folders */}
            {hasChildren && childFolders[folder._id].map(childFolder => (
              <RenderFolder
                key={childFolder._id}
                folder={childFolder}
                childFolders={childFolders}
              />
            ))}

            {/* Conversations in this folder */}
            {(() => {
              const folderConversations = savedConversations.filter(conv => {
                if (typeof conv.folderId === 'string') {
                  return conv.folderId === folder._id;
                } else if (conv.folderId && typeof conv.folderId === 'object') {
                  return (conv.folderId as any)._id === folder._id;
                }
                return false;
              });

              return folderConversations.length > 0 ? (
                folderConversations.map(conv => (
                  <button
                    key={conv._id}
                    onClick={() => loadConversation(conv)}
                    onContextMenu={(e) => handleContextMenu(e, conv)}
                    className={`w-full text-left px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-xs truncate cursor-grab
                      ${currentConversationId === conv._id ? 'bg-[#6C63FF]/10 dark:bg-[#5754D2]/30 text-[#6C63FF] dark:text-[#5754D2]' : 'text-gray-600 dark:text-gray-400'}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'conversation', conv._id, folder._id)}
                    onDragEnd={handleDragEnd}
                  >
                    {conv.title}
                  </button>
                ))
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-500 px-2 py-1">
                  No conversations
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  // Add function to change folder color
  const changeFolderColor = async (folderId: string, color: string) => {
    try {
      console.log('Changing folder color:', { folderId, color });
      
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      console.log('Using MongoDB URI:', storedMongoUri ? 'URI provided' : 'No URI');
      
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({
          color: color
        }),
      });

      console.log('Color update API response status:', response.status);
      
      const data = await response.json();
      console.log('Color update API response data:', data);

      if (data.success) {
        // Update folder in state
        setFolders(folders.map(f => 
          f._id === folderId ? { ...f, color: color } : f
        ));
        showToast('Folder color updated successfully', 'success');
      } else {
        throw new Error(data.error || 'Failed to update folder color');
      }
    } catch (error) {
      console.error('Error updating folder color:', error);
      showToast('Failed to update folder color', 'error');
    } finally {
      // setShowColorPicker(false);
      // setFolderToChangeColor(null);
    }
  };

  // Function to show color picker
  const showFolderColorPicker = (folder: Folder, x: number, y: number) => {
    console.log('Showing color picker for folder:', { folder, x, y });
    
    // Create a temporary input element of type color
    const input = document.createElement('input');
    input.type = 'color';
    input.value = folder.color || '#6C63FF';
    
    // Track if the input has been removed
    let inputRemoved = false;
    
    // Function to safely remove the input element
    const safelyRemoveInput = () => {
      if (!inputRemoved && document.body.contains(input)) {
        document.body.removeChild(input);
        inputRemoved = true;
      }
    };
    
    // When the color is selected, update the folder
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const newColor = target.value;
      console.log('Color selected:', newColor);
      changeFolderColor(folder._id, newColor);
      safelyRemoveInput();
    });
    
    // Trigger the color picker dialog
    document.body.appendChild(input);
    input.click();
    
    // Remove the input after selection
    input.addEventListener('input', () => {
      setTimeout(() => {
        safelyRemoveInput();
      }, 100);
    });
    
    // Clean up if canceled
    setTimeout(() => {
      safelyRemoveInput();
    }, 1000);
    
    // Close the context menu
    closeFolderContextMenu();
  };

  // State to track whether we're on the client side
  const [isClient, setIsClient] = useState(false);
  
  // Only enable client-side features after mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load saved sidebar width from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('silynkr-sidebar-width');
      if (savedWidth) {
        setSidebarWidth(parseInt(savedWidth));
      }
    }
  }, []);
  
  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate new width (min 200px, max 400px)
      const newWidth = Math.max(200, Math.min(400, e.clientX));
      setSidebarWidth(newWidth);
      
      // Save to localStorage
      localStorage.setItem('silynkr-sidebar-width', newWidth.toString());
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  const startResizing = () => {
    setIsResizing(true);
  };

  // Function to move a folder to another folder
  const moveFolder = async () => {
    if (!folderToMove) return;

    try {
      const storedMongoUri = typeof window !== 'undefined'
        ? localStorage.getItem('MONGODB_URI') || ''
        : '';

      // Calculate new path and level
      let newPath = '';
      let newLevel = 0;
      
      if (targetFolderId) {
        const parentFolder = folders.find(f => f._id === targetFolderId);
        if (parentFolder) {
          newPath = parentFolder.path ? `${parentFolder.path},${targetFolderId}` : targetFolderId;
          newLevel = parentFolder.level ? parentFolder.level + 1 : 1;
        }
      }

      // Make the API request to update the folder
      const response = await fetch(`/api/folders/${folderToMove._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({
          parentId: targetFolderId,
          path: newPath,
          level: newLevel
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update folder in state
        setFolders(prevFolders => 
          prevFolders.map(f => 
            f._id === folderToMove._id 
              ? { ...f, parentId: targetFolderId, path: newPath, level: newLevel }
              : f
          )
        );

        // Auto-expand the target folder if it's not already expanded
        if (targetFolderId) {
          setExpandedFolders(prev => ({
            ...prev,
            [targetFolderId]: true
          }));
        }

        setShowMoveDialog(false);
        setFolderToMove(null);
        setIsFolderMove(false);
        showToast('Folder moved successfully', 'success');

        // Refresh folders list to ensure UI is up to date
        setTimeout(() => {
          // Get MongoDB URI from localStorage if available
          const storedMongoUri = typeof window !== 'undefined'
            ? localStorage.getItem('MONGODB_URI') || ''
            : '';
          
          // Fetch folders from API
          fetch('/api/folders', {
            headers: {
              'X-MongoDB-URI': storedMongoUri
            }
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.folders) {
              setFolders(data.folders);
            }
          })
          .catch(err => {
            console.error('Error fetching folders:', err);
          });
        }, 500);
      } else {
        throw new Error(data.error || 'Failed to move folder');
      }
    } catch (error) {
      console.error('Error moving folder:', error);
      showToast('Failed to move folder', 'error');
    }
  };

  // Recursive component to render folder options with proper indentation
  const RenderFolderOption = ({ 
    folder, 
    level = 0, 
    childFolders, 
    disabledFolders = [] 
  }: { 
    folder: Folder, 
    level?: number, 
    childFolders: Record<string, Folder[]>,
    disabledFolders?: string[]
  }) => {
    const children = childFolders[folder._id] || [];
    const isDisabled = disabledFolders.includes(folder._id);
    const padding = level * 16; // 16px indentation per level
    
    return (
      <>
        <option 
          value={folder._id} 
          disabled={isDisabled}
          style={{ paddingLeft: `${padding}px` }}
        >
          {'-'.repeat(level)} {level > 0 ? '› ' : ''}{folder.name}
        </option>
        {children.map(child => (
          <RenderFolderOption 
            key={child._id} 
            folder={child} 
            level={level + 1} 
            childFolders={childFolders}
            disabledFolders={disabledFolders}
          />
        ))}
      </>
    );
  };

  // Simple, direct implementation for drag and drop
  const handleDragStart = (e: React.DragEvent<HTMLElement>, type: 'conversation' | 'folder', id: string, currentFolderId?: string | null) => {
    // Use the simplest possible data format
    const data = JSON.stringify({
      type,
      id,
      folderId: currentFolderId
    });
    
    // Set data in the most compatible format
    e.dataTransfer.setData('text/plain', data);
    
    // Add basic styling to the dragged element
    e.currentTarget.style.opacity = '0.4';
    
    // Show the delete target
    setShowDeleteTarget(true);
    
    console.log(`Started dragging ${type} with ID ${id}`);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    // Restore normal appearance
    e.currentTarget.style.opacity = '1';
    
    // Hide the delete target
    setShowDeleteTarget(false);
    setDeleteTargetActive(false);
    
    console.log('Drag operation ended');
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLElement>, folderId: string) => {
    // The most critical part - prevent default to allow drop
    e.preventDefault();
    
    // Add visual indication that item can be dropped here
    e.currentTarget.style.backgroundColor = 'rgba(108, 99, 255, 0.2)';
    e.currentTarget.style.border = '2px dashed #6C63FF';
    
    console.log(`Dragging over folder ${folderId}`);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    // Restore normal appearance
    e.currentTarget.style.backgroundColor = '';
    e.currentTarget.style.border = '';
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLElement>, targetFolderId: string) => {
    // Always prevent default behavior
    e.preventDefault();
    
    // Restore normal appearance
    e.currentTarget.style.backgroundColor = '';
    e.currentTarget.style.border = '';
    
    try {
      // Get the data
      const dataString = e.dataTransfer.getData('text/plain');
      if (!dataString) {
        console.error('No data found in drop event');
        return;
      }
      
      const data = JSON.parse(dataString);
      console.log('Drop data received:', data);
      
      if (data.type === 'conversation') {
        // Find the conversation
        const conversation = savedConversations.find(c => c._id === data.id);
        if (!conversation) {
          console.error('Conversation not found');
          return;
        }
        
        // Skip if already in this folder
        const currentFolderId = typeof conversation.folderId === 'string' 
          ? conversation.folderId 
          : conversation.folderId?._id;
          
        if (currentFolderId === targetFolderId) {
          console.log('Conversation is already in this folder');
          return;
        }
        
        // Move the conversation
        const updatedConversation = { ...conversation, folderId: targetFolderId };
        
        // Optimistic UI update
        setSavedConversations(prev => 
          prev.map(c => c._id === data.id ? { ...c, folderId: targetFolderId } : c)
        );
        
        // Save to server
        const response = await fetch(`/api/conversations/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-mongodb-uri': mongodbUri || '',
          },
          body: JSON.stringify({ conversation: updatedConversation }),
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Show success message
        showToast('Conversation moved successfully', 'success');
        
      } else if (data.type === 'folder') {
        // Cannot move folder to itself
        if (data.id === targetFolderId) {
          showToast('Cannot move a folder into itself', 'error');
          return;
        }
        
        // Find the folder
        const folder = folders.find(f => f._id === data.id);
        if (!folder) {
          console.error('Folder not found');
          return;
        }
        
        // Skip if already a child of this folder
        if (folder.parentId === targetFolderId) {
          console.log('Folder is already in this location');
          return;
        }
        
        // Check for circular reference
        if (wouldCreateCircularReference(data.id, targetFolderId)) {
          showToast('Cannot move a folder into its own subfolder', 'error');
          return;
        }
        
        // Optimistic UI update
        setFolders(prev => 
          prev.map(f => f._id === data.id ? { ...f, parentId: targetFolderId } : f)
        );
        
        // Save to server
        const response = await fetch(`/api/folders/${data.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-MongoDB-URI': mongodbUri || '',
          },
          body: JSON.stringify({ parentId: targetFolderId }),
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        // Show success message
        showToast('Folder moved successfully', 'success');
        
        // Auto-expand the target folder
        if (targetFolderId) {
          setExpandedFolders(prev => ({
            ...prev,
            [targetFolderId]: true
          }));
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      showToast(`Error moving item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };
  
  // Helper function to check if moving a folder would create a circular reference
  const wouldCreateCircularReference = (folderId: string, targetParentId: string | null): boolean => {
    if (!targetParentId) return false; // Moving to root is always safe
    if (folderId === targetParentId) return true; // Can't move a folder into itself
    
    // Check if target is a descendant of the folder
    const targetFolder = folders.find(f => f._id === targetParentId);
    if (!targetFolder || !targetFolder.parentId) return false;
    
    // Check if any ancestor of target is the folder we're moving
    let currentParentId: string | null = targetFolder.parentId;
    while (currentParentId) {
      if (currentParentId === folderId) return true;
      const parent = folders.find(f => f._id === currentParentId);
      currentParentId = parent?.parentId || null;
    }
    
    return false;
  };

  // Add handler for delete target interactions
  const handleDeleteTargetDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDeleteTargetActive(true);
  };
  
  const handleDeleteTargetDragLeave = () => {
    setDeleteTargetActive(false);
  };
  
  const handleDeleteTargetDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDeleteTargetActive(false);
    setShowDeleteTarget(false);
    
    try {
      const dataString = e.dataTransfer.getData('text/plain');
      if (!dataString) {
        console.error('No data found in drop event');
        return;
      }
      
      const data = JSON.parse(dataString);
      console.log('Item dropped for deletion:', data);
      
      if (data.type === 'conversation') {
        // Find the conversation
        const conversation = savedConversations.find(c => c._id === data.id);
        if (!conversation) {
          console.error('Conversation not found');
          return;
        }
        
        // Show custom confirmation dialog instead of window.confirm
        setConfirmDelete({
          show: true,
          type: 'conversation',
          item: conversation,
          title: conversation.title || 'Untitled'
        });
      } else if (data.type === 'folder') {
        // Find the folder
        const folder = folders.find(f => f._id === data.id);
        if (!folder) {
          console.error('Folder not found');
          return;
        }
        
        // Show custom confirmation dialog instead of window.confirm
        setConfirmDelete({
          show: true,
          type: 'folder',
          item: folder,
          title: folder.name || 'Untitled'
        });
      }
    } catch (error) {
      console.error('Error handling deletion:', error);
      showToast(`Error deleting item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };
  
  // Add function to handle delete confirmation
  const handleConfirmDelete = async () => {
    try {
      if (confirmDelete.type === 'conversation' && confirmDelete.item) {
        await deleteConversation(confirmDelete.item as SavedConversation);
        showToast('Conversation deleted successfully', 'success');
      } else if (confirmDelete.type === 'folder' && confirmDelete.item) {
        await deleteFolder((confirmDelete.item as Folder)._id);
        showToast('Folder deleted successfully', 'success');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      showToast(`Error deleting item: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      // Reset confirmation dialog
      setConfirmDelete({
        show: false,
        type: null,
        item: null,
        title: ''
      });
    }
  };
  
  // Add function to cancel delete
  const handleCancelDelete = () => {
    setConfirmDelete({
      show: false,
      type: null,
      item: null,
      title: ''
    });
  };

  return (
    <div className={`flex h-screen flex-col ${darkMode ? 'dark' : ''}`}>
      {/* New version notification */}
      {showVersionNotification && (
        <div className="bg-[#6C63FF]/5 dark:bg-[#5754D2]/20 border-b border-[#6C63FF]/10 dark:border-[#5754D2]/30">
          <div className="max-w-7xl mx-auto py-2 px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between flex-wrap">
              <div className="flex items-center">
                <span className="flex p-1 rounded-lg bg-[#6C63FF]/10 dark:bg-[#5754D2]/30">
                  <AlertCircle className="h-5 w-5 text-[#6C63FF] dark:text-[#5754D2]" aria-hidden="true" />
                </span>
                <p className="ml-3 font-medium text-[#6C63FF] dark:text-[#5754D2] truncate text-sm">
                  <span>
                    New beta version 1.2.0 released! Try the resizable sidebar and improved folder organization with drag and drop.
                  </span>
                </p>
              </div>
              <div className="flex-shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => setShowVersionNotification(false)}
                  className="p-1.5 rounded-md text-[#6C63FF] dark:text-[#5754D2] hover:bg-[#6C63FF]/10 dark:hover:bg-[#5754D2]/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#6C63FF]"
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Delete target */}
        {showDeleteTarget && (
          <div 
            className="fixed bottom-8 right-8 z-50 flex items-center justify-center transition-all duration-200"
            style={{
              width: deleteTargetActive ? '60px' : '50px',
              height: deleteTargetActive ? '60px' : '50px',
              backgroundColor: deleteTargetActive ? 'rgb(239, 68, 68)' : 'rgb(220, 38, 38)',
              borderRadius: '50%',
              boxShadow: deleteTargetActive ? '0 0 15px rgba(239, 68, 68, 0.7)' : '0 0 10px rgba(220, 38, 38, 0.5)'
            }}
            onDragOver={handleDeleteTargetDragOver}
            onDragLeave={handleDeleteTargetDragLeave}
            onDrop={handleDeleteTargetDrop}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-white"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </div>
        )}
        
        {/* Custom Delete Confirmation Dialog */}
        {confirmDelete.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full transform transition-all animate-fade-in-up border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-red-600 dark:text-red-500"
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                    />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center mb-2">
                Confirm Deletion
              </h3>
              
              <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
                {confirmDelete.type === 'conversation' 
                  ? `Are you sure you want to delete the conversation "${confirmDelete.title}"?`
                  : `Are you sure you want to delete the folder "${confirmDelete.title}" and move all its conversations to root?`
                }
              </p>
              
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <div 
            className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${toastFading ? 'animate-fade-out' : 'animate-fade-in'
              } ${toast.type === 'success' ? 'bg-green-500' :
                toast.type === 'error' ? 'bg-red-500' : 
                'bg-[#6C63FF]'
              } text-white`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center mr-3">
                {toast.type === 'success' && (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {toast.type === 'error' && (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                {toast.type === 'info' && (
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{toast.message}</span>
              </div>
              <button 
                onClick={dismissToast} 
                className="text-white hover:text-gray-200 focus:outline-none"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

      {/* Sidebar */}
        <div 
          ref={sidebarRef}
          className={`${sidebarOpen ? '' : 'w-0 opacity-0'} bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 transition-opacity duration-300 flex flex-col relative`}
          style={{ width: sidebarOpen ? `${sidebarWidth}px` : '0px' }}
        >
          <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/Horizontal-SiLynkr-Logo.png"
                alt="SiLynkr Logo"
                width={140}
                height={28}
                className="h-auto"
              />
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
              <X size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        
          <div className="flex-1 overflow-y-auto px-3 space-y-2">
            {/* Recent Chats Section */}
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Chats</div>
              <button
                onClick={createNewConversation}
                className="text-xs text-[#6C63FF] dark:text-[#5754D2] hover:underline"
              >
                + New
              </button>
            </div>
            
            {loadingConversations ? (
              <div className="py-2 flex items-center justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                </div>
              </div>
            ) : savedConversations.length > 0 ? (
              <div className="space-y-0.5">
                {savedConversations
                  .filter(conv => !conv.folderId) // Only show conversations without folders here
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) // Most recent first
                  .slice(0, 10) // Limit to 10 recent chats
                  .map(conv => (
                    <button
                      key={conv._id}
                      onClick={() => loadConversation(conv)}
                      onContextMenu={(e) => handleContextMenu(e, conv)}
                      className={`w-full flex items-center text-left px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 cursor-grab
                        ${currentConversationId === conv._id ? 'bg-[#6C63FF]/10 dark:bg-[#5754D2]/30 text-[#6C63FF] dark:text-[#5754D2]' : 'text-gray-700 dark:text-gray-300'}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'conversation', conv._id, null)}
                      onDragEnd={handleDragEnd}
                    >
                      <MessageSquare size={14} className="mr-2 flex-shrink-0" />
                      <span className="text-sm truncate">{conv.title}</span>
                    </button>
                  ))
                }
              </div>
            ) : (
              <div className="text-xs italic text-gray-500 dark:text-gray-500 px-1 py-1">
                No saved conversations
              </div>
            )}
            {/* Folders Section */}
            <div className="flex justify-between items-center mb-1 mt-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Folders</div>
              <button
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="text-xs text-[#6C63FF] dark:text-[#5754D2] hover:underline"
              >
                + New
              </button>
            </div>

            {showNewFolderInput && (
              <div className="mb-2 flex items-center max-w-full relative overflow-visible" ref={newFolderInputRef}>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-l-md p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-16"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createFolder();
                    if (e.key === 'Escape') {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => createFolder()}
                  className="absolute right-0 top-0 bottom-0 bg-[#6C63FF] hover:bg-[#5754D2] text-white px-2 rounded-r-md text-xs whitespace-nowrap"
                >
                  Create
                </button>
              </div>
            )}

            {loadingConversations ? (
              <div className="py-2 flex items-center justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                </div>
              </div>
            ) : folders.length > 0 ? (
              <div className="space-y-1">
                {/* Use our hierarchical folder structure */}
                {(() => {
                  const { rootFolders, childFolders } = getFolderHierarchy(folders);
                  return rootFolders.map(folder => (
                    <RenderFolder
                      key={folder._id}
                      folder={folder}
                      childFolders={childFolders}
                    />
                  ));
                })()}
              </div>
            ) : (
              <div className="text-xs italic text-gray-500 dark:text-gray-500 px-1 py-1">
                No folders yet
              </div>
            )}


        </div>
        
          <div className="p-3 border-t dark:border-gray-700">
            <button className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" onClick={() => setShowSettings(true)}>
              <Settings size={16} />
              <span>Settings</span>
            </button>
            <button className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 " onClick={saveConversation}>
              <FolderIcon size={16} />
              <span>Save Conversation</span>
            </button>
            <button className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" onClick={shareConversation}>
              <Share size={16} />
              <span>{isShared ? 'Unshare Conversation' : 'Share Conversation'}</span>
            </button>
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <div className="flex flex-col items-center justify-center gap-1">
                <div>
                  SiLynkr {getVersionString()} by <a href="https://si4k.me" target="_blank" rel="noopener noreferrer" className="underline text-[#6C63FF] dark:text-[#5754D2]hover:text-[#5754D2] ">Si4k</a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Resize handle */}
          {sidebarOpen && (
            <div
              ref={resizeRef}
              className="absolute top-0 right-0 h-full w-1 cursor-ew-resize hover:bg-[#6C63FF] hover:w-1 z-10 group"
              onMouseDown={startResizing}
            >
              <div className="invisible group-hover:visible absolute top-1/2 right-0 w-4 h-8 -translate-y-1/2 translate-x-1/2 flex items-center justify-center bg-[#6C63FF] rounded-full">
                <svg className="w-3 h-3 text-white" viewBox="0 0 6 10" fill="currentColor">
                  <path d="M1 1h1v8H1zM4 1h1v8H4z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      
        {/* Main Content - Center properly when sidebar is closed */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${!sidebarOpen ? 'ml-0 w-full' : ''}`}>
        {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 py-2">
            <div className={`${!sidebarOpen ? 'container mx-auto px-4' : 'px-4'} flex items-center justify-between`}>
            {!sidebarOpen && (
                <div className="flex items-center">
              <button onClick={() => setSidebarOpen(true)} className="p-2 mr-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                <Menu size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
                  <Image
                    src="/Horizontal-SiLynkr-Logo.png"
                    alt="SiLynkr Logo"
                    width={120}
                    height={24}
                    className="h-auto"
                  />
                </div>
              )}
              <div className={`${!sidebarOpen ? 'flex-1 flex justify-center' : 'flex-1 flex justify-center flex-col items-center'}`}>
                {!showSettings && (
                  <div className="relative w-full max-w-2xl mx-auto">
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-2 pl-4 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
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
                )}
                {showSettings && (
                  <h1 className="text-xl font-medium text-gray-900 dark:text-white">SiLynkr Settings</h1>
                )}
            </div>
            
            <button 
                onClick={() => setAppTheme(theme === 'light' ? 'dark' : 'light')}
                className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
            {showSettings ? (
              /* Settings View */
              <div className="flex-1 overflow-y-auto">
                <div className={`${!sidebarOpen ? 'container mx-auto px-4' : ''} max-w-3xl mx-auto py-8 px-4`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings size={24} />
                      Settings
                    </h2>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                      <X size={20} />
                    </button>
                </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Settings navigation */}
                    <div className="md:w-64 shrink-0">
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        {/* Settings navigation tabs */}
                        <button
                          className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'general' ? 'border-[#6C63FF] bg-[#6C63FF]/5 dark:bg-[#5754D2]/20 text-[#6C63FF] dark:text-[#5754D2]' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          onClick={() => setSettingsView('general')}
                        >
                          General
                        </button>
                        <button
                          className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'advanced' ? 'border-[#6C63FF] bg-[#6C63FF]/5 dark:bg-[#5754D2]/20 text-[#6C63FF] dark:text-[#5754D2]' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          onClick={() => setSettingsView('advanced')}
                        >
                          Advanced Options
                        </button>
                        <button
                          className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'appearance' ? 'border-[#6C63FF] bg-[#6C63FF]/5 dark:bg-[#5754D2]/20 text-[#6C63FF] dark:text-[#5754D2]' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          onClick={() => setSettingsView('appearance')}
                        >
                          Appearance
                        </button>
                        <button
                          className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'updates' ? 'border-[#6C63FF] bg-[#6C63FF]/5 dark:bg-[#5754D2]/20 text-[#6C63FF] dark:text-[#5754D2]' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          onClick={() => setSettingsView('updates')}
                        >
                          Updates
                        </button>
              </div>
          </div>
          
                    {/* Settings content */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                      {/* General Settings */}
                      {settingsView === 'general' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">General Settings</h3>

                          {/* System Prompt */}
                <div>
                            <label htmlFor="systemPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    System Prompt
                  </label>
                  <textarea
                              id="systemPrompt"
                              rows={3}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Optional system prompt to guide the assistant's responses"
                  />
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              System prompt provides context to the model about how it should respond.
                            </p>
                </div>
                
                          {/* MongoDB Connection */}
                <div>
                            <label htmlFor="mongodb-uri" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              MongoDB Connection URI
                  </label>
                            <div className="flex gap-2">
                  <input
                                id="mongodb-uri"
                                type="text"
                                value={mongodbUri}
                                onChange={(e) => setMongodbUri(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="mongodb://username:password@host:port/database"
                              />
                              <button
                                className="px-3 py-2 bg-[#6C63FF] hover:bg-[#5754D2] text-white rounded-md text-sm"
                                onClick={saveMongoDbUri}
                              >
                                Save
                              </button>
                            </div>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <span>{usingLocalStorage ? 'Using local storage' : 'Connected to MongoDB'}</span>
                              <span className={`w-2 h-2 rounded-full ${usingLocalStorage ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                            </p>
                          </div>

                          {/* Auto-save Settings */}
                          <div>
                            <div className="flex items-center">
                              <input
                                id="autosave"
                                type="checkbox"
                                checked={autoSave}
                                onChange={(e) => setAutoSave(e.target.checked)}
                                className="h-4 w-4 text-[#6C63FF] focus:ring-[#5754D2] border-gray-300 rounded"
                              />
                              <label htmlFor="autosave" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Auto-save conversations after each response
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Advanced Settings */}
                      {settingsView === 'advanced' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Advanced Options</h3>

                          {/* Temperature */}
                          <div>
                            <label htmlFor="temperature" className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <span>Temperature</span>
                              <span className="text-gray-500 dark:text-gray-400">{temperature}</span>
                            </label>
                            <input
                              id="temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Precise (0)</span>
                              <span>Balanced (0.7)</span>
                              <span>Creative (2)</span>
                  </div>
                </div>

                          {/* Top-P */}
                          <div>
                            <label htmlFor="top-p" className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <span>Top-P</span>
                              <span className="text-gray-500 dark:text-gray-400">{topP}</span>
                  </label>
                    <input
                              id="top-p"
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={topP}
                              onChange={(e) => setTopP(parseFloat(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          {/* Top-K */}
                          <div>
                            <label htmlFor="top-k" className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <span>Top-K</span>
                              <span className="text-gray-500 dark:text-gray-400">{topK}</span>
                            </label>
                            <input
                              id="top-k"
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={topK}
                              onChange={(e) => setTopK(parseInt(e.target.value))}
                              className="w-full"
                            />
                          </div>

                          {/* Format Option */}
                          <div>
                            <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Response Format
                            </label>
                            <select
                              id="format"
                              value={formatOption}
                              onChange={(e) => setFormatOption(e.target.value)}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Default</option>
                              <option value="json">JSON</option>
                            </select>
                          </div>

                          {/* Suffix Text */}
                          <div>
                            <label htmlFor="suffix" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Suffix Text
                            </label>
                            <input
                              id="suffix"
                      type="text"
                              value={suffixText}
                              onChange={(e) => setSuffixText(e.target.value)}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Optional suffix to append to prompt"
                            />
                          </div>

                          {/* Keep-Alive */}
                          <div>
                            <label htmlFor="keep-alive" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Keep-Alive Duration
                            </label>
                            <select
                              id="keep-alive"
                              value={keepAliveOption}
                              onChange={(e) => setKeepAliveOption(e.target.value)}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="0s">None</option>
                              <option value="30s">30 seconds</option>
                              <option value="1m">1 minute</option>
                              <option value="5m">5 minutes</option>
                              <option value="15m">15 minutes</option>
                              <option value="30m">30 minutes</option>
                              <option value="1h">1 hour</option>
                            </select>
                          </div>

                          {/* Checkboxes */}
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center">
                              <input
                                id="thinking-mode"
                                type="checkbox"
                                checked={thinkingEnabled}
                                onChange={(e) => setThinkingEnabled(e.target.checked)}
                                className="h-4 w-4 text-[#6C63FF] focus:ring-[#5754D2] border-gray-300 rounded"
                              />
                              <label htmlFor="thinking-mode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Enable thinking mode
                              </label>
                            </div>

                            <div className="flex items-center">
                              <input
                                id="raw-mode"
                                type="checkbox"
                                checked={rawModeEnabled}
                                onChange={(e) => setRawModeEnabled(e.target.checked)}
                                className="h-4 w-4 text-[#6C63FF] focus:ring-[#5754D2] border-gray-300 rounded"
                              />
                              <label htmlFor="raw-mode" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Enable raw mode
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Appearance Settings */}
                      {settingsView === 'appearance' && (
                        <div className="space-y-8">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance</h3>

                          {/* Theme Selector */}
                          <div>
                            <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-4">Select Theme</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {/* Light Theme */}
                              <div
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'light' ? 'border-[#6C63FF] shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => setAppTheme('light')}
                              >
                                <div className="bg-white p-2 border-b border-gray-200">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                    <div className="w-12 h-2 bg-gray-200 rounded"></div>
                                  </div>
                                </div>
                                <div className="bg-gray-50 p-2 h-20 flex flex-col">
                                  <div className="w-3/4 h-2 bg-gray-200 rounded mb-1"></div>
                                  <div className="w-1/2 h-2 bg-gray-200 rounded"></div>
                                  <div className="flex-1"></div>
                                  <div className="w-full h-4 bg-white border border-gray-200 rounded"></div>
                                </div>
                                <div className="p-2 bg-white text-center text-xs font-medium text-gray-600">
                                  Light
                                </div>
                              </div>

                              {/* Dark Theme */}
                              <div
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'dark' ? 'border-[#6C63FF] shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => setAppTheme('dark')}
                              >
                                <div className="bg-gray-900 p-2 border-b border-gray-700">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                                    <div className="w-12 h-2 bg-gray-700 rounded"></div>
                                  </div>
                                </div>
                                <div className="bg-gray-800 p-2 h-20 flex flex-col">
                                  <div className="w-3/4 h-2 bg-gray-700 rounded mb-1"></div>
                                  <div className="w-1/2 h-2 bg-gray-700 rounded"></div>
                                  <div className="flex-1"></div>
                                  <div className="w-full h-4 bg-gray-900 border border-gray-700 rounded"></div>
                                </div>
                                <div className="p-2 bg-gray-900 text-center text-xs font-medium text-gray-300">
                                  Dark
                                </div>
                              </div>

                              {/* Obsidian Theme */}
                              <div
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'obsidian' ? 'border-[#6C63FF] shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => setAppTheme('obsidian')}
                              >
                                <div className="bg-black p-2 border-b border-gray-800">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-purple-700"></div>
                                    <div className="w-12 h-2 bg-gray-800 rounded"></div>
                                  </div>
                                </div>
                                <div className="bg-gray-900 p-2 h-20 flex flex-col">
                                  <div className="w-3/4 h-2 bg-purple-900/50 rounded mb-1"></div>
                                  <div className="w-1/2 h-2 bg-purple-900/50 rounded"></div>
                                  <div className="flex-1"></div>
                                  <div className="w-full h-4 bg-black border border-gray-800 rounded"></div>
                                </div>
                                <div className="p-2 bg-black text-center text-xs font-medium text-purple-300">
                                  Obsidian
                                </div>
                              </div>

                              {/* Nature Theme */}
                              <div
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'nature' ? 'border-[#6C63FF] shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => setAppTheme('nature')}
                              >
                                <div className="bg-green-900 p-2 border-b border-green-800">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <div className="w-12 h-2 bg-green-800/70 rounded"></div>
                                  </div>
                                </div>
                                <div className="bg-green-800 p-2 h-20 flex flex-col">
                                  <div className="w-3/4 h-2 bg-green-700/50 rounded mb-1"></div>
                                  <div className="w-1/2 h-2 bg-green-700/50 rounded"></div>
                                  <div className="flex-1"></div>
                                  <div className="w-full h-4 bg-green-900 border border-green-700/50 rounded"></div>
                                </div>
                                <div className="p-2 bg-green-900 text-center text-xs font-medium text-green-100">
                                  Nature
                                </div>
                              </div>

                              {/* Sunset Theme */}
                              <div
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'sunset' ? 'border-[#6C63FF] shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => setAppTheme('sunset')}
                              >
                                <div className="bg-gradient-to-r from-red-800 to-orange-700 p-2 border-b border-orange-900">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <div className="w-12 h-2 bg-orange-800/70 rounded"></div>
                                  </div>
                                </div>
                                <div className="bg-gradient-to-b from-orange-900 to-orange-950 p-2 h-20 flex flex-col">
                                  <div className="w-3/4 h-2 bg-orange-700/50 rounded mb-1"></div>
                                  <div className="w-1/2 h-2 bg-orange-700/50 rounded"></div>
                                  <div className="flex-1"></div>
                                  <div className="w-full h-4 bg-orange-950 border border-orange-800 rounded"></div>
                                </div>
                                <div className="p-2 bg-orange-950 text-center text-xs font-medium text-orange-100">
                                  Sunset
                                </div>
                              </div>

                              {/* Custom Theme (Placeholder) */}
                              <div
                                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'custom' ? 'border-[#6C63FF] shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }`}
                                onClick={() => setAppTheme('custom')}
                              >
                                <div className="bg-gradient-to-r from-[#5754D2] via-purple-700 to-pink-700 p-2">
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-white"></div>
                                    <div className="w-12 h-2 bg-white/30 rounded"></div>
                                  </div>
                                </div>
                                <div className="p-2 h-20 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
                                  <div className="w-3/4 h-2 bg-[#6C63FF]/30 rounded mb-1"></div>
                                  <div className="w-1/2 h-2 bg-purple-500/30 rounded"></div>
                                  <div className="flex-1"></div>
                                  <div className="w-full h-4 bg-slate-900 border border-slate-700 rounded"></div>
                                </div>
                                <div className="p-2 bg-slate-900 text-center text-xs font-medium text-[#6C63FF]">
                                  Custom
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* UI Density */}
                          <div className="space-y-3">
                            <h4 className="text-base font-medium text-gray-800 dark:text-gray-200">UI Density</h4>
                            <div className="flex space-x-4">
                              <button className="px-4 py-2 bg-[#6C63FF]/10 dark:bg-[#5754D2]/30 text-[#6C63FF] dark:text-[#5754D2] rounded-md text-sm font-medium">
                                Comfortable
                              </button>
                              <button className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 text-sm">
                                Compact
                    </button>
                  </div>
                          </div>

                          {/* Font Size */}
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <h4 className="text-base font-medium text-gray-800 dark:text-gray-200">Font Size</h4>
                              <span className="text-sm text-gray-500 dark:text-gray-400">Medium</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="1"
                              defaultValue="3"
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>Small</span>
                              <span>Medium</span>
                              <span>Large</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Updates */}
                      {settingsView === 'updates' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Updates</h3>

                          <div className="bg-[#6C63FF]/5 dark:bg-[#5754D2]/20 p-4 rounded-md">
                            <div className="flex items-start">
                              <div className="mr-3 flex-shrink-0 text-[#6C63FF]">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-[#6C63FF] dark:text-[#5754D2]">Current Version</h4>
                                <div className="mt-1 text-sm text-[#6C63FF] dark:text-[#5754D2]">
                                  SiLynkr {getVersionString()}
                                  <span className="ml-2 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 py-0.5 px-1.5 rounded">Up to date</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                              Update History
                            </div>
                            <div className="p-4 space-y-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Version 1.0.0-beta</h4>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Released on April 15, 2023</p>
                                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                                  <li>Initial release</li>
                                  <li>Support for Ollama models</li>
                                  <li>Conversation management</li>
                                  <li>Dark mode support</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollBehavior: 'smooth' }}>
                <div className={`${!sidebarOpen ? 'container mx-auto px-4' : ''}`}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 mb-4 bg-[#6C63FF]/10 dark:bg-[#5754D2]/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#6C63FF] dark:text-[#5754D2]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Start a conversation</h3>
                      <p className="text-gray-500 dark:text-gray-400 max-w-md">
                        Ask questions, get creative responses, or explore what your local AI model can do.
                  </p>
                </div>
                  ) : (
                    <div className="space-y-6 max-w-4xl mx-auto w-full">
                      {messages.map((message, index) => (
                        <ChatMessage 
                          key={index}
                          role={message.role}
                          content={message.content}
                          timestamp={message.timestamp}
                          models={models}
                          onRegenerate={message.role === 'assistant' ? (modelName) => regenerateMessage(index, modelName) : undefined}
                          onLike={message.role === 'assistant' ? () => handleMessageFeedback(index, 'liked') : undefined}
                          onDislike={message.role === 'assistant' ? () => handleMessageFeedback(index, 'disliked') : undefined}
                          onEdit={message.role === 'assistant' ? () => startEditingMessage(index) : undefined}
                          alternateVersions={message.role === 'assistant' ? (messageVersions[index] || [message.content]) : []}
                          currentVersionIndex={message.role === 'assistant' ? (currentMessageVersions[index] || 0) : 0}
                          onSelectVersion={message.role === 'assistant' ? (versionIndex) => selectMessageVersion(index, versionIndex) : undefined}
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
                        <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                        <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
          
            {/* Input Area - only show when not in settings view */}
            {!showSettings && (
          <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                <form onSubmit={handleSubmit} className={`${!sidebarOpen ? 'container mx-auto' : ''} max-w-3xl mx-auto`}>
              <div className="relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && !loading) handleSubmit(e);
                    }
                  }}
                      placeholder="Message SiLynkr..."
                  rows={1}
                  className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent resize-none overflow-hidden"
                  disabled={loading}
                />
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <button
                    type="submit"
                    className="bg-[#6C63FF] hover:bg-[#5754D2] text-white p-1.5 rounded-md transition-colors flex items-center justify-center disabled:bg-[#6C63FF]/50 dark:disabled:bg-[#5754D2]/50 disabled:cursor-not-allowed"
                    disabled={loading || !selectedModel || !input.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                      <div>
                        <div className="flex flex-col items-center justify-center gap-1 m-2">
                          <SaveIndicator />
                          <PortIndicator />
                </div>
              </div>
              </div>
                  </div>

                  {/* Token usage display */}
                  {showTokenUsage && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex justify-center gap-4">
                      <span>Prompt: {promptTokens} tokens</span>
                      <span>Response: {completionTokens} tokens</span>
                      <span>Total: {totalTokens} tokens</span>
                    </div>
                  )}
            </form>
          </div>
            )}
        </div>
        </div>

        {/* Context Menu */}
        {contextMenuPosition.conversation && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={closeContextMenu}
            />
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 w-48 border border-gray-200 dark:border-gray-700"
              style={{
                top: `${contextMenuPosition.y}px`,
                left: `${contextMenuPosition.x}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <button
                onClick={() => loadConversation(contextMenuPosition.conversation!)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <MessageSquare size={14} className="mr-2" />
                Open
              </button>
              <button
                onClick={() => showMoveFolderDialog(contextMenuPosition.conversation!)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <FolderIcon size={14} className="mr-2" />
                Move to Folder
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => deleteConversation(contextMenuPosition.conversation!)}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}

        {/* Move Dialog */}
        {showMoveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-md transform transition-all animate-fade-in-up">
              <h2 className="text-xl font-medium mb-4 text-gray-900 dark:text-white flex items-center">
                <FolderIcon size={18} className="mr-2 text-[#6C63FF] dark:text-[#5754D2]" />
                {isFolderMove ? 'Move Folder' : 'Move Conversation'}
              </h2>

              <div className="mb-6">
                <label htmlFor="folder-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select destination folder
                </label>
                <select
                  id="folder-select"
                  value={targetFolderId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTargetFolderId(value === '' ? null : value);
                  }}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent shadow-sm"
                  style={{ textIndent: '0px' }}
                >
                  <option value="">None (Root)</option>
                  {(() => {
                    // Get folder hierarchy
                    const { rootFolders, childFolders } = getFolderHierarchy(folders);
                    
                    // If moving a folder, we need to disable the folder itself and all its children
                    // to prevent circular references
                    const disabledFolders: string[] = [];
                    
                    if (isFolderMove && folderToMove) {
                      // Recursive function to collect folder and all its children
                      const collectSubfolders = (folderId: string) => {
                        disabledFolders.push(folderId);
                        const children = childFolders[folderId] || [];
                        children.forEach(child => collectSubfolders(child._id));
                      };
                      
                      collectSubfolders(folderToMove._id);
                    }
                    
                    return rootFolders.map(folder => (
                      <RenderFolderOption
                        key={folder._id}
                        folder={folder}
                        childFolders={childFolders}
                        disabledFolders={disabledFolders}
                      />
                    ));
                  })()}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowMoveDialog(false);
                    setConversationToMove(null);
                    setFolderToMove(null);
                    setIsFolderMove(false);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={isFolderMove ? moveFolder : moveConversation}
                  className="px-4 py-2 bg-[#6C63FF] hover:bg-[#5754D2] text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Dialog */}
        {showShareDialog && (
          <ShareDialog
            open={showShareDialog}
            onClose={() => setShowShareDialog(false)}
            messages={messages}
            conversationId={currentConversationId}
            title={currentConversationId ?
              savedConversations.find(c => c._id === currentConversationId)?.title || 'Conversation'
              : generateConversationTitle(messages)
            }
          />
        )}

        {/* Settings Dialog */}
        {showSettingsDialog && (
          <SettingsDialog
            open={showSettingsDialog}
            onClose={() => setShowSettingsDialog(false)}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            temperature={temperature}
            setTemperature={setTemperature}
            useConversationHistory={useConversationHistory}
            setUseConversationHistory={setUseConversationHistory}
            historyLength={historyLength}
            setHistoryLength={setHistoryLength}
            mongodbUri={mongodbUri}
            setMongodbUri={setMongodbUri}
            saveMongoDbUri={saveMongoDbUri}
            usingLocalStorage={usingLocalStorage}
            autoSave={autoSave}
            setAutoSave={setAutoSave}
            formatOption={formatOption}
            setFormatOption={setFormatOption}
            topP={topP}
            setTopP={setTopP}
            topK={topK}
            setTopK={setTopK}
            suffixText={suffixText}
            setSuffixText={setSuffixText}
            customTemplate={customTemplate}
            setCustomTemplate={setCustomTemplate}
            keepAliveOption={keepAliveOption}
            setKeepAliveOption={setKeepAliveOption}
            thinkingEnabled={thinkingEnabled}
            setThinkingEnabled={setThinkingEnabled}
            rawModeEnabled={rawModeEnabled}
            setRawModeEnabled={setRawModeEnabled}
          />
        )}

        {/* Folder Context Menu */}
        {folderContextMenu.folder && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={closeFolderContextMenu}
            />
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 w-48 border border-gray-200 dark:border-gray-700"
              style={{
                top: `${folderContextMenu.y}px`,
                left: `${folderContextMenu.x}px`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <button
                onClick={() => startCreateSubfolder(folderContextMenu.folder!._id)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <FolderIcon size={14} className="mr-2" />
                Add Subfolder
              </button>
              <button
                onClick={() => showMoveFolderToFolderDialog(folderContextMenu.folder!)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <FolderIcon size={14} className="mr-2" />
                Move Folder
              </button>
              <button
                onClick={() => {
                  console.log('Change color button clicked', folderContextMenu);
                  showFolderColorPicker(folderContextMenu.folder!, folderContextMenu.x, folderContextMenu.y - 50);
                }}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <span className="mr-2 w-3 h-3 rounded-full" style={{ backgroundColor: folderContextMenu.folder?.color || '#6C63FF' }}></span>
                Change Color
              </button>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => deleteFolder(folderContextMenu.folder!._id)}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}