import ChatInterface from '@/components/ChatInterface';
import { Suspense } from 'react';

// Export the metadata generator
export { generateMetadata } from './metadata';

export default function ConversationPage({ params }: { params: { conversationId: string } }) {
  return (
    <main>
      <Suspense fallback={<div className="flex justify-center p-8">Loading conversation...</div>}>
        <ChatInterface conversationId={params.conversationId} />
      </Suspense>
    </main>
  );
}