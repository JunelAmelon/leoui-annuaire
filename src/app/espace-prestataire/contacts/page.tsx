'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { MessageSquare, Send, Paperclip, Clock, Search, Heart } from 'lucide-react';
import { getDocuments, getDocument, addDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  client_id?: string;
  client_name: string;
  client_email?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count_vendor?: number;
}

interface Message {
  id: string;
  sender_role: 'client' | 'vendor';
  sender_name?: string;
  content: string;
  created_at?: string;
}

export default function ContactsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string>>({});
  const [vendorPhoto, setVendorPhoto] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const convs = await getDocuments('conversations', [
          { field: 'vendor_id', operator: '==', value: user.uid },
        ]);
        const sorted = (convs as Conversation[]).sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tb - ta;
        });
        setConversations(sorted);
        if (sorted.length > 0 && !selected) setSelected(sorted[0]);
        const photos: Record<string, string> = {};
        await Promise.all(sorted.map(async c => {
          if (!c.client_id) return;
          try {
            const cl = await getDocument('clients', c.client_id);
            if (cl) photos[c.client_id] = (cl as any).photoURL || '';
          } catch {}
        }));
        setClientPhotos(photos);
        try {
          const vp = await getDocument('vendors', user.uid);
          if (vp) setVendorPhoto((vp as any).images?.[0] || (vp as any).imageUrl || (vp as any).photo || '');
        } catch {}
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      try {
        const msgs = await getDocuments('messages', [
          { field: 'conversation_id', operator: '==', value: selected.id },
        ]);
        const sorted = (msgs as Message[]).sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ta - tb;
        });
        setMessages(sorted);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch {
        setMessages([]);
      }
    };
    load();
  }, [selected]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !selected || !user) return;
    setSending(true);
    try {
      const msg = {
        conversation_id: selected.id,
        sender_id: user.uid,
        sender_role: 'vendor',
        sender_name: user.displayName || user.email,
        content: newMsg.trim(),
        created_at: new Date().toISOString(),
      };
      await addDocument('messages', msg);
      await updateDocument('conversations', selected.id, {
        last_message: newMsg.trim(),
        last_message_at: new Date().toISOString(),
      });
      setMessages(prev => [...prev, { id: Date.now().toString(), ...msg } as Message]);
      setNewMsg('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const filtered = conversations.filter(c =>
    c.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <PrestataireDashboardLayout>
      <div className="mb-5">
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Contacts &amp; Messages</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}>
        <div className="flex h-full">
          {/* Conversation list */}
          <div className={`border-r border-charcoal-100 flex flex-col flex-shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-72`}>
            <div className="p-3 border-b border-charcoal-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-ivory-50 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="Rechercher…"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="h-14 bg-charcoal-50 rounded-xl animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                  <p className="text-sm text-charcoal-500">Aucun contact</p>
                  <p className="text-xs text-charcoal-400 mt-1">Les couples vous contacteront via votre annonce</p>
                </div>
              ) : (
                filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => { setSelected(conv); setShowMobileChat(true); }}
                    className={`w-full text-left px-4 py-3.5 border-b border-charcoal-50 transition-colors hover:bg-charcoal-50 ${selected?.id === conv.id ? 'bg-rose-50 border-l-2 border-l-rose-400' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {conv.client_id && clientPhotos[conv.client_id] ? (
                        <img src={clientPhotos[conv.client_id]} alt={conv.client_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-100 to-champagne-200 flex items-center justify-center text-sm font-bold text-charcoal-700 flex-shrink-0">
                          {conv.client_name?.charAt(0) || 'C'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-charcoal-900 truncate">{conv.client_name || 'Client'}</p>
                          {(conv.unread_count_vendor ?? 0) > 0 && (
                            <span className="ml-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                              {conv.unread_count_vendor}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-charcoal-500 truncate mt-0.5">{conv.last_message || 'Nouvelle conversation'}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`flex-1 flex flex-col min-w-0 ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Heart className="w-10 h-10 text-rose-200 mb-3" />
                <p className="text-charcoal-600 font-medium">Sélectionnez une conversation</p>
                <p className="text-sm text-charcoal-400 mt-1">Répondez aux couples qui s'intéressent à vos services</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-charcoal-100 flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-charcoal-50 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {selected.client_id && clientPhotos[selected.client_id] ? (
                    <img src={clientPhotos[selected.client_id]} alt={selected.client_name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-100 to-champagne-200 flex items-center justify-center text-sm font-bold text-charcoal-700">
                      {selected.client_name?.charAt(0) || 'C'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-charcoal-900">{selected.client_name}</p>
                    {selected.client_email && <p className="text-xs text-charcoal-500">{selected.client_email}</p>}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-charcoal-400">Démarrez la conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isVendor = msg.sender_role === 'vendor';
                      const clientInitial = (selected.client_name || 'C').charAt(0).toUpperCase();
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isVendor ? 'justify-end' : 'justify-start'}`}>
                          {!isVendor ? (
                            selected.client_id && clientPhotos[selected.client_id] ? (
                              <img src={clientPhotos[selected.client_id]} alt={clientInitial} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-100 to-champagne-200 flex items-center justify-center text-xs font-bold text-charcoal-700 flex-shrink-0 mb-0.5">
                                {clientInitial}
                              </div>
                            )
                          ) : vendorPhoto ? (
                            <img src={vendorPhoto} alt="Vous" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5 order-last" />
                          ) : null}
                          <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                            isVendor
                              ? 'bg-rose-600 text-white rounded-br-md'
                              : 'bg-charcoal-100 text-charcoal-900 rounded-bl-md'
                          }`}>
                            <p>{msg.content}</p>
                            {msg.created_at && (
                              <p className={`text-xs mt-1 ${isVendor ? 'text-rose-200' : 'text-charcoal-400'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-charcoal-100 flex items-center gap-2 flex-shrink-0">
                  <button className="p-2 text-charcoal-400 hover:text-charcoal-600 hover:bg-charcoal-50 rounded-lg transition-colors">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1 px-4 py-2 bg-ivory-50 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all"
                    placeholder="Votre réponse…"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMsg.trim() || sending}
                    className="p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
