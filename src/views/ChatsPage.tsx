'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MeizitoProviders } from '@/src/context/MeizitoProviders';
import { useMeizito } from '@/src/context/MeizitoContext';
import MeizitoChatEmbed from '@/src/views/meizito/components/MeizitoChatEmbed';
import AssistantSuggestionStrip from '@/src/components/automation/AssistantSuggestionStrip';
import { hintsForChats } from '@/src/lib/automation/contextual-hints';

function ChatsPageInner() {
  const { ensureMeizitoModuleLoaded, setActiveThreadId, refreshChat, dataSources, activeBusinessId } =
    useMeizito();
  const searchParams = useSearchParams();
  const threadFromUrl = searchParams.get('thread');

  useEffect(() => {
    ensureMeizitoModuleLoaded('chat');
  }, [ensureMeizitoModuleLoaded]);

  useEffect(() => {
    if (threadFromUrl) setActiveThreadId(threadFromUrl);
  }, [threadFromUrl, setActiveThreadId]);

  useEffect(() => {
    if (dataSources.chat !== 'api' || !activeBusinessId) return;
    const id = window.setInterval(() => {
      void refreshChat();
    }, 25_000);
    return () => window.clearInterval(id);
  }, [dataSources.chat, activeBusinessId, refreshChat]);

  return (
    <div className="space-y-6" dir="rtl">
      <AssistantSuggestionStrip hints={hintsForChats()} />
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">گفتگوها</h1>
        <p className="text-sm text-gray-500 mt-1">
          گفتگوی شخصی، گروه و کانال — یک جام برای همه مکالمات تیمی
        </p>
      </div>
      <MeizitoChatEmbed variant="full" />
    </div>
  );
}

export default function ChatsPage() {
  return (
    <MeizitoProviders workspaceSnapshotEnabled={false}>
      <ChatsPageInner />
    </MeizitoProviders>
  );
}
