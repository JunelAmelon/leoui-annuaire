'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { addDocument, getDocuments, updateDocument, getDocument } from '@/lib/db';
import { MessageSquare, Send, Paperclip, Search, Users, Store, ChevronLeft, ChevronRight, Heart, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage';

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
  attachments?: Array<{ url: string; name?: string; type?: string }>;
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [imageGallery, setImageGallery] = useState<{ attachments: { url: string; name?: string; type?: string }[]; index: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [vendorPhotos, setVendorPhotos] = useState<Record<string, string>>({});

  const openConversation = (conv: Conversation, mobile = true) => {
    setSelected(conv);
    if (mobile) setShowMobileChat(true);
    if ((conv.unread_count_client ?? 0) > 0) {
      updateDocument('conversations', conv.id, { unread_count_client: 0 });
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count_client: 0 } : c));
    }
  };

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
          openConversation(newConvs[0] as Conversation, false);
        } else {
          const sorted = (convs as Conversation[]).sort((a, b) => {
            const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
            const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
            return tb - ta;
          });
          setConversations(sorted);
          if (sorted.length > 0) { openConversation(sorted[0], false); }
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

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      const t = f.type.toLowerCase();
      return t.startsWith('image/') || t === 'application/pdf';
    });
    if (valid.length) setPendingFiles(prev => [...prev, ...valid]);
    setShowAttachMenu(false);
  };

  const removePendingFile = (idx: number) => setPendingFiles(prev => prev.filter((_, i) => i !== idx));

  const sendMessage = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0) || !selected || !user) return;
    setSending(true);
    const content = newMessage.trim();
    try {
      const attachments = [];
      for (const file of pendingFiles) {
        const url = await uploadFile(file, 'chat');
        attachments.push({ url, name: file.name, type: file.type });
      }
      const lastLabel = attachments.length
        ? (attachments.length === 1 ? `Fichier : ${attachments[0].name}` : `${attachments.length} fichiers joints`)
        : content;
      const msg: Msg = {
        id: Date.now().toString(),
        conversation_id: selected.id,
        sender_id: user.uid,
        sender_role: 'client',
        sender_name: coupleName,
        content,
        attachments: attachments.length ? attachments : undefined,
        created_at: new Date().toISOString(),
      } as any;
      await addDocument('messages', msg);
      const recipientField = selected.type === 'vendor' ? 'unread_count_vendor' : 'unread_count_planner';
      const currentUnread = ((selected as any)[recipientField] || 0) as number;
      await updateDocument('conversations', selected.id, {
        last_message: lastLabel,
        last_message_at: new Date().toISOString(),
        [recipientField]: currentUnread + 1,
      });
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      setPendingFiles([]);
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

  const dayKey = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDayLabel = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((d0 - t0) / 86400000);
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === -1) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
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
                  onClick={() => openConversation(conv)}
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
                  <ChevronLeft className="w-4 h-4" />
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
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === user?.uid || msg.sender_role === 'client';
                    const otherPhoto = selected.type === 'vendor' && selected.vendor_id ? vendorPhotos[selected.vendor_id] : '';
                    const prev = messages[idx - 1];
                    const showDay = dayKey(msg.created_at) !== dayKey(prev?.created_at);

                    return (
                      <div key={msg.id}>
                        {showDay && msg.created_at && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] font-semibold text-charcoal-500 bg-charcoal-50 border border-charcoal-100 px-3 py-1 rounded-full">
                              {formatDayLabel(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                            {msg.content && <p>{msg.content}</p>}
                            {(() => {
                              const attachments = msg.attachments || [];
                              const imageAttachments = attachments.filter((a) => (a.type || '').toLowerCase().startsWith('image/'));
                              const otherAttachments = attachments.filter((a) => !(a.type || '').toLowerCase().startsWith('image/'));
                              const hasMoreImages = imageAttachments.length > 3;
                              const visibleImages = hasMoreImages ? imageAttachments.slice(0, 2) : imageAttachments;
                              const gridClass = imageAttachments.length === 1 ? 'grid-cols-1' : imageAttachments.length === 2 ? 'grid-cols-2' : 'grid-cols-3';
                              return (
                                <>
                                  {imageAttachments.length > 0 && (
                                    <div className={`grid gap-1 mt-2 ${gridClass}`}>
                                      {visibleImages.map((a, i) => (
                                        <button
                                          key={i}
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setImageGallery({ attachments: imageAttachments, index: i }); }}
                                          className="relative aspect-square rounded-xl overflow-hidden border border-white/20"
                                        >
                                          <img src={a.url} alt={a.name || 'Image'} className="w-full h-full object-cover" />
                                        </button>
                                      ))}
                                      {hasMoreImages && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setImageGallery({ attachments: imageAttachments, index: 2 }); }}
                                          className="relative aspect-square rounded-xl overflow-hidden bg-charcoal-900/60 flex items-center justify-center border border-white/20"
                                        >
                                          <span className="text-white font-semibold text-lg">+{imageAttachments.length - 2}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {otherAttachments.map((a, i) => {
                                    const type = (a.type || '').toLowerCase();
                                    const isPdf = type === 'application/pdf';
                                    return (
                                      <div key={i} className="mt-2">
                                        {isPdf ? (
                                          <button
                                            type="button"
                                            onClick={() => setFilePreview({ url: a.url, name: a.name || 'PDF', type: a.type || 'application/pdf' })}
                                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ${isMe ? 'text-white' : 'text-charcoal-700'}`}
                                          >
                                            <FileText className="w-4 h-4" />
                                            <span className="text-xs underline">{a.name || 'Document PDF'}</span>
                                          </button>
                                        ) : (
                                          <a href={a.url} target="_blank" rel="noreferrer" className={`underline text-xs ${isMe ? 'text-rose-100' : 'text-rose-700'}`}>
                                            <span className="inline-flex items-center gap-1">
                                              <Paperclip className="w-3 h-3" />
                                              {a.name || 'Fichier'}
                                            </span>
                                          </a>
                                        )}
                                      </div>
                                    );
                                  })}
                                </>
                              );
                            })()}
                            {msg.created_at && (
                              <p className={`text-xs mt-1 ${isMe ? 'text-rose-200' : 'text-charcoal-400'}`}>
                                {formatTime(msg.created_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 py-3 border-t border-charcoal-100 flex-shrink-0 space-y-2">
                {pendingFiles.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {pendingFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ivory-50 border border-charcoal-200 rounded-lg text-xs text-charcoal-700">
                        {file.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button type="button" onClick={() => removePendingFile(i)} className="text-charcoal-400 hover:text-rose-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="file" id="client-chat-image" className="hidden" multiple accept="image/*" onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                  <input type="file" id="client-chat-pdf" className="hidden" multiple accept="application/pdf" onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!selected || sending}
                      onClick={() => setShowAttachMenu(v => !v)}
                      className="p-2 text-charcoal-400 hover:text-charcoal-700 hover:bg-charcoal-50 rounded-xl transition-colors disabled:opacity-40"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-40 bg-white border border-charcoal-200 rounded-xl shadow-lg z-10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { document.getElementById('client-chat-image')?.click(); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Images
                        </button>
                        <button
                          type="button"
                          onClick={() => { document.getElementById('client-chat-pdf')?.click(); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" /> PDFs
                        </button>
                      </div>
                    )}
                  </div>
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
                    disabled={(!newMessage.trim() && pendingFiles.length === 0) || sending}
                    className="p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-40 transition-colors"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Image gallery preview */}
              {imageGallery && (
                <div className="fixed inset-0 z-50 bg-charcoal-900/90 flex items-center justify-center p-4" onClick={() => setImageGallery(null)}>
                  <button className="absolute top-4 right-4 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-xl" onClick={() => setImageGallery(null)}>
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-full disabled:opacity-30"
                    onClick={(e) => { e.stopPropagation(); setImageGallery((g) => g && g.index > 0 ? { ...g, index: g.index - 1 } : g); }}
                    disabled={imageGallery.index === 0}
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-full disabled:opacity-30"
                    onClick={(e) => { e.stopPropagation(); setImageGallery((g) => g && g.index < g.attachments.length - 1 ? { ...g, index: g.index + 1 } : g); }}
                    disabled={imageGallery.index === imageGallery.attachments.length - 1}
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium">
                    {imageGallery.index + 1} / {imageGallery.attachments.length}
                  </div>
                  <img src={imageGallery.attachments[imageGallery.index].url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
                </div>
              )}

              {/* File preview */}
              {filePreview && (
                <div className="fixed inset-0 z-50 bg-charcoal-900/90 flex items-center justify-center p-4" onClick={() => setFilePreview(null)}>
                  <button className="absolute top-4 right-4 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-xl" onClick={() => setFilePreview(null)}>
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <embed src={filePreview.url} type="application/pdf" className="w-full h-full" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
