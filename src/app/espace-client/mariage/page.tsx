'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, updateDocument } from '@/lib/db';
import { getClientVendors, getClientPayments, getClientGallery } from '@/lib/client-helpers';
import { toast } from 'sonner';
import { Calendar, MapPin, Pencil, Users, Euro, ChevronRight, X } from 'lucide-react';

/* Circular SVG progress ring */
function RingProgress({ value, max, label, sub, color = '#A34E30' }: { value: number; max: number; label: string; sub: string; color?: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#E8E4DF" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-charcoal-900 leading-tight">{label}</p>
        <p className="text-[0.65rem] text-charcoal-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}


export default function MariagePage() {
  const { client, event, loading: dataLoading, refresh } = useClientData();
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, confirmed: 0 });
  const [guestStats, setGuestStats] = useState({ total: 0, confirmed: 0, placed: 0 });
  const [teamVendors, setTeamVendors] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [showInfoEdit, setShowInfoEdit] = useState(false);
  const [showThemeEdit, setShowThemeEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [infoForm, setInfoForm] = useState({ event_date: '', ceremony_time: '', venue: '', reception_venue: '', guest_count: '', budget: '' });
  const [themeForm, setThemeForm] = useState({ theme_style: '', theme_colors: '' });

  useEffect(() => {
    if (dataLoading || (!event?.id && !client?.id)) return;
    const id = event?.id || client?.id;
    const field = event?.id ? 'event_id' : 'client_id';
    getDocuments('tasks', [{ field, operator: '==', value: id }])
      .then(items => {
        const all = items as any[];
        const milestones = all.filter(t => t.kind === 'milestone');
        setTaskStats({ total: milestones.length, done: milestones.filter(t => t.client_confirmed).length, confirmed: milestones.filter(t => t.admin_confirmed).length });
      }).catch(() => {});
    getDocuments('guests', [{ field, operator: '==', value: id }])
      .then(items => {
        const all = items as any[];
        setGuestStats({ total: all.length, confirmed: all.filter(g => g.rsvp === 'confirmed').length, placed: all.filter(g => g.table).length });
      }).catch(() => {});
    if (client?.id) {
      getClientVendors(client.id, event?.id).then(vs => setTeamVendors(vs)).catch(() => {});
      getClientPayments(client.id)
        .then(ps => setTotalPaid(ps.filter(p => p.status === 'paid' || p.status === 'completed').reduce((s, p) => s + Number(p.amount || 0), 0)))
        .catch(() => {});
    }
    if (event?.id) {
      getClientGallery(event.id).then(imgs => setGalleryImages(imgs.map(g => g.url))).catch(() => {});
    }
  }, [dataLoading, event?.id, client?.id]);

  const eventDate = event?.event_date || (client as any)?.event_date || '';
  const venue = event?.venue || (client as any)?.venue || '';
  const receptionVenue = event?.reception_venue || (client as any)?.reception_venue || '';
  const guestCount = event?.guest_count || (client as any)?.guest_count || 0;
  const budget = event?.budget || (client as any)?.budget || 0;
  const themeStyle = event?.theme_style || (client as any)?.theme_style || '';
  const themeColors: string[] = event?.theme_colors || (client as any)?.theme_colors || [];
  const moodboardImages: string[] = event?.moodboard_images || (client as any)?.moodboard_images || [];
  const notes = event?.notes || '';
  const ceremonyTime = event?.ceremony_time || '';
  const daysLeft = eventDate
    ? Math.max(0, Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000))
    : null;
  const displayImages = moodboardImages.length > 0 ? moodboardImages : galleryImages;

  const coupleName = client
    ? `${client.name || ''}${client.name && client.partner ? ' & ' : ''}${client.partner || ''}`.trim() || 'Votre mariage'
    : 'Votre mariage';

  const openInfoEdit = () => {
    setInfoForm({
      event_date: eventDate,
      ceremony_time: ceremonyTime,
      venue,
      reception_venue: receptionVenue,
      guest_count: guestCount > 0 ? String(guestCount) : '',
      budget: budget > 0 ? String(budget) : '',
    });
    setShowInfoEdit(true);
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const data: any = {
        event_date: infoForm.event_date || null,
        ceremony_time: infoForm.ceremony_time || null,
        venue: infoForm.venue || null,
        reception_venue: infoForm.reception_venue || null,
        guest_count: Number(infoForm.guest_count) || 0,
        budget: Number(infoForm.budget) || 0,
      };
      if (event?.id) {
        await updateDocument('events', event.id, data);
      } else if (client?.id) {
        await updateDocument('clients', client.id, data);
      }
      await refresh();
      toast.success('Informations enregistrées');
      setShowInfoEdit(false);
    } catch { toast.error('Erreur lors de l\'enregistrement'); }
    finally { setSaving(false); }
  };

  const openThemeEdit = () => {
    setThemeForm({ theme_style: themeStyle, theme_colors: themeColors.join(', ') });
    setShowThemeEdit(true);
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    try {
      const colors = themeForm.theme_colors.split(',').map((c: string) => c.trim()).filter(Boolean);
      const data = { theme_style: themeForm.theme_style, theme_colors: colors };
      if (event?.id) {
        await updateDocument('events', event.id, data);
      } else if (client?.id) {
        await updateDocument('clients', client.id, data);
      }
      await refresh();
      toast.success('Thème enregistré');
      setShowThemeEdit(false);
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  if (dataLoading) return (
    <div className="space-y-4 animate-pulse max-w-4xl mx-auto">
      <div className="h-40 bg-charcoal-100 rounded-2xl" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-charcoal-100 rounded-2xl" />)}</div>
      <div className="h-64 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── COUPLE HERO CARD ── */}
      <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-0">
          {/* Left: cover photo */}
          <div className="relative sm:w-40 h-36 sm:h-auto flex-shrink-0 overflow-hidden">
            {client?.photo ? (
              <img src={client.photo} alt={coupleName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-champagne-200 via-rose-100 to-champagne-300 flex items-center justify-center">
                <span className="font-serif text-4xl text-charcoal-400 font-light opacity-60">
                  {coupleName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
            {/* Countdown badge */}
            {daysLeft !== null && (
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <p className="text-white text-xs font-semibold">Heureux en mariage</p>
                <p className="text-white font-bold text-sm">
                  {daysLeft} <span className="font-normal text-xs">jours</span>
                </p>
              </div>
            )}
          </div>

          {/* Right: info */}
          <div className="flex-1 px-5 sm:px-6 py-5">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)', fontWeight: 400 }}>
                Bienvenue {coupleName}
              </h1>
              <button onClick={openInfoEdit} className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 text-xs font-medium transition-colors flex-shrink-0">
                <Pencil className="w-3 h-3" /> Modifier
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-charcoal-500 mb-4 flex-wrap">
              {eventDate ? (
                <span>{new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              ) : (
                <button onClick={openInfoEdit} className="text-rose-500 hover:underline text-xs italic">Ajouter la date du mariage →</button>
              )}
              {venue && (
                <>
                  <span className="text-charcoal-300">,</span>
                  <span className="text-rose-600">{venue}</span>
                </>
              )}
            </div>

            {/* Circular stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
              <RingProgress value={teamVendors.length} max={Math.max(teamVendors.length, 10)} label="Services réservés" sub={`${teamVendors.length} prestataire${teamVendors.length !== 1 ? 's' : ''}`} color="#A34E30" />
              <RingProgress value={taskStats.done} max={Math.max(taskStats.total, 1)} label="Tâches réalisées" sub={`${taskStats.done} sur ${taskStats.total}`} color="#A34E30" />
              <RingProgress value={guestStats.confirmed} max={Math.max(guestStats.total, 1)} label="Invités confirmés" sub={`${guestStats.confirmed} sur ${guestStats.total}`} color="#A68540" />
              <RingProgress value={guestStats.placed} max={Math.max(guestStats.total, 1)} label="Invités placés" sub={`${guestStats.placed} sur ${guestStats.total}`} color="#A68540" />
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── MONTEZ VOTRE ÉQUIPE PRO — large card spanning 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 text-white text-[0.65rem] font-bold px-2 py-0.5 rounded">Étape suivante</span>
              <h2 className="font-semibold text-charcoal-900 text-sm">Montez votre équipe pro</h2>
            </div>
            <select className="border border-charcoal-200 rounded-lg px-3 py-1.5 text-xs text-charcoal-700 bg-white outline-none">
              <option>Photo</option>
              <option>DJ</option>
              <option>Traiteur</option>
              <option>Fleuriste</option>
            </select>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-charcoal-500 mb-4">Vos prestataires réservés. Contactez-les ou ajoutez-en de nouveaux.</p>
            {teamVendors.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-10 h-10 text-charcoal-200 mx-auto mb-2" />
                <p className="text-sm text-charcoal-400">Aucun prestataire réservé pour l’instant</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {teamVendors.slice(0, 3).map(v => {
                  const initials = v.name?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <div key={v.id} className="group block rounded-xl border border-charcoal-100 overflow-hidden hover:border-rose-200 transition-all">
                      <div className="relative h-28 bg-stone-100">
                        {v.photo ? (
                          <img src={v.photo} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-champagne-100 to-rose-100 flex items-center justify-center">
                            <span className="font-serif text-3xl text-charcoal-400 font-light">{initials}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <span className={`absolute top-2 left-2 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${ v.status === 'confirmed' ? 'bg-green-600' : 'bg-champagne-600'}`}>
                          {v.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-charcoal-900 truncate">{v.name}</p>
                        <p className="text-[0.65rem] text-charcoal-400">{v.category}</p>
                        {v.email && <p className="text-[0.6rem] text-charcoal-400 truncate mt-0.5">{v.email}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/espace-client/prestataires" className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Découvrir les photographes
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* Invités widget */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-charcoal-900 text-sm">Mes invités</h3>
                <p className="text-xs text-charcoal-500">Organisez vos invités.</p>
              </div>
            </div>
            <div className="flex justify-center py-4">
              <Users className="w-12 h-12 text-charcoal-200" />
            </div>
            <Link href="/espace-client/invites" className="w-full flex items-center justify-center py-2.5 border-2 border-rose-500 text-rose-600 hover:bg-rose-50 text-sm font-semibold rounded-xl transition-colors">
              Ajouter un invité
            </Link>
          </div>

          {/* Budget widget */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
            <div className="mb-3">
              <h3 className="font-semibold text-charcoal-900 text-sm">Mon budget</h3>
              <p className="text-xs text-rose-600">Contrôlez vos dépenses</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center p-3 bg-ivory-50 rounded-xl">
                <p className="text-[0.6rem] font-bold text-charcoal-500 uppercase tracking-wide mb-1">Budget prévu</p>
                <p className="font-bold text-charcoal-900 text-base">{budget.toLocaleString('fr-FR')} €</p>
              </div>
              <div className="text-center p-3 bg-ivory-50 rounded-xl">
                <p className="text-[0.6rem] font-bold text-charcoal-500 uppercase tracking-wide mb-1">Déjà payé</p>
                <p className="font-bold text-rose-700 text-base">{totalPaid.toLocaleString('fr-FR')} €</p>
              </div>
            </div>
            <Link href="/espace-client/paiements" className="w-full flex items-center justify-center py-2.5 border-2 border-rose-500 text-rose-600 hover:bg-rose-50 text-sm font-semibold rounded-xl transition-colors">
              Ajouter une dépense
            </Link>
          </div>
        </div>
      </div>

      {/* ── LIEU DE MARIAGE ── */}
      {venue && (
        <div id="lieu" className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-charcoal-100">
            <h2 className="font-semibold text-charcoal-900 text-sm">Votre lieu de mariage</h2>
            <p className="text-xs text-rose-600 mt-0.5">Félicitations pour ce choix !</p>
          </div>
          <div className="flex items-center gap-4 p-5">
            <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
              <img src="https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=400" alt={venue} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-charcoal-900 text-sm">{venue}</p>
              {receptionVenue && <p className="text-xs text-charcoal-500 mt-0.5">{receptionVenue}</p>}
              <Link href="/espace-client/prestataires" className="text-xs text-rose-600 hover:underline mt-1 block">Contacter l'établissement →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── INFORMATIONS + THÈME ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-charcoal-100 shadow-soft">
          <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
            <h2 className="font-semibold text-charcoal-900 text-sm">Informations générales</h2>
            <button onClick={openInfoEdit} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 transition-colors">
              <Pencil className="w-3 h-3" /> Modifier
            </button>
          </div>
          <div className="divide-y divide-charcoal-100">
            {[
              { icon: Calendar, label: 'Date du mariage',       value: eventDate ? new Date(eventDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { icon: Calendar, label: 'Heure de la cérémonie', value: ceremonyTime || '—' },
              { icon: MapPin,   label: 'Lieu de la cérémonie',  value: venue || '—' },
              { icon: MapPin,   label: 'Lieu de la réception',  value: receptionVenue || '—' },
              { icon: Users,    label: "Nombre d'invités",       value: guestCount > 0 ? `${guestCount} personnes` : '—' },
              { icon: Euro,     label: 'Budget total',           value: budget > 0 ? `${budget.toLocaleString('fr-FR')} €` : '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-4 px-5 py-3.5">
                <item.icon className="w-3.5 h-3.5 text-charcoal-300 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[0.7rem] text-charcoal-400 tracking-wide uppercase mb-0.5">{item.label}</p>
                  <p className="text-charcoal-900 text-sm">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Theme */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft">
            <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-semibold text-charcoal-900 text-sm">Thème & style</h2>
              <button onClick={openThemeEdit} className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 transition-colors">
                <Pencil className="w-3 h-3" /> Modifier
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {themeStyle ? (
                <div>
                  <p className="text-[0.7rem] text-charcoal-400 uppercase tracking-wide mb-1">Style</p>
                  <p className="text-charcoal-900 text-sm">{themeStyle}</p>
                </div>
              ) : <p className="text-xs text-charcoal-400 italic">Style non défini.</p>}
              {themeColors.length > 0 && (
                <div>
                  <p className="text-[0.7rem] text-charcoal-400 uppercase tracking-wide mb-2">Palette</p>
                  <div className="flex gap-2 flex-wrap">
                    {themeColors.map((c, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border border-charcoal-100 shadow-sm" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inspiration images */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h2 className="font-semibold text-charcoal-900 text-sm">Moodboard</h2>
              <Link href="/espace-client/galerie" className="text-xs text-rose-600 hover:underline flex items-center gap-1">Galerie <ChevronRight className="w-3 h-3" /></Link>
            </div>
            {displayImages.length > 0 ? (
              <div className="grid grid-cols-3 gap-px">
                {displayImages.slice(0, 6).map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full h-20 object-cover hover:opacity-80 transition-opacity cursor-pointer" onClick={() => window.open(url, '_blank')} />
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-xs text-charcoal-400 mb-3 italic">Aucune photo dans votre galerie</p>
                <Link href="/espace-client/galerie" className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline">
                  Ajouter des photos →
                </Link>
              </div>
            )}
          </div>

          {notes && (
            <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft">
              <div className="px-5 py-4 border-b border-charcoal-100">
                <h2 className="font-semibold text-charcoal-900 text-sm">Notes</h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-charcoal-600 text-sm leading-relaxed">{notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALES D'ÉDITION ── */}
      {showInfoEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowInfoEdit(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h3 className="font-semibold text-charcoal-900 text-sm">Informations générales</h3>
              <button onClick={() => setShowInfoEdit(false)} className="p-1 hover:bg-charcoal-50 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Date du mariage</label>
                <input type="date" value={infoForm.event_date} onChange={e => setInfoForm(f => ({ ...f, event_date: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Heure de la cérémonie</label>
                <input type="time" value={infoForm.ceremony_time} onChange={e => setInfoForm(f => ({ ...f, ceremony_time: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Lieu de la cérémonie</label>
                <input type="text" value={infoForm.venue} onChange={e => setInfoForm(f => ({ ...f, venue: e.target.value }))} placeholder="Nom du lieu" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Lieu de la réception</label>
                <input type="text" value={infoForm.reception_venue} onChange={e => setInfoForm(f => ({ ...f, reception_venue: e.target.value }))} placeholder="Si différent du lieu de cérémonie" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Nombre d'invités</label>
                  <input type="number" min="0" value={infoForm.guest_count} onChange={e => setInfoForm(f => ({ ...f, guest_count: e.target.value }))} placeholder="100" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Budget total (€)</label>
                  <input type="number" min="0" value={infoForm.budget} onChange={e => setInfoForm(f => ({ ...f, budget: e.target.value }))} placeholder="15000" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex justify-end gap-3">
              <button onClick={() => setShowInfoEdit(false)} className="px-4 py-2 text-sm text-charcoal-600 hover:bg-charcoal-50 rounded-xl transition-colors">Annuler</button>
              <button onClick={handleSaveInfo} disabled={saving} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showThemeEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowThemeEdit(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h3 className="font-semibold text-charcoal-900 text-sm">Thème & style</h3>
              <button onClick={() => setShowThemeEdit(false)} className="p-1 hover:bg-charcoal-50 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Style du mariage</label>
                <input type="text" value={themeForm.theme_style} onChange={e => setThemeForm(f => ({ ...f, theme_style: e.target.value }))} placeholder="Ex: Bohème, Champêtre, Moderne, Romantique..." className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Palette de couleurs</label>
                <input type="text" value={themeForm.theme_colors} onChange={e => setThemeForm(f => ({ ...f, theme_colors: e.target.value }))} placeholder="#F5E6D3, #A68540, #BE6040" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                <p className="text-[0.65rem] text-charcoal-400 mt-1">Codes hexadécimaux séparés par des virgules</p>
                {themeForm.theme_colors && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {themeForm.theme_colors.split(',').map((c: string) => c.trim()).filter(Boolean).map((c: string, i: number) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex justify-end gap-3">
              <button onClick={() => setShowThemeEdit(false)} className="px-4 py-2 text-sm text-charcoal-600 hover:bg-charcoal-50 rounded-xl transition-colors">Annuler</button>
              <button onClick={handleSaveTheme} disabled={saving} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
