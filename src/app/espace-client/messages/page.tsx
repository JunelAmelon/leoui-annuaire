'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { addDocument, getDocuments, updateDocument, getDocument } from '@/lib/db';
import { MessageSquare, Send, Heart, Search, Users, Store } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  type?: string;
  client_name?: string;
  vendor_name?: string;
  vendor_id?: string;
  planner_id?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count_client?: number;
  vendorPhoto?: string;
}

interface Msg {
  id: string;
  sender_role: string;
  sender_name?: string;
  content: string;
  created_at?: string;
  sender_id?: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { client, loading: dataLoading } = useClientData();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [vendorPhotos, setVendorPhotos] = useState<Record<string, string>>({});

  const coupleName = client
    ? `${client.name || ''}${client.name && client.partner ? ' & ' : ''}${client.partner || ''}`.trim()
    : user?.displayName || 'Client';

  useEffect(() => {
    if (!client?.id || !user?.uid) return;
    const load = async () => {
      try {
        const convs = await getDocuments('conversations', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);
        if (convs.length === 0 && client.planner_id) {
          const ref = await addDocument('conversations', {
            planner_id: client.planner_id,
            client_id: client.id,
            type: 'client',
            client_name: coupleName,
            last_message: '',
            last_message_at: new Date().toISOString(),
            unread_count_client: 0,
            unread_count_planner: 0,
            created_at: new Date().toISOString(),
          });
          const newConvs = [{ id: ref.id, type: 'client', client_name: coupleName }];
          setConversations(newConvs as Conversation[]);
          setSelected(newConvs[0] as Conversation);
        } else {
          const sorted = (convs as Conversation[]).sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          });
          setConversations(sorted);
          if (sorted.length > 0) { setSelected(sorted[0]); }
          // Fetch vendor photos for vendor conversations
          const vendorConvs = (convs as Conversation[]).filter(c => c.type === 'vendor' && c.vendor_id);
          if (vendorConvs.length > 0) {
            const photos: Record<string, string> = {};
            await Promise.all(vendorConvs.map(async c => {
              try {
                const v = await getDocument('vendors', c.vendor_id!);
                if (v) photos[c.vendor_id!] = (v as any).images?.[0] || (v as any).imageUrl || '';
              } catch {}
            }));
            setVendorPhotos(photos);
          }
        }
      } catch {
        toast.error('Erreur lors du chargement des conversations');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [client?.id, user?.uid]);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      try {
        const msgs = await getDocuments('messages', [
          { field: 'conversation_id', operator: '==', value: selected.id },
        ]);
        const sorted = (msgs as Msg[]).sort((a, b) => {
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
    if (!newMessage.trim() || !selected || !user) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    try {
      const msg: Msg = {
        id: Date.now().toString(),
        conversation_id: selected.id,
        sender_id: user.uid,
        sender_role: 'client',
        sender_name: coupleName,
        content,
        created_at: new Date().toISOString(),
      } as any;
      await addDocument('messages', msg);
      await updateDocument('conversations', selected.id, {
        last_message: content,
        last_message_at: new Date().toISOString(),
        unread_count_vendor: selected.type === 'vendor' ? 1 : 0,
        unread_count_planner: selected.type !== 'vendor' ? 1 : 0,
      });
      setMessages(prev => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {
      toast.error("Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const convLabel = (c: Conversation) =>
    c.type === 'vendor' ? (c.vendor_name || 'Prestataire') : 'Wedding Planner';

  const convInitial = (c: Conversation) => convLabel(c).charAt(0).toUpperCase();

  const filtered = conversations.filter(c =>
    convLabel(c).toLowerCase().includes(search.toLowerCase())
  );

  if (dataLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-charcoal-100 rounded-xl" />
      <div className="h-96 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Messagerie</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">Vos échanges avec votre planner et vos prestataires.</p>
      </div>

      <div
        className="bg-white border border-charcoal-100 rounded-2xl shadow-soft overflow-hidden flex"
        style={{ height: 'calc(100vh - 240px)', minHeight: 480 }}
      >
        {/* Sidebar */}
        <div className={`border-r border-charcoal-100 flex flex-col flex-shrink-0 ${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-64`}>
          <div className="p-3 border-b border-charcoal-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-8 pr-3 py-2 bg-ivory-50 border border-charcoal-200 rounded-xl text-xs focus:outline-none focus:border-rose-400 transition-all"
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
                <MessageSquare className="w-7 h-7 text-charcoal-300 mx-auto mb-2" />
                <p className="text-xs text-charcoal-500">Aucune conversation</p>
                <p className="text-xs text-charcoal-400 mt-1">Contactez un prestataire depuis la page Prestataires</p>
              </div>
            ) : (
              filtered.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => { setSelected(conv); setShowMobileChat(true); }}
                  className={`w-full text-left px-4 py-3.5 border-b border-charcoal-50 transition-colors hover:bg-charcoal-50 ${
                    selected?.id === conv.id ? 'bg-rose-50 border-l-2 border-l-rose-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Vendor photo or initial */}
                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
                      {conv.type === 'vendor' && conv.vendor_id && vendorPhotos[conv.vendor_id] ? (
                        <img src={vendorPhotos[conv.vendor_id]} alt={convLabel(conv)} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${
                          conv.type === 'vendor'
                            ? 'bg-gradient-to-br from-champagne-100 to-champagne-200 text-champagne-800'
                            : 'bg-gradient-to-br from-rose-100 to-champagne-200 text-charcoal-700'
                        }`}>{convInitial(conv)}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-charcoal-900 truncate">{convLabel(conv)}</p>
                        {(conv.unread_count_client ?? 0) > 0 && (
                          <span className="w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center flex-shrink-0">
                            {conv.unread_count_client}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-400 truncate mt-0.5">
                        {conv.last_message || 'Nouvelle conversation'}
                      </p>
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
              <p className="text-sm text-charcoal-400 mt-1">Vos échanges apparaîtront ici</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3.5 border-b border-charcoal-100 flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setShowMobileChat(false)} className="md:hidden p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-charcoal-50 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {selected.type === 'vendor' && selected.vendor_id && vendorPhotos[selected.vendor_id] ? (
                    <img src={vendorPhotos[selected.vendor_id]} alt={convLabel(selected)} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-sm font-bold ${
                      selected.type === 'vendor'
                        ? 'bg-gradient-to-br from-champagne-100 to-champagne-200 text-champagne-800'
                        : 'bg-gradient-to-br from-rose-100 to-champagne-200 text-charcoal-700'
                    }`}>{convInitial(selected)}</div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-charcoal-900">{convLabel(selected)}</p>
                  <p className="text-xs text-charcoal-400">{selected.type === 'vendor' ? 'Prestataire' : 'Votre wedding planner'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-charcoal-200" />
                      <p className="text-sm text-charcoal-400">Démarrez la conversation</p>
                    </div>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.sender_id === user?.uid || msg.sender_role === 'client';
                    const otherPhoto = selected.type === 'vendor' && selected.vendor_id ? vendorPhotos[selected.vendor_id] : '';
                    return (
                      <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && (
                          <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-0.5">
                            {otherPhoto ? (
                              <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-champagne-100 flex items-center justify-center">
                                <Store className="w-3.5 h-3.5 text-champagne-700" />
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                          isMe ? 'bg-rose-600 text-white rounded-br-md' : 'bg-charcoal-100 text-charcoal-900 rounded-bl-md'
                        }`}>
                          {!isMe && msg.sender_name && (
                            <p className="text-xs font-semibold mb-1 text-charcoal-500">{msg.sender_name}</p>
                          )}
                          <p>{msg.content}</p>
                          {msg.created_at && (
                            <p className={`text-xs mt-1 ${isMe ? 'text-rose-200' : 'text-charcoal-400'}`}>
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

              <div className="px-4 py-3 border-t border-charcoal-100 flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                  placeholder="Écrivez votre message…"
                  className="flex-1 px-4 py-2 bg-ivory-50 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={!newMessage.trim() || sending}
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
  );
}
