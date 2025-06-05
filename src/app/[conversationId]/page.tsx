import ChatInterface from '@/components/ChatInterface';
import { Suspense } from 'react';

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  return (
    <main>
      <Suspense fallback={<div className="flex justify-center p-8">Loading conversation...</div>}>
        <ChatInterface conversationId={params.conversationId} />
      </Suspense>
    </main>
  );
} 