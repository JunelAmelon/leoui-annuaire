'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import LinkifyText from '@/components/LinkifyText';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import {
  MessageSquare, Search, Send, Paperclip, X, Loader2, Clock, CheckCircle2, Heart, ChevronLeft, ChevronRight, FileText, Image as ImageIcon,
} from 'lucide-react';
import { getDocument, getDocuments, addDocument, updateDocument } from '@/lib/db';
import { createNotification, resolveClientRecipientId } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { renderClientMessageEmail } from '@/lib/email-template';
import { uploadFile } from '@/lib/storage';
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
  attachments?: Array<{ url: string; name?: string; type?: string }>;
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
  const [imageGallery, setImageGallery] = useState<{ attachments: { url: string; name?: string; type?: string }[]; index: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string>>({});
  const [vendorPhoto, setVendorPhoto] = useState('');

  const openConversation = (conv: Conversation, mobile = true) => {
    setSelected(conv);
    if (mobile) setShowMobileChat(true);
    const unread = ((conv as any).unread_count_vendor ?? (conv as any).unread_vendor) || 0;
    if (unread > 0) {
      updateDocument('conversations', conv.id, { unread_count_vendor: 0 });
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count_vendor: 0 } : c));
    }
  };

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
        if (sorted.length > 0 && !selected) openConversation(sorted[0], false);
        const photos: Record<string, string> = {};
        await Promise.all(sorted.map(async c => {
          if (!c.client_id) return;
          try {
            const cl = await getDocument('clients', c.client_id);
            if (cl) photos[c.client_id] = (cl as any).photoURL || (cl as any).photo || '';
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

  useEffect(() => {
    if (!selected?.client_id) return;
    if (clientPhotos[selected.client_id]) return;
    getDocument('clients', selected.client_id)
      .then((cl: any) => {
        const url = (cl as any)?.photoURL || (cl as any)?.photo || '';
        if (url) setClientPhotos((p) => ({ ...p, [selected.client_id!]: url }));
      })
      .catch(() => {});
  }, [selected?.client_id, clientPhotos]);

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
    if ((!newMsg.trim() && pendingFiles.length === 0) || !selected || !user) return;
    setSending(true);
    const content = newMsg.trim();
    try {
      const attachments = [];
      for (const file of pendingFiles) {
        const url = await uploadFile(file, 'chat');
        attachments.push({ url, name: file.name, type: file.type });
      }
      const lastLabel = attachments.length
        ? (attachments.length === 1 ? `Fichier : ${attachments[0].name}` : `${attachments.length} fichiers joints`)
        : content;
      const msg: any = {
        conversation_id: selected.id,
        sender_id: user.uid,
        sender_role: 'vendor',
        sender_name: user.displayName || user.email,
        content,
        created_at: new Date().toISOString(),
      };
      if (attachments.length) msg.attachments = attachments;
      await addDocument('messages', msg);
      const currentUnread = ((selected as any).unread_count_client || 0) as number;
      await updateDocument('conversations', selected.id, {
        last_message: lastLabel,
        last_message_at: new Date().toISOString(),
        unread_count_client: currentUnread + 1,
      });
      if (selected.client_id) {
        resolveClientRecipientId(selected.client_id)
          .then((recipientId) => createNotification({
            recipientId,
            type: 'message',
            title: `Nouveau message de ${user.displayName || 'votre prestataire'}`,
            message: content.slice(0, 100),
            link: '/espace-client/messages',
          }))
          .catch(() => {});
        // Email au client
        const senderName = user.displayName || 'Votre prestataire';
        const clientEmail = selected.client_email;
        const sendClientEmail = (to: string) => sendEmail({
          to,
          subject: `Nouveau message de ${senderName}`,
          html: renderClientMessageEmail({ clientName: selected.client_name || '', senderName, message: content }),
        });
        if (clientEmail) {
          sendClientEmail(clientEmail);
        } else {
          getDocument('clients', selected.client_id)
            .then((c: any) => { if (c?.email) sendClientEmail(c.email); })
            .catch(() => {});
        }
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), ...msg } as Message]);
      setNewMsg('');
      setPendingFiles([]);
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
                    onClick={() => openConversation(conv)}
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
                          {(((conv.unread_count_vendor as any) ?? (conv as any).unread_vendor) ?? 0) > 0 && (
                            <span className="ml-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">
                              {((conv.unread_count_vendor as any) ?? (conv as any).unread_vendor) ?? 0}
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
                    <ChevronLeft className="w-4 h-4" />
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
                    messages.map((msg, idx) => {
                      const isVendor = msg.sender_role === 'vendor';
                      const clientInitial = (selected.client_name || 'C').charAt(0).toUpperCase();
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
                          <div className={`flex items-end gap-2 ${isVendor ? 'justify-end' : 'justify-start'}`}>
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
                              {msg.content && <p className="whitespace-pre-wrap break-words"><LinkifyText text={msg.content} /></p>}
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
                                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors ${isVendor ? 'text-white' : 'text-charcoal-700'}`}
                                            >
                                              <FileText className="w-4 h-4" />
                                              <span className="text-xs underline">{a.name || 'Document PDF'}</span>
                                            </button>
                                          ) : (
                                            <a href={a.url} target="_blank" rel="noreferrer" className={`underline text-xs ${isVendor ? 'text-rose-100' : 'text-rose-700'}`}>
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
                                <p className={`text-xs mt-1 ${isVendor ? 'text-rose-200' : 'text-charcoal-400'}`}>
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

                {/* Input */}
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
                    <input type="file" id="vendor-chat-image" className="hidden" multiple accept="image/*" onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                    <input type="file" id="vendor-chat-pdf" className="hidden" multiple accept="application/pdf" onChange={e => { handleFileSelect(e.target.files); e.target.value = ''; }} />
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!selected || sending}
                        onClick={() => setShowAttachMenu(v => !v)}
                        className="p-2 text-charcoal-400 hover:text-charcoal-600 hover:bg-charcoal-50 rounded-lg transition-colors disabled:opacity-40"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                      {showAttachMenu && (
                        <div className="absolute bottom-full left-0 mb-2 w-40 bg-white border border-charcoal-200 rounded-xl shadow-lg z-10 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => { document.getElementById('vendor-chat-image')?.click(); }}
                            className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                          >
                            <ImageIcon className="w-4 h-4" /> Images
                          </button>
                          <button
                            type="button"
                            onClick={() => { document.getElementById('vendor-chat-pdf')?.click(); }}
                            className="w-full text-left px-3 py-2.5 text-sm text-charcoal-700 hover:bg-charcoal-50 flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4" /> PDFs
                          </button>
                        </div>
                      )}
                    </div>
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
                      disabled={(!newMsg.trim() && pendingFiles.length === 0) || sending}
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

                {/* Lightbox / inline preview */}
                {filePreview && (
                  <div className="fixed inset-0 z-50 bg-charcoal-900/90 flex items-center justify-center p-4" onClick={() => setFilePreview(null)}>
                    <button className="absolute top-4 right-4 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => setFilePreview(null)}>
                      <X className="w-5 h-5 text-white" />
                    </button>
                    {filePreview.type.startsWith('image/') ? (
                      <img src={filePreview.url} alt={filePreview.name} className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
                    ) : (
                      <div className="w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <embed src={filePreview.url} type="application/pdf" className="w-full h-full" />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
