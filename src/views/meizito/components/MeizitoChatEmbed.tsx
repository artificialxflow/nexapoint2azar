'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send,
  Star,
  Pin,
  FileText,
  Search,
  Mic,
  Paperclip,
  User,
  Megaphone,
  Users,
  CheckCheck,
  Plus,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { attachmentScopeForMeizitoChat } from '@/src/lib/attachments/scopes';
import { idbGetBlob } from '@/src/lib/attachments/idb';
import { openLocalAttachment, uploadAttachment } from '@/src/lib/attachments/client';
import type { AttachmentRef } from '@/src/types/attachment';
import { useMeizito } from '@/src/context/MeizitoContext';
import type {
  MeizitoChatListTab,
  MeizitoChatMessage,
  MeizitoRecurrence,
  MeizitoThreadType,
} from '@/src/types/meizito';
import {
  MEIZITO_CHAT_LIST_TABS,
  MEIZITO_THREAD_TYPE_LABELS,
  sortMeizitoThreads,
} from '@/src/types/meizito';
import {
  NewChannelModal,
  NewDirectChatModal,
  NewGroupChatModal,
  ThreadSettingsModal,
  type NewChatModalKind,
} from './NewChatModals';
import JalaliDateInput from '@/src/views/meizito/components/JalaliDateInput';
import { apiChatMessageToCard } from '@/src/lib/meizito/chat/client';

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatDayLabel(dateKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateKey === today) return 'امروز';
  if (dateKey === yesterday) return 'دیروز';
  try {
    return new Date(dateKey).toLocaleDateString('fa-IR', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

function formatVoiceDuration(sec?: number) {
  if (!sec) return '۰:۰۰';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ChatImagePreview({
  attachmentRef,
  alt,
  className = 'max-w-full rounded-lg max-h-48',
}: {
  attachmentRef: AttachmentRef;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(attachmentRef.url ?? null);
  useEffect(() => {
    if (attachmentRef.url) {
      setSrc(attachmentRef.url);
      return;
    }
    let alive = true;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const blob = await idbGetBlob(attachmentRef.id);
        if (blob && alive) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentRef]);
  if (!src) {
    return <span className="text-xs opacity-80">در حال بارگذاری تصویر…</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? attachmentRef.name ?? 'تصویر'} className={className} />
  );
}

function VoiceMessagePlayer({ attachmentRef }: { attachmentRef: AttachmentRef }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    const load = async () => {
      if (attachmentRef.url) {
        if (alive) setSrc(attachmentRef.url);
        return;
      }
      try {
        const blob = await idbGetBlob(attachmentRef.id);
        if (blob && alive) {
          objectUrl = URL.createObjectURL(blob);
          setSrc(objectUrl);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentRef]);
  if (!src) {
    return <span className="text-xs opacity-80">در حال آماده‌سازی پخش…</span>;
  }
  return <audio controls preload="metadata" src={src} className="max-w-[min(220px,100%)] h-8" />;
}

type Props = {
  variant?: 'full' | 'compact';
};

export default function MeizitoChatEmbed({ variant = 'full' }: Props) {
  const compact = variant === 'compact';
  const {
    threads,
    messages,
    activeThreadId,
    setActiveThreadId,
    addMessage,
    chatSendError,
    clearChatSendError,
    chatSendingThreadId,
    addThread,
    getThreadMessagesForDate,
    getThreadMessages,
    createCardFromText,
    addCard,
    updateCard,
    toggleThreadStar,
    toggleThreadPin,
    updateChatThread,
    listTeamDirectory,
    boards,
    activeBoardId,
    columns,
    currentUserName,
    addInternalRequest,
    currentUserId,
    updateChatMessage,
    deleteChatMessage,
    activeBusinessId,
    refreshWorkspace,
  } = useMeizito();

  const [listTab, setListTab] = useState<MeizitoChatListTab>('all');
  const [listSearch, setListSearch] = useState('');
  const [newModal, setNewModal] = useState<NewChatModalKind>(null);
  const [threadSettingsOpen, setThreadSettingsOpen] = useState(false);
  const teamMentionOptions = useMemo(() => listTeamDirectory('all').slice(0, 8), [listTeamDirectory]);
  const [body, setBody] = useState('');
  const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const [taskModal, setTaskModal] = useState<{
    text: string;
    messageId: string;
    threadId: string;
  } | null>(null);

  useEffect(() => {
    if (!taskModal) return;
    void refreshWorkspace();
  }, [taskModal, refreshWorkspace]);
  const [taskForm, setTaskForm] = useState({
    assignee: '',
    dueDate: '',
    recurrence: 'none' as MeizitoRecurrence,
  });
  const [isRecording, setIsRecording] = useState(false);
  const recordStartRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [msgSearch, setMsgSearch] = useState('');
  const [forwardMsg, setForwardMsg] = useState<MeizitoChatMessage | null>(null);
  const [starredMsgIds, setStarredMsgIds] = useState<string[]>([]);

  useEffect(() => {
    if (!activeBusinessId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`nexa-chat-star-${activeBusinessId}`);
      setStarredMsgIds(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setStarredMsgIds([]);
    }
  }, [activeBusinessId]);

  const toggleMsgStar = (messageId: string) => {
    setStarredMsgIds((prev) => {
      const next = prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId];
      if (activeBusinessId && typeof window !== 'undefined') {
        localStorage.setItem(`nexa-chat-star-${activeBusinessId}`, JSON.stringify(next));
      }
      return next;
    });
  };
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const activeThread = threads.find((t) => t.id === activeThreadId);

  const filteredThreads = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const base = threads.filter((t) => {
      if (listTab !== 'all' && t.threadType !== listTab) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.participantNames.some((n) => n.toLowerCase().includes(q))
      );
    });
    return sortMeizitoThreads(base, messages);
  }, [threads, listTab, listSearch, messages]);

  const handleNewThread = (title: string, threadType: MeizitoThreadType, participants: string[]) => {
    addThread(title, threadType, participants);
    setListTab(threadType === 'direct' ? 'direct' : threadType);
  };

  const lastPreview = useMemo(() => {
    const map: Record<string, { text: string; time: string }> = {};
    for (const t of threads) {
      const lastId = t.messageIds[t.messageIds.length - 1];
      const msg = messages.find((m) => m.id === lastId);
      if (msg) {
        let text = msg.body;
        if (msg.type === 'voice') text = `پیام صوتی — ${formatVoiceDuration(msg.voiceDurationSec)}`;
        if (msg.type === 'file' && msg.attachmentNames.length) text = `فایل: ${msg.attachmentNames[0]}`;
        map[t.id] = { text, time: formatMsgTime(msg.createdAt) };
      } else {
        map[t.id] = { text: 'بدون پیام', time: '' };
      }
    }
    return map;
  }, [threads, messages]);

  const flatMessages = useMemo(() => {
    const searchAll = Boolean(msgSearch.trim());
    const base = compact
      ? getThreadMessages(activeThreadId)
      : searchAll
        ? getThreadMessages(activeThreadId)
        : getThreadMessagesForDate(activeThreadId, dateKey);
    const q = msgSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (m) =>
        m.body.toLowerCase().includes(q) ||
        m.attachmentNames.some((n) => n.toLowerCase().includes(q))
    );
  }, [compact, getThreadMessages, getThreadMessagesForDate, activeThreadId, dateKey, messages, msgSearch]);

  const messageGroups = useMemo(() => {
    if (!compact) return [{ day: dateKey, items: flatMessages }];
    const map = new Map<string, MeizitoChatMessage[]>();
    for (const m of flatMessages) {
      const d = (m.createdAt ?? '').slice(0, 10);
      const arr = map.get(d) ?? [];
      arr.push(m);
      map.set(d, arr);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, items]) => ({ day, items }));
  }, [compact, flatMessages, dateKey]);

  const firstCol =
    columns.find((c) => c.boardId === activeBoardId && c.order === 0)?.id ??
    columns.find((c) => c.boardId === activeBoardId)?.id ??
    '';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [flatMessages, activeThreadId, messageGroups]);

  const sendText = () => {
    if (!body.trim() || !activeThreadId) return;
    addMessage(activeThreadId, currentUserName, body.trim(), { type: 'text' });
    setBody('');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !activeThreadId) {
      e.target.value = '';
      return;
    }
    const link = activeBusinessId
      ? { businessId: activeBusinessId, entityType: 'chat_message' as const }
      : undefined;
    if (f.type.startsWith('image/')) {
      const path = attachmentScopeForMeizitoChat(activeBusinessId, activeThreadId);
      const ref = await uploadAttachment(f, path, link);
      if (ref) {
        addMessage(activeThreadId, currentUserName, f.name, {
          type: 'image',
          attachmentNames: [f.name],
          attachmentRefs: [ref],
        });
      } else {
        addMessage(activeThreadId, currentUserName, f.name, {
          type: 'image',
          attachmentNames: [f.name],
        });
      }
      e.target.value = '';
      return;
    }
    const path = attachmentScopeForMeizitoChat(activeBusinessId, activeThreadId);
    const ref = await uploadAttachment(f, path, link);
    const msgType = f.type.startsWith('video/') ? 'video' : 'file';
    if (ref) {
      addMessage(activeThreadId, currentUserName, `فایل: ${f.name}`, {
        type: msgType,
        attachmentNames: [f.name],
        attachmentRefs: [ref],
      });
    } else {
      addMessage(activeThreadId, currentUserName, `فایل: ${f.name}`, {
        type: msgType,
        attachmentNames: [f.name],
      });
    }
    e.target.value = '';
  };

  const insertMention = (name: string) => {
    setBody((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@${name} `);
  };

  const forwardToThread = (m: MeizitoChatMessage, targetThreadId: string) => {
    const summary =
      m.type === 'text'
        ? m.body
        : m.type === 'voice'
          ? `پیام صوتی (${formatVoiceDuration(m.voiceDurationSec)})`
          : m.attachmentNames[0] ?? m.body;
    const fromTitle = threads.find((t) => t.id === m.threadId)?.title ?? 'گفتگو';
    addMessage(targetThreadId, currentUserName, `↪ از «${fromTitle}»:\n${summary}`, {
      type: m.type === 'voice' || m.type === 'image' || m.type === 'file' || m.type === 'video' ? m.type : 'text',
      attachmentNames: m.attachmentNames?.length ? [...m.attachmentNames] : undefined,
      attachmentRefs: m.attachmentRefs?.length ? [...m.attachmentRefs] : undefined,
      voiceDurationSec: m.voiceDurationSec,
    });
    setForwardMsg(null);
    setActiveThreadId(targetThreadId);
    if (compact) setMobileShowMessages(true);
  };

  const convertToRequest = (m: MeizitoChatMessage) => {
    void addInternalRequest(
      {
        subject: m.body.slice(0, 80) || 'درخواست از گفتگو',
        body: m.body,
        authorId: currentUserId,
        authorName: currentUserName,
        sourceChatMessageId: m.id,
        sourceChatThreadId: m.threadId,
        box: 'outbox',
      },
      { submitForApproval: true }
    ).then(() => {
      window.location.href = `/dashboard/work-requests`;
    });
  };

  const stopRecording = () => {
    if (!isRecording || !activeThreadId) return;
    setIsRecording(false);
    const sec = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000));
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        void (async () => {
          const chunks = recordChunksRef.current;
          recordChunksRef.current = [];
          recordStreamRef.current?.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
          mediaRecorderRef.current = null;
          if (chunks.length === 0) return;
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const file = new File([blob], `voice-${Date.now()}.webm`, {
            type: blob.type || 'audio/webm',
          });
          const path = attachmentScopeForMeizitoChat(activeBusinessId, activeThreadId);
          const voiceLink = activeBusinessId
            ? { businessId: activeBusinessId, entityType: 'chat_message' as const }
            : undefined;
          try {
            const ref = await uploadAttachment(file, path, voiceLink);
            addMessage(activeThreadId, currentUserName, 'پیام صوتی', {
              type: 'voice',
              voiceDurationSec: sec,
              attachmentNames: [ref.name],
              attachmentRefs: [ref],
            });
          } catch {
            addMessage(activeThreadId, currentUserName, `پیام صوتی (${sec} ثانیه)`, {
              type: 'voice',
              voiceDurationSec: sec,
            });
          }
        })();
      };
      recorder.stop();
      return;
    }
    addMessage(activeThreadId, currentUserName, `پیام صوتی (${sec} ثانیه)`, {
      type: 'voice',
      voiceDurationSec: sec,
    });
  };

  const startRecording = () => {
    if (!activeThreadId || isRecording) return;
    recordStartRef.current = Date.now();
    void (async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setIsRecording(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recordStreamRef.current = stream;
        recordChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
        };
        recorder.start();
        setIsRecording(true);
      } catch {
        setIsRecording(false);
      }
    })();
  };

  const renderMessageBody = (m: MeizitoChatMessage, isMe: boolean) => {
    if (m.type === 'voice') {
      const voiceRef = m.attachmentRefs?.[0];
      return (
        <div className={`space-y-1 ${isMe ? 'text-white' : 'text-gray-800'}`}>
          <div className="flex items-center gap-2">
            <Mic size={16} />
            <span className="text-sm font-bold">{formatVoiceDuration(m.voiceDurationSec)}</span>
          </div>
          {voiceRef ? (
            <VoiceMessagePlayer attachmentRef={voiceRef} />
          ) : (
            <span className="text-xs opacity-80">پیام صوتی (بدون فایل ضبط‌شده)</span>
          )}
        </div>
      );
    }
    if (m.type === 'image' && (m.attachmentRefs?.length ?? 0) > 0) {
      const ref = m.attachmentRefs![0];
      return (
        <div className="space-y-1">
          <ChatImagePreview attachmentRef={ref} alt={m.attachmentNames[0]} />
          <button
            type="button"
            className={`text-xs flex items-center gap-1 font-bold underline ${
              isMe ? 'text-white/90' : 'text-nexa-accent'
            }`}
            onClick={() => openLocalAttachment(ref)}
          >
            <FileText size={12} />
            {ref.name}
          </button>
          {m.body && <p className="text-xs">{m.body}</p>}
        </div>
      );
    }
    if (m.type === 'file' || m.attachmentNames.length > 0 || (m.attachmentRefs?.length ?? 0) > 0) {
      const refs = m.attachmentRefs ?? [];
      return (
        <div className="space-y-1">
          {m.body && <p className="text-sm whitespace-pre-wrap">{m.body}</p>}
          {refs.length > 0 ? (
            <ul className="space-y-0.5">
              {refs.map((ref) => (
                <li key={ref.id}>
                  <button
                    type="button"
                    className={`text-xs flex items-center gap-1 font-bold underline ${
                      isMe ? 'text-white/90' : 'text-nexa-accent'
                    }`}
                    onClick={() => openLocalAttachment(ref)}
                  >
                    <FileText size={12} />
                    {ref.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-xs flex items-center gap-1 ${isMe ? 'text-white/80' : 'text-nexa-accent'}`}>
              <FileText size={12} />
              {m.attachmentNames.join('، ')}
            </p>
          )}
        </div>
      );
    }
    return <p className="text-sm whitespace-pre-wrap">{m.body}</p>;
  };

  const renderBubble = (m: MeizitoChatMessage, prevAuthor?: string) => {
    const isMe = m.author === currentUserName || m.author === 'شما';
    const newSpeaker = prevAuthor !== undefined && prevAuthor !== m.author;
    const msgStarred = starredMsgIds.includes(m.id);
    return (
      <div
        key={m.id}
        className={`flex ${isMe ? 'justify-start' : 'justify-end'} ${newSpeaker ? 'mt-4' : 'mt-1'}`}
      >
        <div className="max-w-[85%] group">
          {!isMe && (
            <p className="text-[10px] font-bold text-gray-400 mb-1 mr-2">{m.author}</p>
          )}
          <div
            className={`px-4 py-3 rounded-2xl relative ${
              isMe
                ? 'bg-nexa-primary text-white rounded-tr-none shadow-md'
                : 'bg-white text-gray-800 rounded-tl-none border border-nexa-border'
            }`}
          >
            {renderMessageBody(m, isMe)}
            <div
              className={`flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 justify-between text-[10px] ${
                isMe ? 'text-white/70' : 'text-gray-400'
              }`}
            >
              <motion.div
                className="flex flex-wrap items-center gap-2"
                initial={{ opacity: 0.85 }}
                whileHover={{ opacity: 1 }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setTaskModal({
                      text: m.body || m.attachmentNames.join(' '),
                      messageId: m.id,
                      threadId: m.threadId,
                    })
                  }
                  className={`font-bold ${isMe ? 'text-white/90 hover:underline' : 'text-nexa-accent'}`}
                >
                  → وظیفه
                </button>
                <button
                  type="button"
                  onClick={() => convertToRequest(m)}
                  className={`font-bold ${isMe ? 'text-white/90 hover:underline' : 'text-nexa-accent'}`}
                >
                  → درخواست
                </button>
                <button
                  type="button"
                  onClick={() => setForwardMsg(m)}
                  className={`font-bold ${isMe ? 'text-white/90 hover:underline' : 'text-nexa-accent'}`}
                >
                  فوروارد
                </button>
                <button
                  type="button"
                  onClick={() => toggleMsgStar(m.id)}
                  className={`font-bold flex items-center gap-0.5 ${
                    msgStarred
                      ? isMe
                        ? 'text-amber-200'
                        : 'text-amber-600'
                      : isMe
                        ? 'text-white/80 hover:underline'
                        : 'text-nexa-accent'
                  }`}
                >
                  <Star size={10} fill={msgStarred ? 'currentColor' : 'none'} />
                  ستاره
                </button>
                {isMe && m.type === 'text' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMsgId(m.id);
                      setEditBody(m.body);
                    }}
                    className={`font-bold ${isMe ? 'text-white/80 hover:underline' : ''}`}
                  >
                    ویرایش
                  </button>
                )}
                {isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('پیام حذف شود؟')) deleteChatMessage(m.id);
                    }}
                    className="font-bold text-rose-300 hover:underline"
                  >
                    حذف
                  </button>
                )}
              </motion.div>
              <span className="flex items-center gap-1 font-fa-num shrink-0">
                {formatMsgTime(m.createdAt)}
                {m.editedAt && <span className="opacity-70">· ویرایش</span>}
                {isMe && <CheckCheck size={12} />}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const listPanel = (
    <div
      className={`w-full lg:w-80 nexa-card flex flex-col overflow-hidden bg-white shrink-0 ${
        compact && mobileShowMessages ? 'hidden lg:flex' : ''
      }`}
    >
      <div className="p-4 border-b border-nexa-border">
        <div className="flex gap-1 mb-3 overflow-x-auto no-scrollbar">
          {MEIZITO_CHAT_LIST_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setListTab(tab.id)}
              className={`shrink-0 px-3 py-2 text-[10px] font-bold rounded-lg transition-all ${
                listTab === tab.id
                  ? 'bg-nexa-accent text-white shadow-md shadow-nexa-accent/20'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="جستجوی گفتگو..."
            className="w-full bg-gray-50 border-none rounded-xl py-2 pr-10 pl-4 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            onClick={() => setNewModal('direct')}
            className="text-[10px] font-bold text-nexa-accent flex items-center gap-1"
          >
            <Plus size={12} />
            گفتگوی جدید
          </button>
          <button
            type="button"
            onClick={() => setNewModal('group')}
            className="text-[10px] font-bold text-blue-600 flex items-center gap-1"
          >
            <Users size={12} />
            گروه جدید
          </button>
          <button
            type="button"
            onClick={() => setNewModal('channel')}
            className="text-[10px] font-bold text-purple-600 flex items-center gap-1"
          >
            <Megaphone size={12} />
            کانال جدید
          </button>
        </div>
      </div>
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar ${
          compact ? 'max-h-[220px] lg:max-h-none' : 'max-h-[360px] lg:max-h-none'
        }`}
      >
        {filteredThreads.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setActiveThreadId(t.id);
              setMobileShowMessages(true);
            }}
            className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-nexa-border/50 text-right ${
              activeThreadId === t.id ? 'bg-nexa-accent/5' : ''
            }`}
          >
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                t.threadType === 'channel'
                  ? 'bg-purple-50 text-purple-600'
                  : t.threadType === 'group'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {t.threadType === 'channel' ? (
                <Megaphone size={20} />
              ) : t.threadType === 'group' ? (
                t.title[0]
              ) : (
                <User size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1 gap-2">
                <h4 className="text-sm font-bold text-gray-900 truncate">{t.title}</h4>
                <span className="text-[10px] text-gray-400 font-fa-num shrink-0">
                  {lastPreview[t.id]?.time}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">{lastPreview[t.id]?.text}</p>
              {listTab === 'all' && (
                <span className="text-[9px] text-gray-400 mt-0.5 inline-block">
                  {MEIZITO_THREAD_TYPE_LABELS[t.threadType]}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {t.pinned && <Pin size={12} className="text-nexa-accent" />}
              {t.starred && <Star size={12} className="text-amber-500" fill="currentColor" />}
            </div>
          </button>
        ))}
        {filteredThreads.length === 0 && (
          <div className="text-center py-8 px-4 space-y-3">
            <p className="text-xs text-gray-400">گفتگویی نیست.</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setNewModal('direct')}
                className="text-xs font-bold text-nexa-accent"
              >
                + گفتگوی جدید
              </button>
              <button type="button" onClick={() => setNewModal('group')} className="text-xs font-bold text-blue-600">
                + گروه جدید
              </button>
              <button
                type="button"
                onClick={() => setNewModal('channel')}
                className="text-xs font-bold text-purple-600"
              >
                + کانال جدید
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const messagesPanel = (
    <div
      className={`flex-1 nexa-card flex flex-col overflow-hidden bg-white ${
        compact ? 'min-h-[320px]' : 'min-h-[360px]'
      } ${compact && !mobileShowMessages ? 'hidden lg:flex' : ''}`}
    >
      <div className="p-4 border-b border-nexa-border flex items-center justify-between gap-2">
        {compact && (
          <button
            type="button"
            className="lg:hidden p-2 text-gray-500"
            onClick={() => setMobileShowMessages(false)}
          >
            <ChevronRight size={18} />
          </button>
        )}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-nexa-accent/10 flex items-center justify-center text-nexa-accent shrink-0">
            {activeThread?.threadType === 'channel' ? <Megaphone size={20} /> : <User size={20} />}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 truncate">{activeThread?.title ?? '—'}</h4>
            <p className="text-[10px] text-gray-500 truncate">
              {!activeThread
                ? '—'
                : activeThread.threadType === 'direct'
                  ? 'گفتگوی شخصی'
                  : activeThread.threadType === 'group'
                    ? `گروه · ${activeThread.participantNames.join('، ') || '—'}`
                    : `کانال · ${activeThread.participantNames.join('، ') || 'همهٔ تیم'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeThread &&
            (activeThread.threadType === 'group' || activeThread.threadType === 'channel') && (
              <button
                type="button"
                onClick={() => setThreadSettingsOpen(true)}
                title="تنظیمات"
                className="p-2 rounded-xl border border-nexa-border text-gray-500 hover:text-nexa-accent"
              >
                <Settings size={16} />
              </button>
            )}
          {!compact && (
            <>
              <label className="text-xs text-gray-500 hidden sm:inline">تاریخ</label>
              <JalaliDateInput
                value={dateKey}
                onChange={setDateKey}
                className="max-w-[11rem]"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => activeThreadId && toggleThreadPin(activeThreadId)}
            title="پین"
            className={`p-2 rounded-xl border border-nexa-border ${activeThread?.pinned ? 'text-nexa-accent' : 'text-gray-400'}`}
          >
            <Pin size={16} className={activeThread?.pinned ? 'fill-current' : ''} />
          </button>
          <button
            type="button"
            onClick={() => activeThreadId && toggleThreadStar(activeThreadId)}
            title="نشان‌دار"
            className={`p-2 rounded-xl border border-nexa-border ${activeThread?.starred ? 'text-amber-500' : 'text-gray-400'}`}
          >
            <Star size={16} fill={activeThread?.starred ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-nexa-border">
        <input
          value={msgSearch}
          onChange={(e) => setMsgSearch(e.target.value)}
          placeholder={
            compact
              ? 'جستجو در پیام‌ها…'
              : 'جستجو در گفتگو (همهٔ روزها با متن جستجو فعال می‌شود)…'
          }
          className="w-full bg-gray-50 rounded-xl py-1.5 px-3 text-xs"
        />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
        {messageGroups.map((group) => (
          <div key={group.day} className="mb-4">
            {compact && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-bold text-gray-400 px-2">{formatDayLabel(group.day)}</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            )}
            {group.items.map((m, i) => renderBubble(m, group.items[i - 1]?.author))}
          </div>
        ))}
        {flatMessages.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-12">
            {compact ? 'هنوز پیامی نیست — اولین پیام را بفرستید.' : 'پیامی برای این تاریخ در این گفتگو نیست.'}
          </p>
        )}
      </div>

      <div className="p-4 bg-white border-t border-nexa-border">
        <div className="flex flex-wrap gap-1 mb-2">
          {teamMentionOptions.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => insertMention(u.name)}
              className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-nexa-accent/10"
            >
              @{u.name}
            </button>
          ))}
        </div>
        {chatSendingThreadId === activeThreadId && (
          <p className="text-[10px] text-gray-500 mb-1">در حال ارسال…</p>
        )}
        {chatSendError && (
          <p className="text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2 mb-2" role="alert">
            {chatSendError}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label className="p-2 text-gray-400 hover:text-nexa-accent cursor-pointer">
            <Paperclip size={20} />
            <input type="file" className="hidden" onChange={onFile} />
          </label>
          <textarea
            value={body}
            onChange={(e) => {
              clearChatSendError();
              setBody(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder="پیام خود را بنویسید..."
            className="flex-1 bg-gray-50 border-none rounded-2xl py-2.5 px-4 text-sm resize-none max-h-28 min-h-[42px]"
            rows={1}
          />
          <AnimatePresence mode="wait">
            {body.trim() ? (
              <motion.button
                key="send"
                type="button"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                onClick={sendText}
                className="p-2.5 bg-nexa-accent text-white rounded-2xl shadow-md"
              >
                <Send size={20} />
              </motion.button>
            ) : (
              <motion.button
                key="mic"
                type="button"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={() => isRecording && stopRecording()}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`p-2.5 rounded-2xl ${
                  isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Mic size={20} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {!compact && <p className="text-xs text-gray-500">گفتگو — شخصی، گروه و کانال</p>}
      <div className={`flex flex-col lg:flex-row gap-4 ${compact ? 'min-h-[400px]' : 'min-h-[480px]'}`}>
        {listPanel}
        {messagesPanel}
      </div>

      <NewDirectChatModal
        open={newModal === 'direct'}
        onClose={() => setNewModal(null)}
        onSubmit={(title, parts) => handleNewThread(title, 'direct', parts)}
      />
      <NewGroupChatModal
        open={newModal === 'group'}
        onClose={() => setNewModal(null)}
        onSubmit={(title, parts) => handleNewThread(title, 'group', parts)}
      />
      <NewChannelModal
        open={newModal === 'channel'}
        onClose={() => setNewModal(null)}
        onSubmit={(title, parts) => handleNewThread(title, 'channel', parts)}
      />
      {activeThread &&
        (activeThread.threadType === 'group' || activeThread.threadType === 'channel') && (
          <ThreadSettingsModal
            key={`${activeThread.id}-${threadSettingsOpen}`}
            open={threadSettingsOpen}
            onClose={() => setThreadSettingsOpen(false)}
            threadType={activeThread.threadType}
            initialTitle={activeThread.title}
            initialParticipants={activeThread.participantNames}
            onSave={(title, participants) => {
              if (!activeThreadId) return;
              updateChatThread(activeThreadId, { title, participantNames: participants });
            }}
          />
        )}

      {editingMsgId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-nexa-border shadow-xl" dir="rtl">
            <p className="font-black text-gray-900 mb-2">ویرایش پیام</p>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  updateChatMessage(editingMsgId, {
                    body: editBody,
                    editedAt: new Date().toISOString(),
                  });
                  setEditingMsgId(null);
                }}
                className="flex-1 nexa-btn-primary py-2 text-sm font-bold"
              >
                ذخیره
              </button>
              <button
                type="button"
                onClick={() => setEditingMsgId(null)}
                className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {forwardMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-nexa-border shadow-xl" dir="rtl">
            <p className="font-black text-gray-900 mb-2">فوروارد پیام</p>
            <p className="text-xs text-gray-500 mb-3 line-clamp-3">{forwardMsg.body || forwardMsg.attachmentNames[0]}</p>
            <ul className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {threads
                .filter((t) => t.id !== forwardMsg.threadId)
                .map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => forwardToThread(forwardMsg, t.id)}
                      className="w-full text-right text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100"
                    >
                      {t.title}
                      <span className="text-[10px] text-gray-400 font-normal mr-2">
                        {MEIZITO_THREAD_TYPE_LABELS[t.threadType]}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            <button
              type="button"
              onClick={() => setForwardMsg(null)}
              className="w-full bg-gray-100 rounded-xl py-2 text-sm font-bold"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {taskModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-nexa-border shadow-xl">
            <p className="font-black text-gray-900 mb-2">تبدیل به وظیفه</p>
            <p className="text-xs text-gray-600 mb-4 line-clamp-4">{taskModal.text}</p>
            <input
              placeholder="ارجاع به"
              value={taskForm.assignee}
              onChange={(e) => setTaskForm((f) => ({ ...f, assignee: e.target.value }))}
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-2"
            />
            <JalaliDateInput
              value={taskForm.dueDate}
              onChange={(dueDate) => setTaskForm((f) => ({ ...f, dueDate }))}
              className="w-full mb-2"
            />
            <select
              value={taskForm.recurrence}
              onChange={(e) =>
                setTaskForm((f) => ({ ...f, recurrence: e.target.value as MeizitoRecurrence }))
              }
              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm mb-4"
            >
              <option value="none">بدون تکرار</option>
              <option value="daily">روزانه</option>
              <option value="weekly">هفتگی</option>
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!firstCol || !activeBoardId) return;
                  const title = taskModal.text.slice(0, 200);
                  if (activeBusinessId) {
                    void apiChatMessageToCard(activeBusinessId, {
                      messageId: taskModal.messageId,
                      boardId: activeBoardId,
                      columnId: firstCol,
                      title,
                      description: taskModal.text,
                    }).then(() => refreshWorkspace());
                  } else {
                    void addCard(activeBoardId, firstCol, title).then((cardId) => {
                      if (typeof cardId === 'string') {
                        updateCard(cardId, {
                          description: taskModal.text,
                          assignee: taskForm.assignee,
                          dueDate: taskForm.dueDate,
                          recurrence: taskForm.recurrence,
                          sourceChatMessageId: taskModal.messageId,
                          sourceChatThreadId: taskModal.threadId,
                        });
                      } else {
                        createCardFromText(
                          activeBoardId,
                          firstCol,
                          title,
                          taskForm.assignee,
                          taskForm.dueDate,
                          taskForm.recurrence
                        );
                      }
                    });
                  }
                  setTaskModal(null);
                }}
                className="flex-1 nexa-btn-primary py-2 text-sm font-bold"
              >
                ایجاد روی {boards.find((b) => b.id === activeBoardId)?.name}
              </button>
              <button
                type="button"
                onClick={() => setTaskModal(null)}
                className="flex-1 bg-gray-100 rounded-xl py-2 text-sm font-bold"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
