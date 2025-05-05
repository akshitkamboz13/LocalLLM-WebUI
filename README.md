# Ollama Chat - Local AI Chatbot Interface

## What is Ollama Chat?

Ollama Chat is a modern, feature-rich web interface for interacting with local AI models through Ollama. It provides a user-friendly way to chat with AI models running on your own machine, ensuring privacy, customization, and control over your AI interactions.

### Key Features

- **Local AI Interaction**: Chat with AI models running locally on your machine through Ollama
- **Conversation Organization**: Organize chats with folders and tags for better workspace management
- **URL Parameter Configuration**: Quickly set up chat sessions with specific models and parameters via URL
- **Advanced Chat Parameters**: Control system prompts and parameters at different levels (per-chat, per-account, or per-model)
- **Conversation Sharing**: Share conversations locally or via the Open WebUI Community platform with privacy controls
- **Mathematical Expression Support**: Render complex equations with KaTeX integration
- **Dark/Light Mode**: Toggle between dark and light themes for comfortable viewing
- **Markdown & Code Highlighting**: Full support for markdown formatting and syntax highlighting for code blocks
- **Temperature Control**: Adjust the AI's creativity level with an intuitive slider
- **MongoDB Integration**: Store conversations and settings in MongoDB (local or Atlas)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [Ollama](https://ollama.ai/) installed and running on your machine
- [MongoDB](https://www.mongodb.com/) (optional, for conversation storage)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/akshitkamboz13/LocalLLM-WebUI.git
cd LocalLLM-WebUI
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables (optional for MongoDB):

Create a `.env` file in the root directory:

```
# MongoDB Connection
# Use one of these options:
MONGODB_URI=mongodb://localhost:27017/AIwebUI
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/AIwebUI

# Server Port
PORT=5000
```

4. Start the development server:

```bash
npm run dev:all
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Basic Chat

1. Select an AI model from the dropdown menu
2. Adjust the temperature slider if desired (higher = more creative, lower = more precise)
3. Type your message in the input field and press Enter or click the send button
4. View the AI's response with full markdown and code highlighting support

### Advanced Features

#### URL Parameters

Quickly configure chat sessions by adding parameters to the URL:

```
http://localhost:3000/?model=llama2&temperature=0.7&systemPrompt=You%20are%20a%20helpful%20assistant
```

Supported parameters:
- `model`: Name of the Ollama model to use
- `temperature`: Value between 0-2
- `systemPrompt`: Custom system prompt for the AI

#### Conversation Management

- **Create Folders**: Organize conversations by topic or project
- **Add Tags**: Apply tags to conversations for easier filtering
- **Save Conversations**: Automatically save conversations for future reference
- **Share Conversations**: Generate shareable links with customizable privacy settings

#### Mathematical Expressions

Use LaTeX syntax for mathematical expressions:

- Inline math: `$E=mc^2$`
- Block math: 
  ```
  $$
  \int_{a}^{b} f(x) \, dx = F(b) - F(a)
  $$
  ```

## Architecture

- **Frontend**: Next.js with React and Tailwind CSS
- **Backend**: Next.js API routes + Express server for MongoDB integration
- **Database**: MongoDB (optional) for conversation storage
- **AI Integration**: Connects to locally running Ollama instance

## Development

### Project Structure

```
/
├── public/           # Static assets
├── server/           # Express server for MongoDB
├── src/
│   ├── app/          # Next.js app router
│   │   ├── api/      # API routes
│   │   └── page.tsx  # Main page
│   ├── components/   # React components
│   ├── lib/          # Utility functions
│   ├── models/       # MongoDB models
│   └── services/     # Service integrations
└── package.json      # Project dependencies
```

### Available Scripts

- `npm run dev` - Start the Next.js development server
- `npm run server` - Start the Express server for MongoDB
- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build the application for production
- `npm run start` - Start the production server

## Deployment

The application can be deployed on Vercel or any other hosting platform that supports Next.js applications. For the MongoDB integration, ensure your database is accessible from your hosting environment.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Ollama](https://ollama.ai/) for providing the local AI model runtime
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [KaTeX](https://katex.org/) for mathematical expression rendering
        