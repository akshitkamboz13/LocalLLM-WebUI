import axios from 'axios';

// Check if we're running on the client or server
const isClient = typeof window !== 'undefined';

// Use relative URL for client-side requests (will use the current origin)
// Use absolute URL for server-side requests
const OLLAMA_API_URL = isClient 
  ? '/ollama-api' 
  : 'http://localhost:11434/api';

export interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  images?: string[];
  keep_alive?: string;
  suffix?: string;
  think?: boolean;
  rawPrompt?: string;  // Original prompt without history
  conversationHistory?: Array<{
    role: string;
    content: string;
  }>;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    seed?: number;
    num_ctx?: number;
    mirostat?: number;
    mirostat_eta?: number;
    mirostat_tau?: number;
    repeat_penalty?: number;
    repeat_last_n?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    tfs_z?: number;
    grammar?: string;
    num_gpu?: number;
    num_thread?: number;
    stop?: string[];
    num_keep?: number;
    numa?: boolean;
    logit_bias?: Record<string, number>;
  };
}

export interface GenerateResponse {
  model: string;
  response: string;
  context?: number[];
  promptTokens?: number; // Added to track token usage
  completionTokens?: number; // Added to track token usage
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
}

export const ollamaService = {
  async listModels(): Promise<ModelInfo[]> {
    try {
      console.log('Fetching models from Ollama...');
      console.log('Using API URL:', OLLAMA_API_URL);
      const response = await axios.get(`${OLLAMA_API_URL}/tags`);
      console.log('Models response:', response.data);
      
      // Ensure we're returning a valid array
      if (response.data && Array.isArray(response.data.models)) {
        return response.data.models;
      } else {
        console.warn('Unexpected models response format:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  async generateCompletion(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      // Log if we're using conversation history
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        console.log(`Using conversation history with ${request.conversationHistory.length} messages`);
        
        // If the original request had rawPrompt, log that too for debugging
        if (request.rawPrompt) {
          console.log('Original prompt without history:', request.rawPrompt);
        }
      }
      
      console.log('Sending request to Ollama:', request);
      console.log('Using API URL:', OLLAMA_API_URL);
      
      // Set stream to false to get the complete response at once
      const requestWithoutStream = {
        ...request,
        stream: false
      };
      
      // Only pass the properties that Ollama API expects
      const ollama_request = {
        model: requestWithoutStream.model,
        prompt: requestWithoutStream.prompt,
        stream: false,
        system: requestWithoutStream.system,
        template: requestWithoutStream.template,
        context: requestWithoutStream.context,
        format: requestWithoutStream.format,
        raw: requestWithoutStream.raw,
        images: requestWithoutStream.images,
        options: requestWithoutStream.options,
        keep_alive: requestWithoutStream.keep_alive,
        suffix: requestWithoutStream.suffix,
        think: requestWithoutStream.think
      };
      
      const response = await axios.post(`${OLLAMA_API_URL}/generate`, ollama_request);
      console.log('Generate response:', response.data);
      
      // Calculate rough token counts (this is an approximation)
      // This assumes an average of 4 chars per token which is a rough estimate
      const promptLength = request.prompt.length;
      const responseLength = response.data.response ? response.data.response.length : 0;
      const promptTokens = Math.ceil(promptLength / 4);
      const completionTokens = Math.ceil(responseLength / 4);
      
      // Validate the response format
      if (response.data && typeof response.data === 'object') {
        return {
          model: response.data.model || request.model,
          response: response.data.response || 'No response received',
          context: response.data.context,
          promptTokens,
          completionTokens
        };
      } else {
        // Handle unexpected response format
        console.warn('Unexpected response format:', response.data);
        throw new Error('Invalid response format from Ollama API');
      }
    } catch (error) {
      console.error('Error generating completion:', error);
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },
};