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
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface GenerateResponse {
  model: string;
  response: string;
  context?: number[];
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
      return response.data.models || [];
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
      console.log('Sending request to Ollama:', request);
      console.log('Using API URL:', OLLAMA_API_URL);
      
      // Set stream to false to get the complete response at once
      const requestWithoutStream = {
        ...request,
        stream: false
      };
      
      const response = await axios.post(`${OLLAMA_API_URL}/generate`, requestWithoutStream);
      console.log('Generate response:', response.data);
      return response.data;
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