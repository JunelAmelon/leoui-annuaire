'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addDocument, getDocuments, updateDocument } from '@/lib/db';
import { MessageSquare, Send, Paperclip, Search } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage';

interface Conversation {
  id: string;
  client_name?: string;
  client_id?: string;
  last_message?: string;
  last_message_at?: any;
  unread_count_planner?: number;
}

interface Message {
  id: string;
  content: string;
  sender_role: string;
  sender_name?: string;
  attachments?: Array<{ url: string; name?: string }>;
  created_at?: any;
  isMe: boolean;
}

export default function AdminMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDocuments('conversations', [])
      .then((docs) => {
        const sorted = (docs as any[]).sort((a, b) => {
          const da = a?.last_message_at?.toDate?.()?.getTime?.() || 0;
          const db = b?.last_message_at?.toDate?.()?.getTime?.() || 0;
          return db - da;
        });
        setConversations(sorted as Conversation[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchMessages = async (conv: Conversation) => {
    const items = await getDocuments('messages', [{ field: 'conversation_id', operator: '==', value: conv.id }]);
    const sorted = (items as any[]).sort((a, b) => {
      const da = a?.created_at?.toDate?.()?.getTime?.() || 0;
      const db = b?.created_at?.toDate?.()?.getTime?.() || 0;
      return da - db;
    });
    setMessages(sorted.map((m) => ({
      id: m.id,
      content: m.content || '',
      sender_role: m.sender_role,
      sender_name: m.sender_name,
      attachments: m.attachments || [],
      created_at: m.created_at,
      isMe: m.sender_role === 'planner',
    })));
    if (conv.unread_count_planner && conv.unread_count_planner > 0) {
      await updateDocument('conversations', conv.id, { unread_count_planner: 0 });
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count_planner: 0 } : c))
      );
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    await fetchMessages(conv);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!user?.uid || !selectedConv || !newMessage.trim()) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    try {
      await addDocument('messages', {
        conversation_id: selectedConv.id,
        sender_id: user.uid,
        sender_role: 'planner',
        sender_name: 'Wedding Planner',
        content,
        created_at: new Date(),
      });
      await updateDocument('conversations', selectedConv.id, {
        last_message: content,
        last_message_at: new Date(),
        unread_count_client: 1,
      });
      await fetchMessages(selectedConv);
    } catch {
      toast.error("Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const handleAttachment = async (file: File) => {
    if (!user?.uid || !selectedConv) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, 'chat');
      await addDocument('messages', {
        conversation_id: selectedConv.id,
        sender_id: user.uid,
        sender_role: 'planner',
        sender_name: 'Wedding Planner',
        content: '',
        attachments: [{ url, name: file.name, type: file.type }],
        created_at: new Date(),
      });
      await updateDocument('conversations', selectedConv.id, {
        last_message: `📎 ${file.name}`,
        last_message_at: new Date(),
        unread_count_client: 1,
      });
      await fetchMessages(selectedConv);
    } catch {
      toast.error("Impossible d'envoyer le fichier");
    } finally {
      setUploading(false);
    }
  };

  const filtered = conversations.filter((c) =>
    (c.client_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Messagerie clients</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">Conversations avec vos clients</p>
      </div>

      <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: '520px' }}>
        <div className="flex h-full">
          {/* Conversation List */}
          <div className="w-64 border-r border-charcoal-100 flex flex-col shrink-0">
            <div className="p-3 border-b border-charcoal-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                <input
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-charcoal-200 rounded-xl focus:outline-none focus:border-rose-400 bg-charcoal-50"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-6"><div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-center p-4 text-charcoal-400 text-sm">Aucune conversation</p>
              ) : (
                filtered.map(conv => (
                  <div key={conv.id} onClick={() => selectConversation(conv)}
                    className={`group p-3.5 border-b border-charcoal-50 cursor-pointer transition-colors ${
                      selectedConv?.id === conv.id
                        ? 'bg-rose-50 border-l-2 border-l-rose-500'
                        : 'hover:bg-charcoal-50'
                    }`}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-champagne-100 border border-champagne-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-champagne-700">{(conv.client_name||'C').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-medium text-charcoal-900 text-sm truncate">{conv.client_name || 'Client'}</p>
                          {(conv.unread_count_planner ?? 0) > 0 && (
                            <span className="text-[0.6rem] font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">{conv.unread_count_planner}</span>
                          )}
                        </div>
                        <p className="text-xs text-charcoal-400 truncate mt-0.5">{conv.last_message || 'Aucun message'}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedConv ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-charcoal-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center">
                  <span className="text-xs font-semibold text-rose-700">{(selectedConv.client_name||'C').charAt(0).toUpperCase()}</span>
                </div>
                <p className="font-semibold text-charcoal-900 text-sm">{selectedConv.client_name || 'Client'}</p>
              </div>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-charcoal-50/30">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                      msg.isMe
                        ? 'bg-charcoal-800 text-white rounded-br-sm'
                        : 'bg-white border border-charcoal-100 text-charcoal-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                      {msg.attachments?.map((a, i) => (
                        <a key={i} href={a.url} target="_blank" rel="noreferrer"
                          className={`underline block text-xs mt-1 ${msg.isMe ? 'text-white/80' : 'text-rose-600'}`}>
                          📎 {a.name || 'Fichier'}
                        </a>
                      ))}
                      <p className={`text-[0.6rem] mt-1 ${msg.isMe ? 'text-white/50' : 'text-charcoal-400'}`}>
                        {msg.created_at?.toDate?.()?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) || ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {/* Input */}
              <div className="p-3 border-t border-charcoal-100 bg-white">
                <div className="flex items-center gap-2">
                  <input type="file" id="admin-chat-file" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleAttachment(f); }} />
                  <button disabled={uploading} onClick={() => document.getElementById('admin-chat-file')?.click()}
                    className="p-2 hover:bg-charcoal-50 rounded-xl transition-colors disabled:opacity-40">
                    <Paperclip className="w-4 h-4 text-charcoal-400" />
                  </button>
                  <input
                    placeholder="Écrire un message…"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                    className="flex-1 px-3 py-2 text-sm border border-charcoal-200 rounded-xl focus:outline-none focus:border-rose-400 bg-ivory-50"
                  />
                  <button disabled={!newMessage.trim() || sending} onClick={() => void handleSend()}
                    className="p-2 bg-charcoal-900 text-white rounded-xl hover:bg-charcoal-700 disabled:opacity-40 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
                <p className="font-semibold text-charcoal-900 text-sm">Sélectionnez une conversation</p>
                <p className="text-xs text-charcoal-400 mt-1">Choisissez un client dans la liste</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
