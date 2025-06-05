'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { ModelInfo } from '../../services/ollamaService';
import ChatMessage from './ChatMessage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, X, Plus, Settings, Folder as FolderIcon, Tag as TagIcon, Share, Moon, Sun, Database, MessageSquare } from 'lucide-react';
import { Message, truncateConversationHistory, createPromptWithHistory } from '@/lib/conversationUtils';
import ShareDialog from './ShareDialog';

interface Folder {
  _id: string;
  name: string;
  color?: string;
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

export default function ChatInterface({ conversationId }: ChatInterfaceProps = {}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
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
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info'} | null>(null);
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

    fetchModels();  }, []);
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
      
      // Create prompt with conversation history context if enabled
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
        setMessages((prev) => [...prev, assistantMessage]);
        
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
    
    return lastConversationSaved ? (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Saved
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Unsaved
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
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      showToast('Please enter a folder name', 'error');
      return;
    }
    
    try {
      // Get MongoDB URI from localStorage if available
      const storedMongoUri = typeof window !== 'undefined' 
        ? localStorage.getItem('MONGODB_URI') || '' 
        : '';
      
      console.log('Creating folder with MongoDB URI:', storedMongoUri ? 'URI provided' : 'No URI');
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MongoDB-URI': storedMongoUri
        },
        body: JSON.stringify({ 
          name: newFolderName,
          color: 'blue' // Default color
        }),
      });
      
      console.log('Folder creation API response status:', response.status);
      const data = await response.json();
      console.log('Folder creation API response data:', data);
      
      if (data.success && data.folder) {
        // Add new folder to state
        const newFolder = data.folder;
        setFolders([...folders, newFolder]);
        
        // Automatically expand the new folder
        setExpandedFolders(prev => ({
          ...prev,
          [newFolder._id]: true
        }));
        
        // Clear input and hide it
        setNewFolderName('');
        setShowNewFolderInput(false);
        showToast('Folder created successfully!', 'success');
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

  // Function to show move dialog
  const showMoveFolderDialog = (conversation: SavedConversation) => {
    setConversationToMove(conversation);
    setTargetFolderId(conversation.folderId || null);
    setShowMoveDialog(true);
    console.log('Available folders for moving:', folders);
    closeContextMenu();
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
        setTimeout(() => fetchSavedConversations(), 500);
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

  // Helper function to safely extract folder ID regardless of format
  const getFolderIdString = (folderId: string | { _id: string } | null | undefined): string | null => {
    if (!folderId) return null;
    if (typeof folderId === 'string') return folderId;
    if (typeof folderId === 'object' && '_id' in folderId) return folderId._id;
    return null;
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Toast notification */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${
            toastFading ? 'animate-fade-out' : 'animate-fade-in'
          } ${
            toast.type === 'success' ? 'bg-green-500' : 
            toast.type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
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
      <div className={`${sidebarOpen ? 'w-64' : 'w-0 -ml-64'} bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Ollama Chat</h1>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <button className="m-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors" 
          onClick={createNewConversation}
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Folders Section */}
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Folders</div>
            <button 
              onClick={() => setShowNewFolderInput(!showNewFolderInput)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              + New
            </button>
          </div>
          
          {showNewFolderInput && (
            <div className="mb-2 flex items-center">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder();
                  if (e.key === 'Escape') {
                    setShowNewFolderInput(false);
                    setNewFolderName('');
                  }
                }}
              />
              <button
                onClick={createFolder}
                className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-r-md text-sm"
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
              {folders.map((folder: Folder) => (
                <div key={folder._id} className="space-y-0.5">
                  <button 
                    onClick={() => toggleFolder(folder._id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FolderIcon size={14} className={folder.color ? `text-${folder.color}-500` : ''} />
                      <span>{folder.name}</span>
                    </div>
                    <svg className={`w-4 h-4 transition-transform ${expandedFolders[folder._id] ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {expandedFolders[folder._id] && (
                    <div className="ml-4 pl-2 border-l dark:border-gray-700 space-y-0.5">
                      {(() => {
                        const folderConversations = savedConversations.filter(conv => {
                          if (typeof conv.folderId === 'string') {
                            return conv.folderId === folder._id;
                          } else if (conv.folderId && typeof conv.folderId === 'object') {
                            // Handle case where folderId is an object with _id property
                            return (conv.folderId as any)._id === folder._id;
                          }
                          return false;
                        });
                        
                        console.log(`Folder ${folder.name}: Found ${folderConversations.length} conversations`);
                        
                        return folderConversations.length > 0 ? (
                          folderConversations.map(conv => (
                            <button 
                              key={conv._id}
                              onClick={() => loadConversation(conv)}
                              onContextMenu={(e) => handleContextMenu(e, conv)}
                              className={`w-full text-left px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-xs truncate ${
                                currentConversationId === conv._id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                              }`}
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
              ))}
            </div>
          ) : (
            <div className="text-xs italic text-gray-500 dark:text-gray-500 px-1 py-1">
              No folders yet
            </div>
          )}
          
          {/* Recent Chats Section */}
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-4 mb-1">Recent Chats</div>
          
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
                    className={`w-full flex items-center text-left px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${
                      currentConversationId === conv._id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}
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
        </div>
        
        <div className="p-3 border-t dark:border-gray-700">
          <button className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={16} />
            <span>Settings</span>
          </button>
          <button className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" onClick={saveConversation}>
            <FolderIcon size={16} />
            <span>Save Conversation</span>
          </button>
          <button className="w-full flex items-center gap-2 py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 mt-2" onClick={shareConversation}>
            <Share size={16} />
            <span>{isShared ? 'Unshare Conversation' : 'Share Conversation'}</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 py-2 px-4">
          <div className="flex items-center">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 mr-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                <Menu size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            )}
            
            <div className="flex-1 flex justify-center flex-col items-center">
              <div className="relative w-full max-w-2xl">
                <select
                  id="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-2 pl-4 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="mt-1">
                <SaveIndicator />
              </div>
            </div>
            
            {/* Add save button here */}
            <button
              onClick={saveConversation}
              disabled={messages.length === 0 || lastConversationSaved}
              title={lastConversationSaved ? "Conversation already saved" : "Save conversation"}
              className={`p-2 ml-2 mr-1 rounded-md flex items-center gap-1 ${
                messages.length > 0 && !lastConversationSaved
                  ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse-blue'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </button>
            
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Messages */}
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
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 animate-slideUp">
              <div className="max-w-3xl mx-auto space-y-4">
                <div>
                  <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    id="system-prompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful assistant..."
                    rows={3}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temperature: {temperature.toFixed(1)}
                  </label>
                  <input
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

                <div className="pt-2 border-t dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <label htmlFor="use-history" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Use conversation history
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="use-history"
                        checked={useConversationHistory}
                        onChange={() => setUseConversationHistory(!useConversationHistory)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className={useConversationHistory ? "" : "opacity-50 pointer-events-none"}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-2 mb-1">
                      History length: {historyLength} messages
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={historyLength}
                      onChange={(e) => setHistoryLength(parseInt(e.target.value))}
                      disabled={!useConversationHistory}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Short</span>
                      <span>Medium</span>
                      <span>Long</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Includes up to {historyLength} previous messages as context for the AI.
                      Longer history helps maintain context but uses more tokens.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t dark:border-gray-700">
                  <label htmlFor="mongodb-uri" className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Database size={16} />
                    MongoDB Connection URI
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="mongodb-uri"
                      type="text"
                      value={mongodbUri}
                      onChange={(e) => setMongodbUri(e.target.value)}
                      placeholder="mongodb://username:password@host:port/database or mongodb://localhost:27017/mydatabase or leave empty for local storage"
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={saveMongoDbUri}
                      className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {usingLocalStorage 
                      ? "Currently using browser's local storage. Add MongoDB URI to enable persistent storage." 
                      : "Using MongoDB for conversation storage. Clear the field and save to use local storage."}
                  </p>
                </div>

                <div className="pt-2 border-t dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <label htmlFor="auto-save" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Auto-save conversations
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="auto-save"
                        checked={autoSave}
                        onChange={() => setAutoSave(!autoSave)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    When enabled, conversations will be automatically saved after each AI response.
                  </p>
                </div>

                {/* Advanced Ollama Parameters */}
                <div className="pt-2 border-t dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center"
                    >
                      <span>Advanced Ollama Parameters</span>
                      <svg
                        className={`ml-2 w-4 h-4 transform ${advancedOptionsOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {advancedOptionsOpen && (
                    <div className="mt-3 space-y-4 animate-fade-in">
                      <div>
                        <label htmlFor="format-option" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Response Format
                        </label>
                        <select
                          id="format-option"
                          value={formatOption}
                          onChange={(e) => setFormatOption(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Default</option>
                          <option value="json">JSON</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Format to return the response in (json or default).
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Top-P: {topP.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Sampling from among the top-P percentage of token probabilities.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Top-K: {topK}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="100"
                          step="1"
                          value={topK}
                          onChange={(e) => setTopK(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Sampling from the top K token probabilities.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="suffix-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Suffix
                        </label>
                        <input
                          id="suffix-text"
                          type="text"
                          value={suffixText}
                          onChange={(e) => setSuffixText(e.target.value)}
                          placeholder="Optional text to append after the response"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="custom-template" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Custom Template
                        </label>
                        <textarea
                          id="custom-template"
                          value={customTemplate}
                          onChange={(e) => setCustomTemplate(e.target.value)}
                          placeholder="Custom prompt template (overrides Modelfile template)"
                          rows={2}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="keep-alive" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Keep Alive Duration
                        </label>
                        <select
                          id="keep-alive"
                          value={keepAliveOption}
                          onChange={(e) => setKeepAliveOption(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="5m">5 minutes (default)</option>
                          <option value="10m">10 minutes</option>
                          <option value="30m">30 minutes</option>
                          <option value="1h">1 hour</option>
                          <option value="2h">2 hours</option>
                          <option value="0s">0 seconds (no keep alive)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          How long to keep model loaded in memory after request.
                        </p>
                      </div>

                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <label htmlFor="thinking-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Thinking Mode
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="thinking-mode"
                              checked={thinkingEnabled}
                              onChange={() => setThinkingEnabled(!thinkingEnabled)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Enable thinking before responding (for thinking-capable models).
                        </p>
                      </div>

                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center justify-between">
                          <label htmlFor="raw-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Raw Mode
                          </label>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              id="raw-mode"
                              checked={rawModeEnabled}
                              onChange={() => setRawModeEnabled(!rawModeEnabled)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Send prompt with no formatting (for custom templates).
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Input Area */}
          <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
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
                  placeholder="Message Ollama..."
                  rows={1}
                  className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-hidden"
                  disabled={loading}
                />
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-md transition-colors flex items-center justify-center disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
                    disabled={loading || !selectedModel || !input.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
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
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                Powered by Ollama running locally on your machine with the model <strong>{selectedModel || 'none selected'}</strong>.
              </div>
            </form>
          </div>
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
              <FolderIcon size={18} className="mr-2 text-blue-600 dark:text-blue-400" />
              Move Conversation
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
                className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              >
                <option value="">None (Root)</option>
                {folders.map(folder => (
                  <option key={folder._id} value={folder._id}>{folder.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowMoveDialog(false);
                  setConversationToMove(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={moveConversation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
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
    </div>
  );
}