import { Metadata } from 'next';

// Define proper metadata generation function for conversation pages
export async function generateMetadata({ params }: { 
  params: { conversationId: string } 
}): Promise<Metadata> {
  return {
    title: `Conversation ${params.conversationId} - SiLynkr`,
  };
} 