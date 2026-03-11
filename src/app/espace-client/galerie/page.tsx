'use client';

import { useEffect, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getClientGallery } from '@/lib/client-helpers';
import { addDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { Upload, X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface GalleryItem { id: string; url: string; caption?: string; uploaded_at?: string; }

const ALBUMS = [
  {
    id: 'inspiration',
    label: 'Sources d\u2019inspiration',
    desc: 'Vos références et coups de cœur',
    cover: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    uploadable: false,
  },
  {
    id: 'deco',
    label: 'Idées décoration',
    desc: 'Tables, arches, luminaires, ambiance',
    cover: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    uploadable: false,
  },
  {
    id: 'mariage',
    label: 'Photos du mariage',
    desc: 'Votre journée immortalisée',
    cover: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    uploadable: false,
  },
  {
    id: 'maries',
    label: 'Photos des mariés',
    desc: 'Portraits et moments complices',
    cover: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    uploadable: false,
  },
  {
    id: 'ceremonie',
    label: 'Photos de cérémonie',
    desc: 'Échange des vœux et moments officiels',
    cover: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [
      'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1730877/pexels-photo-1730877.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800',
      'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800',
    ],
    uploadable: false,
  },
  {
    id: 'ma-galerie',
    label: 'Ma galerie',
    desc: 'Vos photos personnelles',
    cover: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600',
    images: [] as string[],
    uploadable: true,
  },
] as const;

type AlbumId = typeof ALBUMS[number]['id'];

export default function GaleriePage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [myGallery, setMyGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<AlbumId | null>(null);
  const [preview, setPreview] = useState<{ urls: string[]; idx: number } | null>(null);

  const fetchGallery = async () => {
    if (!event?.id) { setLoading(false); return; }
    const items = await getClientGallery(event.id).catch(() => []);
    setMyGallery(items as GalleryItem[]);
    setLoading(false);
  };

  useEffect(() => { if (!dataLoading) fetchGallery(); }, [event?.id, dataLoading]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !event?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, 'gallery');
        await addDocument('galleries', {
          event_id: event.id, client_id: client?.id || null,
          url, uploaded_at: new Date().toISOString(), uploaded_by: 'client',
        });
      }
      toast.success('Photos ajoutées');
      await fetchGallery();
    } catch { toast.error("Erreur lors de l'upload"); }
    finally { setUploading(false); }
  };

  const getAlbumImages = (id: AlbumId): string[] => {
    if (id === 'ma-galerie') return myGallery.map(g => g.url);
    return ALBUMS.find(a => a.id === id)?.images as string[] || [];
  };

  const openImage = (urls: string[], idx: number) => setPreview({ urls, idx });

  if (dataLoading || loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-48 bg-charcoal-100" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[1,2,3,4,5].map(i => <div key={i} className="h-40 bg-charcoal-100" />)}
      </div>
    </div>
  );

  /* ── ALBUM DETAIL VIEW ── */
  if (activeAlbum) {
    const album = ALBUMS.find(a => a.id === activeAlbum)!;
    const imgs = getAlbumImages(activeAlbum);
    return (
      <div className="space-y-5">
        {/* Album detail header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveAlbum(null)} className="flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-900 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Albums
            </button>
            <span className="text-charcoal-300">/</span>
            <div>
              <p className="text-xs text-charcoal-400 uppercase tracking-wider">Galerie</p>
              <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>{album.label}</h1>
            </div>
          </div>
          {album.uploadable && (
            <label className={`cursor-pointer flex items-center gap-2 px-3 py-2 bg-charcoal-900 text-white text-sm font-medium rounded-xl ${uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-charcoal-700'} transition-colors`}>
              {uploading ? <div className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Upload…' : 'Ajouter des photos'}
              <input type="file" multiple accept="image/*" className="hidden" onChange={e => handleUpload(e.target.files)} />
            </label>
          )}
        </div>

        <p className="text-sm text-charcoal-500">{album.desc}</p>

        <div>
          {imgs.length === 0 ? (
            <div className="border border-dashed border-charcoal-200 py-20 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-charcoal-200" />
              <p className="font-serif text-charcoal-400 text-base font-light">Aucune photo dans cet album</p>
              {album.uploadable && <p className="text-charcoal-400 text-xs mt-1 font-light">Ajoutez vos premières photos ci-dessus</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-px bg-charcoal-100">
              {imgs.map((url, i) => (
                <div key={i} className="group relative bg-charcoal-50 overflow-hidden cursor-pointer" style={{ aspectRatio: i % 5 === 0 ? '1/1.3' : '1' }} onClick={() => openImage(imgs, i)}>
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-charcoal-900/0 group-hover:bg-charcoal-900/25 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div />{/* Lightbox */}
        {preview && (
          <div className="fixed inset-0 z-50 bg-charcoal-900/95 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            <button className="absolute top-4 right-4 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" onClick={() => setPreview(null)}>
              <X className="w-5 h-5 text-white" />
            </button>
            {preview.idx > 0 && (
              <button className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" onClick={e => { e.stopPropagation(); setPreview(p => p ? { ...p, idx: p.idx - 1 } : p); }}>
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            {preview.idx < preview.urls.length - 1 && (
              <button className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" onClick={e => { e.stopPropagation(); setPreview(p => p ? { ...p, idx: p.idx + 1 } : p); }}>
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}
            <img src={preview.urls[preview.idx]} alt="" className="max-w-full max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 label-xs text-white/50 tracking-[0.1em]">
              {preview.idx + 1} / {preview.urls.length}
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ── ALBUMS GRID ── */
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Ma galerie</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">{ALBUMS.length} albums</p>
      </div>

      {/* Albums grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALBUMS.map((album) => {
          const count = album.id === 'ma-galerie' ? myGallery.length : album.images.length;
          return (
            <div
              key={album.id}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-all duration-200"
              style={{ aspectRatio: '4/3' }}
              onClick={() => setActiveAlbum(album.id as AlbumId)}
            >
              <img src={album.cover} alt={album.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/75 via-charcoal-900/10 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end px-5 pb-5">
                <h3 className="font-serif text-white text-lg font-light leading-tight" style={{ letterSpacing: '-0.01em' }}>
                  {album.label}
                </h3>
                <p className="text-xs text-white/60 mt-1">{count} photo{count !== 1 ? 's' : ''}</p>
              </div>
              {album.uploadable && (
                <div className="absolute top-3 right-3">
                  <span className="text-[0.65rem] font-semibold bg-champagne-500 text-white px-2 py-0.5 rounded-full">Mes photos</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
