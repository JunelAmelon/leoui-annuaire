'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { Bell, Check, MessageSquare, FileText, Euro, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at?: any;
}

const typeConfig: Record<string, { icon: React.ElementType; cls: string }> = {
  message: { icon: MessageSquare, cls: 'text-rose-600 bg-rose-50' },
  document: { icon: FileText, cls: 'text-charcoal-600 bg-charcoal-50' },
  payment: { icon: Euro, cls: 'text-green-600 bg-green-50' },
  planning: { icon: Calendar, cls: 'text-champagne-700 bg-champagne-50' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { loading: dataLoading } = useClientData();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getDocuments('notifications', [{ field: 'recipient_id', operator: '==', value: user.uid }])
      .then((items) => {
        const sorted = (items as any[]).sort((a, b) => {
          const da = a?.created_at?.toDate?.()?.getTime?.() || 0;
          const db = b?.created_at?.toDate?.()?.getTime?.() || 0;
          return db - da;
        });
        setNotifications(sorted as Notification[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const markRead = async (id: string) => {
    try {
      await updateDocument('notifications', id, { read: true });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      toast.error('Erreur');
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => updateDocument('notifications', n.id, { read: true })));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('Toutes les notifications marquées comme lues');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (dataLoading || loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-charcoal-100 rounded-xl" />
      <div className="h-64 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Notifications{unreadCount > 0 && <span className="ml-2 text-sm font-sans font-semibold bg-rose-500 text-white px-2 py-0.5 rounded-full align-middle">{unreadCount}</span>}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 text-charcoal-600 text-sm font-medium rounded-xl hover:bg-stone-100 transition-colors shadow-sm">
            <Check className="w-4 h-4" />Tout marquer lu
          </button>
        )}
      </div>

      <div className="bg-white border border-charcoal-100 rounded-2xl shadow-soft overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-14">
            <Bell className="w-10 h-10 mx-auto mb-3 text-charcoal-200" />
            <p className="font-semibold text-charcoal-700">Aucune notification</p>
            <p className="text-sm text-charcoal-400 mt-1">Vous êtes à jour !</p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {notifications.map((notif) => {
              const cfg = typeConfig[notif.type] || { icon: Bell, cls: 'text-charcoal-500 bg-charcoal-50' };
              const Icon = cfg.icon;
              return (
                <div key={notif.id} className={`flex items-start gap-4 p-4 transition-colors ${
                  !notif.read ? 'bg-rose-50/60' : 'hover:bg-charcoal-50'
                }`}>
                  <div className={`mt-0.5 flex-shrink-0 p-2 rounded-xl ${cfg.cls}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-semibold text-sm ${!notif.read ? 'text-charcoal-900' : 'text-charcoal-600'}`}>{notif.title}</p>
                      {!notif.read && <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5">{notif.message}</p>
                    {notif.created_at && (
                      <p className="text-xs text-charcoal-400 mt-1">{notif.created_at?.toDate?.()?.toLocaleString('fr-FR') || ''}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {notif.link && (
                        <Link href={notif.link} className="text-xs font-medium text-rose-600 hover:text-rose-700">Voir &rarr;</Link>
                      )}
                      {!notif.read && (
                        <button onClick={() => markRead(notif.id)}
                          className="flex items-center gap-1 text-xs text-charcoal-500 hover:text-charcoal-700 transition-colors">
                          <Check className="w-3 h-3" />Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
