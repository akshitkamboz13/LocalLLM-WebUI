import mongoose from 'mongoose';

// Check if running on server or client
const isServer = typeof window === 'undefined';
let isConnected = false;
let currentMongoUri = '';

export async function connectToDatabase(mongodbUri?: string) {
  // Don't attempt to connect to MongoDB from client-side code
  if (!isServer) {
    console.log('MongoDB connections can only be established on the server');
    return false;
  }

  // Use the provided URI first, then environment variable
  const mongoUri = mongodbUri || process.env.MONGODB_URI || '';

  // If no MongoDB URI is provided, skip connection
  if (!mongoUri) {
    console.log('No MongoDB URI provided, using local storage fallback');
    return false;
  }

  try {
    // If already connected to the same URI, reuse the connection
    if (isConnected && currentMongoUri === mongoUri) {
      console.log('Reusing existing MongoDB connection');
      return true;
    }
    
    // If connected to a different URI, disconnect first
    if (isConnected && currentMongoUri !== mongoUri) {
      console.log('Switching MongoDB connection to new URI');
      await mongoose.disconnect();
      isConnected = false;
    }

    // Connect with the new URI
    console.log('Connecting to MongoDB with URI:', mongoUri.substring(0, 15) + '...');
    
    // Set mongoose options to handle deprecation warnings
    await mongoose.connect(mongoUri, {
      // @ts-ignore - TS doesn't recognize the mongoose 7 options
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    
    // MongoDB is connected
    isConnected = true;
    currentMongoUri = mongoUri;
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    isConnected = false;
    return false;
  }
}

// Define conversation query interface
export interface ConversationQuery {
  folderId?: string;
  tags?: string | string[];
  [key: string]: any;
}

// Local storage utility functions for fallback
export const localStorageDB = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Error getting item from localStorage:', error);
        return null;
      }
    }
    return null;
  },
  
  setItem: (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Error setting item in localStorage:', error);
        return false;
      }
    }
    return false;
  },
  
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Error removing item from localStorage:', error);
        return false;
      }
    }
    return false;
  }
};

// Storage adapter that tries MongoDB first, falls back to localStorage
export async function storeConversation(conversation: any) {
  // On client side, always use localStorage
  if (!isServer) {
    const conversations = localStorageDB.getItem('conversations') || [];
    const newConversation = {
      ...conversation,
      _id: `local_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    conversations.push(newConversation);
    localStorageDB.setItem('conversations', conversations);
    return newConversation;
  }
  
  // On server side, try MongoDB
  try {
    await connectToDatabase();
    
    // Check if MongoDB is connected
    if (isConnected) {
      // Import here to avoid circular dependencies
      const Conversation = (await import('@/models/Conversation')).default;
      const savedConversation = new Conversation(conversation);
      await savedConversation.save();
      return savedConversation;
    } else {
      // Fallback to localStorage
      const conversations = localStorageDB.getItem('conversations') || [];
      const newConversation = {
        ...conversation,
        _id: `local_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      conversations.push(newConversation);
      localStorageDB.setItem('conversations', conversations);
      return newConversation;
    }
  } catch (error) {
    console.error('Error storing conversation:', error);
    
    // Fallback to localStorage if MongoDB fails
    const conversations = localStorageDB.getItem('conversations') || [];
    const newConversation = {
      ...conversation,
      _id: `local_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    conversations.push(newConversation);
    localStorageDB.setItem('conversations', conversations);
    return newConversation;
  }
}

export async function getConversations(query: ConversationQuery = {}) {
  // On client side, always use localStorage
  if (!isServer) {
    const conversations = localStorageDB.getItem('conversations') || [];
    
    // Simple filtering based on query (handle basic cases)
    let filtered = [...conversations];
    
    if (query.folderId) {
      filtered = filtered.filter(c => c.folderId === query.folderId);
    }
    
    if (query.tags) {
      filtered = filtered.filter(c => 
        c.tags && c.tags.includes(query.tags)
      );
    }
    
    // Sort by updatedAt in descending order
    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
  
  // On server side, try MongoDB
  try {
    await connectToDatabase();
    
    // Check if MongoDB is connected
    if (isConnected) {
      // Import here to avoid circular dependencies
      const Conversation = (await import('@/models/Conversation')).default;
      return await Conversation.find(query)
        .sort({ updatedAt: -1 })
        .populate('tags')
        .populate('folderId');
    } else {
      // Fallback to localStorage
      const conversations = localStorageDB.getItem('conversations') || [];
      
      // Simple filtering based on query (handle basic cases)
      let filtered = [...conversations];
      
      if (query.folderId) {
        filtered = filtered.filter(c => c.folderId === query.folderId);
      }
      
      if (query.tags) {
        filtered = filtered.filter(c => 
          c.tags && c.tags.includes(query.tags)
        );
      }
      
      // Sort by updatedAt in descending order
      return filtered.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    
    // Fallback to localStorage if MongoDB fails
    const conversations = localStorageDB.getItem('conversations') || [];
    return conversations;
  }
} 