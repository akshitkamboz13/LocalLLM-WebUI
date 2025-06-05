import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedSettingsProps {
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

export default function AdvancedSettings({
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
}: AdvancedSettingsProps) {
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState<boolean>(false);

  return (
    <div className="pt-3 border-t dark:border-gray-700">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAdvancedOptionsOpen(!advancedOptionsOpen)}
          className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
          type="button"
        >
          <span>Advanced Ollama Parameters</span>
          {advancedOptionsOpen ? (
            <ChevronUp size={16} className="text-gray-500" />
          ) : (
            <ChevronDown size={16} className="text-gray-500" />
          )}
        </button>
      </div>

      {advancedOptionsOpen && (
        <div className="mt-4 space-y-5 animate-fade-in">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
        </div>
      )}
    </div>
  );
} 