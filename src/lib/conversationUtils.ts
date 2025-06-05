/**
 * Utility functions for handling conversation formatting and chaining
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

/**
 * Format conversation history as alternating User/Bot JSON format
 * This helps the LLM understand the conversation flow
 */
export function formatConversationHistory(messages: Message[]): string {
  if (!messages || messages.length === 0) return '';
  
  // Create a JSON-like string format with User/Bot alternating pattern
  const formattedMessages = messages.map(message => {
    const role = message.role === 'user' ? 'User' : 'Bot';
    return `${role}: ${message.content}`;
  }).join('\n\n');
  
  return formattedMessages;
}

/**
 * Format the full prompt for the LLM with conversation history context
 */
export function createPromptWithHistory(currentPrompt: string, messages: Message[]): string {
  if (!messages || messages.length === 0) return currentPrompt;
  
  // Format previous conversation as context
  const conversationHistory = formatConversationHistory(messages);
  
  // Combine conversation history with current prompt
  return `
Previous conversation:
${conversationHistory}

User: ${currentPrompt}
`;
}

/**
 * Truncate conversation history if it's too long
 * This prevents hitting token limits
 */
export function truncateConversationHistory(messages: Message[], maxMessages: number = 10): Message[] {
  if (!messages || messages.length <= maxMessages) return messages;
  
  // Keep only the most recent messages
  return messages.slice(messages.length - maxMessages);
} 