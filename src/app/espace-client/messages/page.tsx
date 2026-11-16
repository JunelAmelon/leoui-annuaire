'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { addDocument, getDocuments, updateDocument, getDocument } from '@/lib/db';
import { Send, Paperclip, Camera, Search, Store, ChevronLeft, ChevronRight, X, FileText, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from '@/lib/storage';
import LinkifyText from '@/components/LinkifyText';

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
  type?: string;
  file_url?: string;
  document_type?: string;
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
  const [pendingGallery, setPendingGallery] = useState<{ id: string; url: string }[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [clientGallery, setClientGallery] = useState<{ id: string; album: string; url: string }[]>([]);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [imageGallery, setImageGallery] = useState<{ attachments: { url: string; name?: string; type?: string }[]; index: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [vendorPhotos, setVendorPhotos] = useState<Record<string, string>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

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
    if (!client?.id) return;
    const loadGallery = async () => {
      try {
        const docs = await getDocuments('galleries', [
          { field: 'client_id', operator: '==', value: client.id },
        ]);
        setClientGallery((docs as any[]).map(d => ({ id: d.id, album: d.album || 'général', url: d.url })));
      } catch {}
    };
    loadGallery();
  }, [client?.id]);

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
  const removePendingGallery = (id: string) => setPendingGallery(prev => prev.filter(g => g.id !== id));

  const sendMessage = async () => {
    if ((!newMessage.trim() && pendingFiles.length === 0 && pendingGallery.length === 0) || !selected || !user) return;
    setSending(true);
    const content = newMessage.trim();
    try {
      const attachments = [] as { url: string; name: string; type: string }[];
      for (const file of pendingFiles) {
        const url = await uploadFile(file, 'chat');
        attachments.push({ url, name: file.name, type: file.type });
      }
      for (const img of pendingGallery) {
        attachments.push({ url: img.url, name: 'galerie.jpg', type: 'image/jpeg' });
      }
      const total = pendingFiles.length + pendingGallery.length;
      const lastLabel = attachments.length
        ? (attachments.length === 1 ? 'Image jointe' : `${total} fichiers joints`)
        : content;
      const msg: any = {
        id: Date.now().toString(),
        conversation_id: selected.id,
        sender_id: user.uid,
        sender_role: 'client',
        sender_name: coupleName,
        content,
        created_at: new Date().toISOString(),
      };
      if (attachments.length) msg.attachments = attachments;
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
      setPendingGallery([]);
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

  const shortDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return formatTime(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
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
    <div className="-m-5 sm:-m-6 lg:-m-8 h-[calc(100dvh-3.5rem)] lg:h-[100dvh] flex bg-white overflow-hidden lg:border-l lg:border-stone-200">
        {/* Liste des conversations */}
        <div className={`border-r border-stone-200 flex flex-col flex-shrink-0 bg-white ${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-[21rem] lg:w-[23rem]`}>
          <div className="px-5 pt-6 pb-4 flex-shrink-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-rose-600">Espace client</p>
            <h1 className="font-serif text-charcoal-900 mt-1.5" style={{ fontSize: '1.7rem', fontWeight: 400, letterSpacing: '-0.01em' }}>Messages</h1>
            <div className="relative mt-4">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une conversation"
                className="w-full pl-6 pr-2 py-2 bg-transparent border-b border-stone-300 text-sm text-charcoal-800 placeholder:text-charcoal-300 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto subtle-scroll">
            {loading ? (
              <div className="px-5 space-y-5 pt-2">
                {[1,2,3].map(i => <div key={i} className="h-12 bg-stone-200/60 animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-serif italic text-charcoal-500 text-lg">Aucune conversation</p>
                <p className="text-xs text-charcoal-400 mt-2 leading-relaxed">Contactez un prestataire depuis la page Prestataires.</p>
              </div>
            ) : (
              filtered.map(conv => {
                const active = selected?.id === conv.id;
                const unread = conv.unread_count_client ?? 0;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`group w-full text-left px-5 py-4 border-t border-stone-200/70 transition-colors relative ${active ? 'bg-[#F7F1EA]' : 'hover:bg-[#FBF8F4]'}`}
                  >
                    {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-600" />}
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full flex-shrink-0 overflow-hidden bg-stone-200">
                        {conv.type === 'vendor' && conv.vendor_id && vendorPhotos[conv.vendor_id] ? (
                          <img src={vendorPhotos[conv.vendor_id]} alt={convLabel(conv)} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-serif text-lg text-charcoal-700">{convInitial(conv)}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`truncate text-[15px] ${unread ? 'font-semibold text-charcoal-900' : 'font-medium text-charcoal-800'}`}>{convLabel(conv)}</p>
                          <span className="text-[10.5px] text-charcoal-400 flex-shrink-0 tabular-nums">{shortDate(conv.last_message_at)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className={`text-[13px] truncate ${unread ? 'text-charcoal-700' : 'text-charcoal-400'}`}>
                            {conv.last_message || 'Nouvelle conversation'}
                          </p>
                          {unread > 0 && (
                            <span className="min-w-[1.15rem] h-[1.15rem] px-1 bg-rose-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center flex-shrink-0">{unread}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-w-0 bg-white ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 chat-canvas">
              <p className="font-serif italic text-charcoal-500 text-2xl" style={{ fontWeight: 400 }}>Choisissez une conversation</p>
              <p className="text-sm text-charcoal-400 mt-2">Vos échanges avec votre planner et vos prestataires.</p>
            </div>
          ) : (
            <>
              <div className="px-4 sm:px-7 h-[4.5rem] border-b border-stone-200 flex items-center gap-3.5 flex-shrink-0 bg-white">
                <button onClick={() => setShowMobileChat(false)} className="md:hidden -ml-1 p-2 text-charcoal-500 hover:text-charcoal-900 flex-shrink-0" aria-label="Retour">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-stone-200">
                  {selected.type === 'vendor' && selected.vendor_id && vendorPhotos[selected.vendor_id] ? (
                    <img src={vendorPhotos[selected.vendor_id]} alt={convLabel(selected)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-serif text-base text-charcoal-700">{convInitial(selected)}</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-charcoal-900 text-lg leading-tight truncate" style={{ fontWeight: 500 }}>{convLabel(selected)}</p>
                  <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-charcoal-400 mt-0.5">{selected.type === 'vendor' ? 'Prestataire' : 'Votre wedding planner'}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto subtle-scroll px-4 sm:px-8 lg:px-12 py-6 space-y-2 chat-canvas">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="font-serif italic text-charcoal-400 text-xl">Dites bonjour…</p>
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
                          <div className="flex items-center gap-4 my-6">
                            <span className="flex-1 h-px bg-stone-200" />
                            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">{formatDayLabel(msg.created_at)}</span>
                            <span className="flex-1 h-px bg-stone-200" />
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mb-0.5 bg-stone-200">
                              {otherPhoto ? (
                                <img src={otherPhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Store className="w-3.5 h-3.5 text-charcoal-500" />
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[85%] sm:max-w-md lg:max-w-lg px-4 py-2.5 text-[14.5px] leading-relaxed ${
                            isMe ? 'bg-charcoal-900 text-white rounded-[14px] rounded-br-[3px]' : 'bg-white text-charcoal-900 border border-stone-200 shadow-[0_1px_1px_rgba(60,40,30,0.04)] rounded-[14px] rounded-bl-[3px]'
                          }`}>
                            {!isMe && msg.sender_name && (
                              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-1 text-rose-600">{msg.sender_name}</p>
                            )}
                            {msg.type === 'document' && msg.file_url && (
                              <button
                                type="button"
                                onClick={() => setFilePreview({ url: msg.file_url!, name: msg.content.split('\n')[0].replace(/^📄 /, ''), type: 'application/pdf' })}
                                className={`flex items-center gap-2 w-full text-left p-2.5 rounded-xl mb-2 ${isMe ? 'bg-white/20 text-white' : 'bg-white border border-charcoal-200 text-charcoal-700'}`}
                              >
                                <FileText className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{msg.content.split('\n')[0].replace(/^📄 /, '')}</span>
                              </button>
                            )}
                            {msg.content && msg.type !== 'document' && <p className="whitespace-pre-wrap break-words"><LinkifyText text={msg.content} /></p>}
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
                              <p className={`text-[10.5px] mt-1 tabular-nums ${isMe ? 'text-white/50 text-right' : 'text-charcoal-400'}`}>
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

              <div className="px-3 sm:px-7 py-3 border-t border-stone-200 flex-shrink-0 space-y-2 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {(pendingFiles.length > 0 || pendingGallery.length > 0) && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {pendingFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ivory-50 border border-charcoal-200 rounded-lg text-xs text-charcoal-700">
                        {file.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button type="button" onClick={() => removePendingFile(i)} className="text-charcoal-400 hover:text-rose-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                    {pendingGallery.map((img) => (
                      <div key={img.id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-ivory-50 border border-charcoal-200 rounded-lg text-xs text-charcoal-700">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="max-w-[80px] truncate">Galerie</span>
                        <button type="button" onClick={() => removePendingGallery(img.id)} className="text-charcoal-400 hover:text-rose-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="file" id="client-chat-image" className="hidden" multiple accept="image/*" onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                  <input type="file" id="client-chat-pdf" className="hidden" multiple accept="application/pdf" onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                  <input type="file" id="client-chat-camera" className="hidden" accept="image/*" capture onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!selected || sending}
                      onClick={() => setShowAttachMenu(v => !v)}
                      className="p-2 text-charcoal-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    {showAttachMenu && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-charcoal-200 rounded-xl shadow-lg z-10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => { document.getElementById('client-chat-image')?.click(); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Images
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowGalleryPicker(true); setShowAttachMenu(false); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Depuis ma galerie
                        </button>
                        <button
                          type="button"
                          onClick={() => { document.getElementById('client-chat-pdf')?.click(); }}
                          className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" /> PDFs
                        </button>
                        {isMobile && (
                          <button
                            type="button"
                            onClick={() => { document.getElementById('client-chat-camera')?.click(); }}
                            className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" /> Prendre une photo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
                    placeholder="Écrivez votre message…"
                    className="flex-1 min-w-0 h-11 px-4 bg-[#F7F3EE] border border-stone-200 rounded-sm text-[15px] text-charcoal-900 placeholder:text-charcoal-400 focus:outline-none focus:border-rose-500 focus:bg-white transition-colors"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={(!newMessage.trim() && pendingFiles.length === 0 && pendingGallery.length === 0) || sending}
                    className="w-11 h-11 flex items-center justify-center bg-charcoal-900 text-white hover:bg-rose-600 disabled:opacity-30 disabled:hover:bg-charcoal-900 transition-colors rounded-sm flex-shrink-0"
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

              {/* Gallery picker */}
              {showGalleryPicker && (
                <div className="fixed inset-0 z-50 bg-charcoal-900/80 flex items-center justify-center p-4" onClick={() => setShowGalleryPicker(false)}>
                  <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-4 border-b border-charcoal-100">
                      <h3 className="font-medium text-charcoal-900">Envoyer depuis ma galerie</h3>
                      <button onClick={() => setShowGalleryPicker(false)} className="p-1 text-charcoal-400 hover:text-charcoal-600"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                      {clientGallery.length === 0 ? (
                        <p className="text-center text-sm text-charcoal-500 py-10">Aucune photo dans votre galerie.</p>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                          {clientGallery.map(img => (
                            <button
                              key={img.id}
                              onClick={() => { setPendingGallery(prev => prev.some(g => g.id === img.id) ? prev : [...prev, img]); setShowGalleryPicker(false); }}
                              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                                pendingGallery.some(g => g.id === img.id) ? 'border-rose-600 opacity-60' : 'border-transparent hover:border-rose-300'
                              }`}
                            >
                              <img src={img.url} alt="" className="w-full h-full object-cover" />
                              {pendingGallery.some(g => g.id === img.id) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-rose-600/20">
                                  <Check className="w-6 h-6 text-rose-600" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-charcoal-100 flex justify-end">
                      <button onClick={() => setShowGalleryPicker(false)} className="px-4 py-2 text-sm font-medium text-charcoal-600 hover:text-charcoal-900">
                        Fermer
                      </button>
                    </div>
                  </div>
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
  );
}
