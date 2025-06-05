import React from 'react';
import { Database } from 'lucide-react';
import AdvancedSettings from './AdvancedSettings';

interface ConversationSettingsProps {
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
  temperature: number;
  setTemperature: (value: number) => void;
  useConversationHistory: boolean;
  setUseConversationHistory: (value: boolean) => void;
  historyLength: number;
  setHistoryLength: (value: number) => void;
  mongodbUri: string;
  setMongodbUri: (value: string) => void;
  saveMongoDbUri: () => void;
  usingLocalStorage: boolean;
  autoSave: boolean;
  setAutoSave: (value: boolean) => void;
  // Advanced settings props
  formatOption: string;
  setFormatOption: (value: string) => void;
  topP: number;
  setTopP: (value: number) => void;
  topK: number;
  setTopK: (value: number) => void;
  suffixText: string;
  setSuffixText: (value: string) => void;
  customTemplate: string;
  setCustomTemplate: (value: string) => void;
  keepAliveOption: string;
  setKeepAliveOption: (value: string) => void;
  thinkingEnabled: boolean;
  setThinkingEnabled: (value: boolean) => void;
  rawModeEnabled: boolean;
  setRawModeEnabled: (value: boolean) => void;
}

export default function ConversationSettings({
  systemPrompt,
  setSystemPrompt,
  temperature,
  setTemperature,
  useConversationHistory,
  setUseConversationHistory,
  historyLength,
  setHistoryLength,
  mongodbUri,
  setMongodbUri,
  saveMongoDbUri,
  usingLocalStorage,
  autoSave,
  setAutoSave,
  // Advanced settings
  formatOption,
  setFormatOption,
  topP,
  setTopP,
  topK,
  setTopK,
  suffixText,
  setSuffixText,
  customTemplate,
  setCustomTemplate,
  keepAliveOption,
  setKeepAliveOption,
  thinkingEnabled,
  setThinkingEnabled,
  rawModeEnabled,
  setRawModeEnabled,
}: ConversationSettingsProps) {
  return (
    <div className="space-y-6">
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
      <AdvancedSettings
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
    </div>
  );
} 