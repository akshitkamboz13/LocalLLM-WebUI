'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { ModelInfo } from '../../services/ollamaService';
import ChatMessage from './ChatMessage';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, X, Plus, Settings, Folder as FolderIcon, Tag as TagIcon, Share, Moon, Sun, Database, MessageSquare } from 'lucide-react';
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

export default function ChatInterface({ conversationId }: ChatInterfaceProps = {}) {
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
          color: 'blue', // Default color
          parentId: parentId // This will be null for root folders
        }),
      });

      console.log('Folder creation API response status:', response.status);
      const data = await response.json();
      console.log('Folder creation API response data:', data);

      if (data.success && data.folder) {
        // Add new folder to state
        const newFolder = data.folder;
        setFolders(prev => [...prev, newFolder]);

        // Automatically expand the new folder and its parent if it has one
        setExpandedFolders(prev => ({
          ...prev,
          [newFolder._id]: true,
          ...(newFolder.parentId ? { [newFolder.parentId]: true } : {})
        }));

        showToast(`Folder "${newFolderName}" created successfully${parentId ? ' as subfolder' : ''}!`, 'success');
      } else {
        throw new Error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      showToast('Failed to create folder', 'error');
    } finally {
      // Always clear input and hide it regardless of success or failure
      setNewFolderName('');
      setShowNewFolderInput(false);

      // Reset subfolder input state if applicable
      if (parentId) {
        setShowNewSubfolderInput(false);
        setNewSubfolderParentId(null);
      }
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
    // Use the helper function to extract a valid folder ID string
    const folderIdValue = getFolderIdString(conversation.folderId);
    setTargetFolderId(folderIdValue);
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

  const startCreateSubfolder = (parentId: string) => {
    setNewSubfolderParentId(parentId);
    setNewFolderName('');
    setShowNewSubfolderInput(true);
    closeFolderContextMenu();
  };

  // Render a folder and its children recursively
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
      <div key={folder._id} className="space-y-0.5">
        <div className="flex items-center w-full">
          <button
            onClick={() => toggleFolder(folder._id)}
            onContextMenu={(e) => showFolderContextMenu(e, folder)}
            className="flex-1 flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            <div className="flex items-center gap-2 text-sm">
              <div style={{ paddingLeft: `${(folder.level || 0) * 12}px` }} className="flex items-center gap-2">
                <FolderIcon size={14} className={folder.color ? `text-${folder.color}-500` : ''} />
                <span>{folder.name}</span>
              </div>
            </div>
            <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Add button with dropdown */}
          <div className="relative ml-1" ref={dropdownRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFolderDropdown(!showFolderDropdown);
              }}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              title="Add to folder"
            >
              <Plus size={14} className="text-gray-500 dark:text-gray-400" />
            </button>

            {/* Dropdown menu */}
            {showFolderDropdown && (
              <>
                <div
                  className="absolute right-0 top-full mt-1 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10 border border-gray-200 dark:border-gray-700"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="py-1" role="none">
                    <button
                      onClick={() => {
                        startCreateSubfolder(folder._id);
                        setShowFolderDropdown(false);
                      }}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                      role="menuitem"
                    >
                      <FolderIcon size={14} className="mr-2" />
                      <span>New Subfolder</span>
                    </button>
                    <button
                      onClick={createNewChatInFolder}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                      role="menuitem"
                    >
                      <MessageSquare size={14} className="mr-2" />
                      <span>New Chat</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* New subfolder input */}
        {showNewSubfolderInput && newSubfolderParentId === folder._id && (
          <div className="ml-6 mb-2 flex items-center">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Subfolder name"
              className="flex-1 text-sm border border-gray-300 dark:border-gray-600 rounded-l-md p-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder(folder._id);
                if (e.key === 'Escape') {
                  setShowNewSubfolderInput(false);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            <button
              onClick={() => createFolder(folder._id)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded-r-md text-sm"
            >
              Create
            </button>
          </div>
        )}

        {/* Folder contents when expanded */}
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
                  // Handle case where folderId is an object with _id property
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
                    className={`w-full text-left px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-xs truncate ${currentConversationId === conv._id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
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
    );
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm ${toastFading ? 'animate-fade-out' : 'animate-fade-in'
            } ${toast.type === 'success' ? 'bg-green-500' :
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
      <div className={`${sidebarOpen ? 'w-64' : 'w-0 opacity-0'} bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700 transition-all duration-300 flex flex-col`}>
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

        {/* <button className="m-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors" 
          onClick={createNewConversation}
        >
          <Plus size={16} />
          <span>New Chat</span>
        </button> */}

        <div className="flex-1 overflow-y-auto px-3 space-y-2">
          {/* Recent Chats Section */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">Recent Chats</div>
            <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              onClick={createNewConversation}
            >
              <span>+ New Chat</span>
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
                    className={`w-full flex items-center text-left px-2 py-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 ${currentConversationId === conv._id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
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
                onClick={() => createFolder()}
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
          <button className="w-full flex items-center py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300" onClick={shareConversation}>
            <Share size={16} />
            <span>{isShared ? 'Unshare Conversation' : 'Share Conversation'}</span>
          </button>
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center justify-center gap-1">
              <div>
                SiLynkr {getVersionString()} by <a href="https://si4k.me" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">Si4k</a>
              </div>
            </div>
          </div>
        </div>
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
                      <button
                        className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'general' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setSettingsView('general')}
                      >
                        General
                      </button>
                      <button
                        className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'advanced' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setSettingsView('advanced')}
                      >
                        Advanced Options
                      </button>
                      <button
                        className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'appearance' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        onClick={() => setSettingsView('appearance')}
                      >
                        Appearance
                      </button>
                      <button
                        className={`w-full text-left px-4 py-3 border-l-4 ${settingsView === 'updates' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'}`}
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
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
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
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'light' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'dark' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'obsidian' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'nature' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'sunset' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
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
                              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${theme === 'custom' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                              onClick={() => setAppTheme('custom')}
                            >
                              <div className="bg-gradient-to-r from-blue-700 via-purple-700 to-pink-700 p-2">
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                  <div className="w-12 h-2 bg-white/30 rounded"></div>
                                </div>
                              </div>
                              <div className="p-2 h-20 flex flex-col bg-gradient-to-b from-slate-900 to-slate-800">
                                <div className="w-3/4 h-2 bg-blue-500/30 rounded mb-1"></div>
                                <div className="w-1/2 h-2 bg-purple-500/30 rounded"></div>
                                <div className="flex-1"></div>
                                <div className="w-full h-4 bg-slate-900 border border-slate-700 rounded"></div>
                              </div>
                              <div className="p-2 bg-slate-900 text-center text-xs font-medium text-blue-100">
                                Custom
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* UI Density */}
                        <div className="space-y-3">
                          <h4 className="text-base font-medium text-gray-800 dark:text-gray-200">UI Density</h4>
                          <div className="flex space-x-4">
                            <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm font-medium">
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

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                          <div className="flex items-start">
                            <div className="mr-3 flex-shrink-0 text-blue-500">
                              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Current Version</h4>
                              <div className="mt-1 text-sm text-blue-700 dark:text-blue-400">
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
                  <div className="space-y-6 max-w-4xl mx-auto w-full">
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
    </div>
  );
}