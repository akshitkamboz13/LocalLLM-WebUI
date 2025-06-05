/**
 * SiLynkr version information
 * A project by Si4k (si4k.me)
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  label: 'beta',
  get version() {
    return `${this.major}.${this.minor}.${this.patch}${this.label ? `-${this.label}` : ''}`;
  },
  get displayVersion() {
    return `v${this.version}`;
  },
  buildDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
};

/**
 * Features supported by SiLynkr
 */
export const FEATURES = [
  'Chat with any Ollama model',
  'MongoDB or local storage for conversations',
  'Conversation folders and organization',
  'Share conversations with public links',
  'Export conversations as PDF or text',
  'Advanced model parameters',
  'System prompts and temperature control',
  'Conversation history context control',
  'Dark/light mode support',
  'Mobile responsive design'
];

/**
 * Get the version string for display in the UI
 * @returns The formatted version string
 */
export function getVersionString(): string {
  return VERSION.displayVersion;
}

/**
 * Get the full version info including build date
 * @returns The full version info object
 */
export function getVersionInfo() {
  return {
    version: VERSION.version,
    displayVersion: VERSION.displayVersion,
    buildDate: VERSION.buildDate,
    features: FEATURES,
    brandInfo: {
      name: "SiLynkr",
      company: "Si4k",
      website: "https://si4k.me",
      downloadUrl: "https://silynkr.si4k.me"
    }
  };
} 