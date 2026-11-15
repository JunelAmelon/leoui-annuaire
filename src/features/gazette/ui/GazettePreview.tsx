'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Gazette,
  GazetteSection,
  GazetteTheme,
  GAZETTE_THEMES,
  WEDDING_COLOR_PALETTES,
  StorySectionContent,
  AnecdoteSectionContent,
  QuizSectionContent,
  ProgramSectionContent,
  CustomSectionContent,
} from '../domain/types';
import {
  Sparkles,
  Clock,
  MapPin,
  Heart,
  BookOpen,
  CheckCircle2,
  Columns,
  Palette,
  Camera,
  Edit3,
  RefreshCw,
  Trash2,
  Upload,
  Eye,
  Type,
  QrCode,
  Users,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

interface GazettePreviewProps {
  gazette: Gazette;
  onEditSection?: (section: GazetteSection) => void;
  onEditMetadata?: () => void;
  onThemeChange?: (theme: GazetteTheme) => void;
  onUpdateMetadataField?: (field: Partial<Gazette>) => Promise<void>;
  onUpdateSectionContent?: (sectionId: string, updatedFields: { title?: string; content?: any }) => Promise<void>;
  onAddQuickBlock?: (
    type:
      | 'trombinoscope'
      | 'crosswords'
      | 'truefalse'
      | 'dresscode'
      | 'interview'
      | 'horoscope'
      | 'annonces'
      | 'quiz'
  ) => Promise<void>;
  onUploadCoverImage?: (file: File) => Promise<void>;
  onDeleteCoverImage?: () => Promise<void>;
  onUploadPhoto?: (
    field: 'cover_path' | 'story_photo_path' | 'witnesses_photo_path',
    file: File
  ) => Promise<void>;
  onDeletePhoto?: (
    field: 'cover_path' | 'story_photo_path' | 'witnesses_photo_path'
  ) => Promise<void>;
}

export function GazettePreview({
  gazette,
  onEditSection,
  onEditMetadata,
  onThemeChange,
  onUpdateMetadataField,
  onUpdateSectionContent,
  onAddQuickBlock,
  onUploadCoverImage,
  onDeleteCoverImage,
  onUploadPhoto,
  onDeletePhoto,
}: GazettePreviewProps) {
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3 | 4>(1);
  const [spreadMode, setSpreadMode] = useState<boolean>(false);
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, number>>({});
  const [showSolutions, setShowSolutions] = useState(false);

  // Synchronisation du thème actif
  const [localTheme, setLocalTheme] = useState<GazetteTheme | null>(null);
  const activeTheme: GazetteTheme = localTheme || gazette.layout?.theme || 'chic_minimal';

  useEffect(() => {
    if (gazette.layout?.theme) {
      setLocalTheme(gazette.layout.theme);
    }
  }, [gazette.layout?.theme]);

  // Mode Édition directe (Canva-like)
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Cible de téléchargement de photo active
  const [uploadTargetField, setUploadTargetField] = useState<
    'cover_path' | 'story_photo_path' | 'witnesses_photo_path'
  >('cover_path');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectTheme = async (theme: GazetteTheme) => {
    setLocalTheme(theme);
    onThemeChange?.(theme);
    if (onUpdateMetadataField) {
      await onUpdateMetadataField({
        layout: {
          ...gazette.layout,
          theme,
        },
      });
    }
  };

  const triggerPhotoUpload = (
    field: 'cover_path' | 'story_photo_path' | 'witnesses_photo_path'
  ) => {
    setUploadTargetField(field);
    fileInputRef.current?.click();
  };

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadPhoto) {
      onUploadPhoto(uploadTargetField, file);
    } else if (uploadTargetField === 'cover_path' && onUploadCoverImage) {
      onUploadCoverImage(file);
    }
    e.target.value = '';
  };

  const handleDeletePhotoSlot = async (
    field: 'cover_path' | 'story_photo_path' | 'witnesses_photo_path'
  ) => {
    try {
      setSaveStatus('saving');
      if (onDeletePhoto) {
        await onDeletePhoto(field);
      } else if (field === 'cover_path' && onDeleteCoverImage) {
        await onDeleteCoverImage();
      } else if (onUpdateMetadataField) {
        await onUpdateMetadataField({ [field]: null });
      }
      setSaveStatus('saved');
      toast.success('Photo supprimée avec succès.');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('idle');
      toast.error('Erreur lors de la suppression de la photo.');
    }
  };

  // Sauvegarde instantanée d'un champ métadonnée
  const handleSaveMetadataField = async (field: keyof Gazette, value: any) => {
    if (!onUpdateMetadataField) return;
    if ((gazette as any)[field] === value) return;
    try {
      setSaveStatus('saving');
      await onUpdateMetadataField({ [field]: value } as any);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('idle');
      toast.error('Erreur lors de l’enregistrement automatique.');
    }
  };

  // Sauvegarde instantanée du titre ou contenu d'une section
  const handleSaveSectionField = async (
    sectionId: string,
    updatedTitle?: string,
    updatedContent?: any
  ) => {
    if (!onUpdateSectionContent) return;
    try {
      setSaveStatus('saving');
      await onUpdateSectionContent(sectionId, {
        title: updatedTitle,
        content: updatedContent,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('idle');
      toast.error('Erreur lors de la mise à jour de la rubrique.');
    }
  };

  // Changement de couleur d'accentuation
  const handleColorChange = (hex: string) => {
    if (!onUpdateMetadataField) return;
    onUpdateMetadataField({
      layout: {
        ...gazette.layout,
        theme: activeTheme,
        accent_color: hex,
      },
    });
  };

  // Changement de typographie
  const handleFontChange = (font: 'bodoni' | 'playfair' | 'cinzel' | 'sans') => {
    if (!onUpdateMetadataField) return;
    onUpdateMetadataField({
      layout: {
        ...gazette.layout,
        theme: activeTheme,
        font_family: font,
      },
    });
  };

  const isVogue = activeTheme === 'chic_minimal';
  const isRomantic = activeTheme === 'romantic_rose';
  const isParisienne = activeTheme === 'vintage_gazette';

  const accentColor = gazette.layout?.accent_color || (isVogue ? '#18181b' : isRomantic ? '#be123c' : '#881337');
  const headlineFont =
    gazette.layout?.font_family === 'sans'
      ? 'font-sans'
      : gazette.layout?.font_family === 'cinzel'
      ? 'font-serif tracking-widest'
      : 'font-serif';

  // Fond et textures réactives du papier selon le thème
  const paperBg = isVogue
    ? 'bg-white text-zinc-900 border-zinc-200'
    : isRomantic
    ? 'bg-[#fffaf8] text-stone-900 border-rose-200/80'
    : 'bg-[#fcf9f2] text-stone-950 border-stone-400';

  const storySection = gazette.sections.find((s) => s.type === 'story');
  const anecdoteSection = gazette.sections.find((s) => s.type === 'anecdote');
  const programSection = gazette.sections.find((s) => s.type === 'program');
  const quizSection = gazette.sections.find((s) => s.type === 'quiz');
  const customSections = gazette.sections.filter((s) => s.type === 'custom');

  const formattedDate = gazette.wedding_date
    ? new Date(gazette.wedding_date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Samedi 12 Septembre 2026';

  // Micro-détails
  const editionTag = gazette.edition_tag || (isVogue ? 'ISSUE NO. 01' : isRomantic ? 'TIRAGE DE FÊTE' : 'VOL. I — N° 001');
  const priceTag = gazette.price_tag || 'PRIX : TOUT VOTRE AMOUR';
  const qrTarget = gazette.qr_code_target || 'guestbook';

  // Style helper pour l'édition directe
  const editableClass = isEditable
    ? 'outline-hidden hover:outline-dashed hover:outline-1.5 hover:outline-rose-500 hover:bg-rose-50/40 focus:outline-2 focus:outline-rose-600 focus:bg-white rounded-xs px-1 transition-all duration-150 cursor-text'
    : '';

  // Rendu du pied de page éditorial
  const renderFooter = (pageNum: number) => (
    <div className="border-t border-stone-300 pt-2 flex items-center justify-between text-[8px] font-sans uppercase tracking-[0.2em] text-stone-400">
      <span>{editionTag}</span>
      <span className="font-semibold text-stone-600">PAGE {pageNum} SUR 4</span>
      <span className="truncate max-w-[180px]">{gazette.title || 'LA GAZETTE DES MARIÉS'}</span>
    </div>
  );

  // Rendu d'une page
  const renderPage = (pageNum: 1 | 2 | 3 | 4) => (
    <div
      key={`${pageNum}-${activeTheme}-${accentColor}`}
      className={`w-full max-w-[540px] lg:max-w-[580px] min-h-[840px] p-6 sm:p-8 border shadow-2xl flex flex-col justify-between relative transition-all duration-300 ${paperBg}`}
    >
      {/* Texture filigrane subtile selon le thème */}
      {isParisienne && (
        <div className="absolute inset-0 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
      )}
      {isRomantic && (
        <div className="absolute inset-0 bg-[radial-gradient(#fecdd3_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
      )}

      {/* Cadre de page avec couleur d'accent */}
      <div
        className={`h-full flex flex-col justify-between py-2 relative z-10 ${
          isVogue
            ? 'border-t-4 border-b border-zinc-950'
            : isRomantic
            ? 'border-t-2 border-b-2'
            : 'border-t-2 border-b-2 border-stone-900'
        }`}
        style={isRomantic ? { borderColor: accentColor } : undefined}
      >
        {/* ==================================================== */}
        {/* PAGE 1 : LA UNE */}
        {/* ==================================================== */}
        {pageNum === 1 && (
          <div className="space-y-4">
            {/* THÈME 1 : VOGUE ÉDITORIAL (Moderne, High Fashion) */}
            {isVogue && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[9px] font-sans uppercase tracking-[0.3em] text-stone-500 border-b border-stone-200 pb-1.5">
                  <span
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('edition_tag', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {editionTag}
                  </span>
                  <span className="font-bold text-stone-900 tracking-[0.35em]">THE WEDDING JOURNAL</span>
                  <span
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('price_tag', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {priceTag}
                  </span>
                </div>

                <div className="text-center py-1">
                  <h1
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('title', e.currentTarget.innerText.trim())}
                    className={`text-4xl sm:text-5xl font-black tracking-[0.16em] uppercase text-zinc-950 block ${headlineFont} ${editableClass}`}
                    title={isEditable ? 'Cliquez pour modifier le titre' : undefined}
                  >
                    {gazette.title || 'THE VOWS'}
                  </h1>
                  <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-stone-500 mt-1">
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('location_name', e.currentTarget.innerText.trim())}
                      className={editableClass}
                    >
                      {gazette.location_name || 'PARIS & CHÂTEAU'}
                    </span>{' '}
                    • {formattedDate}
                  </p>
                </div>

                <div className="border-t border-b border-zinc-950 py-2 text-center">
                  <h2
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('subtitle', e.currentTarget.innerText.trim())}
                    className={`text-2xl sm:text-3xl font-bold tracking-tight uppercase text-zinc-900 block ${headlineFont} ${editableClass}`}
                  >
                    {gazette.subtitle || 'AND TOAST TO FOREVER'}
                  </h2>
                </div>

                {/* Photo de Une style magazine de mode */}
                <div className="relative group overflow-hidden bg-stone-100 border border-stone-300">
                  <div
                    onClick={() => triggerPhotoUpload('cover_path')}
                    className="w-full h-64 sm:h-72 flex items-center justify-center bg-stone-900/5 cursor-pointer relative group/photo"
                  >
                    {gazette.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={gazette.cover_path}
                        alt="Photo de Une"
                        className="w-full h-full object-cover filter grayscale contrast-110"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <Camera className="w-8 h-8 text-zinc-400 mx-auto" />
                        <span className="text-sm font-serif italic text-zinc-600 block">
                          Cliché éditorial des mariés
                        </span>
                        <span className="text-[9px] font-sans uppercase tracking-widest text-zinc-400 block">
                          (Cliquez pour insérer votre photo haute définition)
                        </span>
                      </div>
                    )}

                    {isEditable && (
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerPhotoUpload('cover_path');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-white text-stone-950 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-stone-100 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-zinc-900" />
                          <span>{gazette.cover_path ? 'Changer' : 'Ajouter une photo'}</span>
                        </button>

                        {gazette.cover_path && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhotoSlot('cover_path');
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-2 bg-white flex items-center justify-between text-[10px] font-sans border-t border-stone-200">
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('cover_caption', e.currentTarget.innerText.trim())}
                      className={`italic text-stone-600 font-serif ${editableClass}`}
                    >
                      {gazette.cover_caption || '« Le commencement d’une vie à deux pleine de promesses et d’élégance »'}
                    </span>
                    <span className="uppercase text-[8px] tracking-widest font-bold text-stone-400">Paparazzi View</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-200">
                  <div className="space-y-1.5 border-r border-stone-200 pr-3">
                    <span className="text-[9px] font-sans uppercase tracking-widest font-bold text-zinc-900 block">
                      From the Couple
                    </span>
                    <p
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('editorial', e.currentTarget.innerText.trim())}
                      className={`text-[11px] font-serif text-zinc-700 leading-relaxed text-justify first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-1.5 first-letter:text-zinc-950 ${editableClass}`}
                    >
                      {gazette.editorial ||
                        'Chers invités, soyez les bienvenus dans notre édition spéciale. Nous avons imaginé ces quelques pages pour immortaliser les souvenirs, guider votre journée et célébrer l’amour.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs font-sans text-stone-600">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-900 block">
                      Météo & En Bref
                    </span>
                    <p
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('weather_forecast', e.currentTarget.innerText.trim())}
                      className={`text-[11px] leading-tight font-serif italic text-zinc-700 ${editableClass}`}
                    >
                      {gazette.weather_forecast || 'Météo du jour : 32°C de douceur infinie et averses de rires prévues !'}
                    </p>
                    <div className="pt-1.5 space-y-1 text-[10px]">
                      {programSection && (programSection.content as ProgramSectionContent)?.items?.length > 0 ? (
                        (programSection.content as ProgramSectionContent).items.slice(0, 3).map((it, idx) => (
                          <p key={idx}><strong>{it.time} —</strong> {it.title}</p>
                        ))
                      ) : (
                        <>
                          <p><strong>16:30 —</strong> Cocktail & vin d’honneur dans les jardins.</p>
                          <p><strong>19:30 —</strong> Grand dîner de fête & surprises.</p>
                          <p><strong>23:00 —</strong> Soirée dansante jusqu’au bout de la nuit.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* THÈME 2 : ROMANCE FLORALE (Chic Poétique & Chaleureux) */}
            {isRomantic && (
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between text-[9px] font-sans uppercase tracking-[0.2em] border-b pb-1"
                  style={{ color: accentColor, borderColor: `${accentColor}33` }}
                >
                  <span
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('edition_tag', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {editionTag}
                  </span>
                  <span className="font-bold flex items-center gap-1">
                    <Heart className="w-2.5 h-2.5 inline" style={{ fill: accentColor }} />
                    LE CARNET DU MARIAGE
                    <Heart className="w-2.5 h-2.5 inline" style={{ fill: accentColor }} />
                  </span>
                  <span
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('price_tag', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {priceTag}
                  </span>
                </div>

                <div className="text-center py-2">
                  <h1
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('title', e.currentTarget.innerText.trim())}
                    className={`text-3xl sm:text-4xl font-bold tracking-tight block ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {gazette.title || 'La Gazette des Mariés'}
                  </h1>
                  <div className="flex items-center justify-center gap-3 mt-1 text-xs font-serif italic text-rose-800">
                    <span>{formattedDate}</span>
                    <span>•</span>
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('location_name', e.currentTarget.innerText.trim())}
                      className={editableClass}
                    >
                      {gazette.location_name || 'Château & Jardins'}
                    </span>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 text-center border"
                  style={{
                    backgroundColor: `${accentColor}10`,
                    borderColor: `${accentColor}33`,
                  }}
                >
                  <h2
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('subtitle', e.currentTarget.innerText.trim())}
                    className={`text-xl sm:text-2xl font-bold italic block ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    « {gazette.subtitle || 'Deux cœurs unis pour l’éternité'} »
                  </h2>
                </div>

                {/* Cadre photo doux avec coins arrondis */}
                <div
                  className="rounded-2xl p-2 bg-white shadow-xs border"
                  style={{ borderColor: `${accentColor}40` }}
                >
                  <div
                    onClick={() => triggerPhotoUpload('cover_path')}
                    className="w-full h-56 sm:h-64 rounded-xl overflow-hidden bg-rose-50/50 flex items-center justify-center cursor-pointer relative group/photo"
                  >
                    {gazette.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gazette.cover_path} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <Heart className="w-8 h-8 mx-auto mb-1 animate-pulse" style={{ color: accentColor }} />
                        <span className="font-serif italic text-sm block" style={{ color: accentColor }}>
                          Cliché romantique des mariés
                        </span>
                        <span className="text-[9px] font-sans uppercase tracking-widest text-stone-400 block mt-1">
                          (Cliquez pour insérer votre photo)
                        </span>
                      </div>
                    )}

                    {isEditable && (
                      <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerPhotoUpload('cover_path');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-white text-stone-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-stone-50 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" style={{ color: accentColor }} />
                          <span>{gazette.cover_path ? 'Changer' : 'Ajouter'}</span>
                        </button>

                        {gazette.cover_path && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhotoSlot('cover_path');
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('cover_caption', e.currentTarget.innerText.trim())}
                    className={`text-center text-[10px] font-serif italic mt-2 ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {gazette.cover_caption || '« Le commencement d’une vie à deux pleine de douceur et de complicité »'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: `${accentColor}33` }}>
                  <div className="border-r pr-3" style={{ borderColor: `${accentColor}33` }}>
                    <h3 className="font-serif font-bold text-xs uppercase mb-1" style={{ color: accentColor }}>
                      Le Mot des Mariés
                    </h3>
                    <p
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('editorial', e.currentTarget.innerText.trim())}
                      className={`text-[11px] font-serif text-stone-700 leading-relaxed text-justify first-letter:text-2xl first-letter:font-bold first-letter:float-left first-letter:mr-1.5 ${editableClass}`}
                      style={{ color: isVogue ? '#18181b' : undefined }}
                    >
                      {gazette.editorial || 'Bienvenue dans notre gazette d’amour ! Merci de célébrer ce moment magique à nos côtés.'}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs font-serif italic text-stone-700">
                    <h3 className="font-bold text-xs uppercase not-italic font-sans mb-1" style={{ color: accentColor }}>
                      Météo de l'Amour
                    </h3>
                    <p
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('weather_forecast', e.currentTarget.innerText.trim())}
                      className={`text-[11px] leading-relaxed ${editableClass}`}
                    >
                      {gazette.weather_forecast || '32°C de douceur infinie, rayonnement des sourires et averses de confettis prévues !'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* THÈME 3 : GAZETTE PARISIENNE (Grand Quotidien Authentique) */}
            {isParisienne && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[9px] font-sans uppercase tracking-[0.25em] text-stone-600 border-b border-stone-300 pb-1">
                  <span
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('edition_tag', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {editionTag}
                  </span>
                  <span className="font-bold text-stone-900 tracking-[0.3em]">ÉDITION SPÉCIALE • TIRAGE UNIQUE</span>
                  <span
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('price_tag', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {priceTag}
                  </span>
                </div>

                {/* Oreilles de presse d'époque */}
                <div className="grid grid-cols-5 items-center gap-2 py-1">
                  <div className="col-span-1 border-r border-stone-300 pr-2 text-left hidden sm:block">
                    <span className="text-[8px] font-sans font-bold uppercase text-stone-500 block">MÉTÉO DU CŒUR</span>
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('weather_forecast', e.currentTarget.innerText.trim())}
                      className={`text-[9px] font-serif italic text-stone-800 leading-tight block ${editableClass}`}
                    >
                      {gazette.weather_forecast || '32°C • Ciel radieux'}
                    </span>
                  </div>

                  <div className="col-span-5 sm:col-span-3 text-center">
                    <h1
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('title', e.currentTarget.innerText.trim())}
                      className={`text-3xl sm:text-4xl font-black uppercase tracking-tight text-stone-900 block ${headlineFont} ${editableClass}`}
                    >
                      {gazette.title || 'LA GAZETTE DES MARIÉS'}
                    </h1>
                  </div>

                  <div className="col-span-1 border-l border-stone-300 pl-2 text-right hidden sm:block">
                    <span className="text-[8px] font-sans font-bold uppercase text-stone-500 block">LIEU DU JOUR</span>
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('location_name', e.currentTarget.innerText.trim())}
                      className={`text-[9px] font-serif italic text-stone-800 leading-tight block ${editableClass}`}
                    >
                      {gazette.location_name || 'Château'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-serif italic text-stone-700 border-t border-b border-stone-400 py-1">
                  <span>{formattedDate}</span>
                  <span className="font-sans text-[8px] uppercase tracking-widest text-stone-500 font-bold">
                    JOURNAL OFFICIEL DE LA CÉLÉBRATION
                  </span>
                  <span>{priceTag}</span>
                </div>

                <div className="text-center py-1">
                  <h2
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('subtitle', e.currentTarget.innerText.trim())}
                    className={`text-2xl sm:text-3xl font-black uppercase text-stone-900 block ${headlineFont} ${editableClass}`}
                  >
                    {gazette.subtitle || 'ILS SE SONT DIT OUI !'}
                  </h2>
                </div>

                <div className="border border-stone-900 p-1 bg-white">
                  <div
                    onClick={() => triggerPhotoUpload('cover_path')}
                    className="w-full h-52 sm:h-56 bg-stone-200 flex items-center justify-center cursor-pointer relative group/photo"
                  >
                    {gazette.cover_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gazette.cover_path} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-serif italic text-sm text-stone-600">Photo exclusive des mariés</span>
                    )}

                    {isEditable && (
                      <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerPhotoUpload('cover_path');
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-white text-stone-900 text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-stone-100 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-stone-700" />
                          <span>{gazette.cover_path ? 'Changer' : 'Ajouter'}</span>
                        </button>

                        {gazette.cover_path && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhotoSlot('cover_path');
                            }}
                            className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 hover:bg-rose-700 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveMetadataField('cover_caption', e.currentTarget.innerText.trim())}
                    className={`text-center text-[10px] font-serif italic text-stone-600 mt-1 ${editableClass}`}
                  >
                    {gazette.cover_caption || '« Le commencement d’une vie à deux pleine de promesses et d’aventures »'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-stone-300">
                  <div className="border-r border-stone-300 pr-3">
                    <h3 className="font-serif font-bold text-xs uppercase text-stone-900 border-b border-stone-300 pb-1 mb-1">
                      Éditorial des Mariés
                    </h3>
                    <p
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => handleSaveMetadataField('editorial', e.currentTarget.innerText.trim())}
                      className={`text-[11px] font-serif text-stone-700 leading-relaxed text-justify first-letter:text-3xl first-letter:font-bold first-letter:float-left first-letter:mr-1.5 first-letter:text-stone-900 ${editableClass}`}
                    >
                      {gazette.editorial || 'Bienvenue dans notre gazette officielle. Riez, découvrez nos anecdotes et surtout célébrez avec nous !'}
                    </p>
                  </div>
                  <div className="space-y-1 text-xs font-sans text-stone-700">
                    <h3 className="font-serif font-bold text-xs uppercase text-stone-900 border-b border-stone-300 pb-1 mb-1">
                      En Bref
                    </h3>
                    <p className="text-[10px]"><strong>• Cocktail :</strong> Dès 16h30 dans les jardins.</p>
                    <p className="text-[10px]"><strong>• Grand Quiz :</strong> Rendez-vous page 4 avant le dessert !</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* PAGE 2 : NOTRE HISTOIRE & MULTI-PHOTOS */}
        {/* ==================================================== */}
        {pageNum === 2 && (
          <div className="space-y-4">
            <div className="text-center border-b border-stone-300 pb-1.5">
              <span className="text-[9px] font-sans uppercase tracking-[0.25em] text-stone-500">
                Page 2 — Récit & Coulisses
              </span>
              <h2
                className={`text-2xl font-bold uppercase mt-0.5 ${headlineFont}`}
                style={{ color: isVogue ? '#18181b' : accentColor }}
              >
                Notre Histoire & Confidences
              </h2>
            </div>

            {/* Emplacement Photo 2 : Notre Histoire / Rencontre */}
            <div className="relative group overflow-hidden bg-stone-100 border border-stone-200 rounded-lg">
              {gazette.story_photo_path ? (
                <div className="relative h-44 sm:h-48 group/photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gazette.story_photo_path}
                    alt="Photo de notre histoire"
                    className="w-full h-full object-cover"
                  />
                  {isEditable && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerPhotoUpload('story_photo_path')}
                        className="px-3 py-1.5 rounded-full bg-white text-stone-900 text-xs font-bold shadow-md flex items-center gap-1.5 hover:bg-stone-100 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        <span>Changer la photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhotoSlot('story_photo_path')}
                        className="px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[9px] font-serif italic text-stone-600 border-t border-stone-200 flex justify-between">
                    <span>Le jour où nos regards se sont croisés</span>
                    <span className="font-sans font-bold uppercase text-[8px] text-stone-400">Photo 2/3</span>
                  </div>
                </div>
              ) : (
                isEditable && (
                  <button
                    type="button"
                    onClick={() => triggerPhotoUpload('story_photo_path')}
                    className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-lg text-stone-500 hover:text-stone-800 transition flex items-center justify-center gap-2 text-xs font-semibold bg-stone-50/50 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" style={{ color: accentColor }} />
                    <span>+ Ajouter la photo de votre rencontre ou premier voyage (Page 2)</span>
                  </button>
                )
              )}
            </div>

            {storySection && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveSectionField(storySection.id, e.currentTarget.innerText.trim())}
                    className={`text-xs font-bold uppercase tracking-wider ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {storySection.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onEditSection?.(storySection)}
                    className="text-[10px] text-stone-400 hover:text-stone-700 transition flex items-center gap-1 cursor-pointer"
                    title="Ouvrir le formulaire détaillé"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Options</span>
                  </button>
                </div>

                <p
                  contentEditable={isEditable}
                  suppressContentEditableWarning
                  onBlur={(e) => {
                    const current = storySection.content as StorySectionContent;
                    handleSaveSectionField(storySection.id, storySection.title, {
                      ...current,
                      narrative: e.currentTarget.innerText.trim(),
                    });
                  }}
                  className={`text-[11px] font-serif text-stone-700 leading-relaxed text-justify first-letter:text-2xl first-letter:font-bold first-letter:float-left first-letter:mr-1 ${editableClass}`}
                  title={isEditable ? 'Cliquez pour modifier le récit de la rencontre' : undefined}
                >
                  {(storySection.content as StorySectionContent)?.narrative}
                </p>

                {/* Timeline épurée - Éditables en direct */}
                <div className="space-y-2 pt-2 border-t border-stone-200">
                  {(storySection.content as StorySectionContent)?.timeline?.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      <span
                        contentEditable={isEditable}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const current = storySection.content as StorySectionContent;
                          const updatedTimeline = [...(current.timeline || [])];
                          updatedTimeline[idx] = { ...updatedTimeline[idx], year_or_date: e.currentTarget.innerText.trim() };
                          handleSaveSectionField(storySection.id, storySection.title, { ...current, timeline: updatedTimeline });
                        }}
                        className={`text-[9px] font-bold uppercase tracking-wider text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded shrink-0 ${editableClass}`}
                      >
                        {step.year_or_date}
                      </span>
                      <div className="flex-1">
                        <strong
                          contentEditable={isEditable}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const current = storySection.content as StorySectionContent;
                            const updatedTimeline = [...(current.timeline || [])];
                            updatedTimeline[idx] = { ...updatedTimeline[idx], title: e.currentTarget.innerText.trim() };
                            handleSaveSectionField(storySection.id, storySection.title, { ...current, timeline: updatedTimeline });
                          }}
                          className={`text-stone-900 text-[11px] block ${editableClass}`}
                        >
                          {step.title}
                        </strong>
                        <p
                          contentEditable={isEditable}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const current = storySection.content as StorySectionContent;
                            const updatedTimeline = [...(current.timeline || [])];
                            updatedTimeline[idx] = { ...updatedTimeline[idx], text: e.currentTarget.innerText.trim() };
                            handleSaveSectionField(storySection.id, storySection.title, { ...current, timeline: updatedTimeline });
                          }}
                          className={`text-[10px] text-stone-600 font-serif italic ${editableClass}`}
                        >
                          {step.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {anecdoteSection && (
              <div className="border-t-2 pt-3" style={{ borderColor: isVogue ? '#18181b' : accentColor }}>
                <div className="flex items-center justify-between mb-2">
                  <h3
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveSectionField(anecdoteSection.id, e.currentTarget.innerText.trim())}
                    className={`text-xs font-bold uppercase tracking-wider ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {anecdoteSection.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onEditSection?.(anecdoteSection)}
                    className="text-[10px] text-stone-400 hover:text-stone-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Options</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {(anecdoteSection.content as AnecdoteSectionContent)?.items?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-stone-100/70 border-l-2 text-[10px]"
                      style={{ borderLeftColor: accentColor }}
                    >
                      <span
                        contentEditable={isEditable}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const current = anecdoteSection.content as AnecdoteSectionContent;
                          const updatedItems = [...(current.items || [])];
                          updatedItems[idx] = { ...updatedItems[idx], title: e.currentTarget.innerText.trim() };
                          handleSaveSectionField(anecdoteSection.id, anecdoteSection.title, { ...current, items: updatedItems });
                        }}
                        className={`font-sans font-bold text-stone-900 block mb-0.5 ${editableClass}`}
                      >
                        {item.title}
                      </span>
                      <p
                        contentEditable={isEditable}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const current = anecdoteSection.content as AnecdoteSectionContent;
                          const updatedItems = [...(current.items || [])];
                          updatedItems[idx] = { ...updatedItems[idx], content: e.currentTarget.innerText.trim() };
                          handleSaveSectionField(anecdoteSection.id, anecdoteSection.title, { ...current, items: updatedItems });
                        }}
                        className={`font-serif italic text-stone-600 leading-tight ${editableClass}`}
                      >
                        « {item.content} »
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* PAGE 3 : LE PROGRAMME & LES TÉMOINS */}
        {/* ==================================================== */}
        {pageNum === 3 && (
          <div className="space-y-4">
            <div className="text-center border-b border-stone-300 pb-1.5">
              <span className="text-[9px] font-sans uppercase tracking-[0.25em] text-stone-500">
                Page 3 — Chronique du Jour J
              </span>
              <h2
                className={`text-2xl font-bold uppercase mt-0.5 ${headlineFont}`}
                style={{ color: isVogue ? '#18181b' : accentColor }}
              >
                L'Ordre du Jour & Les Complices
              </h2>
            </div>

            {/* Emplacement Photo 3 : Témoins & Cortège */}
            <div className="relative group overflow-hidden bg-stone-100 border border-stone-200 rounded-lg">
              {gazette.witnesses_photo_path ? (
                <div className="relative h-44 sm:h-48 group/photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gazette.witnesses_photo_path}
                    alt="Photo des témoins"
                    className="w-full h-full object-cover"
                  />
                  {isEditable && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerPhotoUpload('witnesses_photo_path')}
                        className="px-3 py-1.5 rounded-full bg-white text-stone-900 text-xs font-bold shadow-md flex items-center gap-1.5 hover:bg-stone-100 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" style={{ color: accentColor }} />
                        <span>Changer la photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhotoSlot('witnesses_photo_path')}
                        className="px-3 py-1.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[9px] font-serif italic text-stone-600 border-t border-stone-200 flex justify-between">
                    <span>Avec notre précieux cortège & témoins</span>
                    <span className="font-sans font-bold uppercase text-[8px] text-stone-400">Photo 3/3</span>
                  </div>
                </div>
              ) : (
                isEditable && (
                  <button
                    type="button"
                    onClick={() => triggerPhotoUpload('witnesses_photo_path')}
                    className="w-full py-3 border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-lg text-stone-500 hover:text-stone-800 transition flex items-center justify-center gap-2 text-xs font-semibold bg-stone-50/50 cursor-pointer"
                  >
                    <Users className="w-4 h-4" style={{ color: accentColor }} />
                    <span>+ Ajouter la photo avec vos témoins & cortège (Page 3)</span>
                  </button>
                )
              )}
            </div>

            {programSection && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveSectionField(programSection.id, e.currentTarget.innerText.trim())}
                    className={`text-xs font-bold uppercase tracking-wider ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {programSection.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onEditSection?.(programSection)}
                    className="text-[10px] text-stone-400 hover:text-stone-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Options</span>
                  </button>
                </div>

                <div className="space-y-2 font-sans">
                  {(programSection.content as ProgramSectionContent)?.items?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-2 bg-stone-50 border border-stone-200">
                      <span
                        contentEditable={isEditable}
                        suppressContentEditableWarning
                        onBlur={(e) => {
                          const current = programSection.content as ProgramSectionContent;
                          const updatedItems = [...(current.items || [])];
                          updatedItems[idx] = { ...updatedItems[idx], time: e.currentTarget.innerText.trim() };
                          handleSaveSectionField(programSection.id, programSection.title, { ...current, items: updatedItems });
                        }}
                        className={`font-bold text-[11px] text-white px-2 py-0.5 rounded shrink-0 shadow-2xs ${editableClass}`}
                        style={{ backgroundColor: accentColor }}
                      >
                        {item.time}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4
                            contentEditable={isEditable}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const current = programSection.content as ProgramSectionContent;
                              const updatedItems = [...(current.items || [])];
                              updatedItems[idx] = { ...updatedItems[idx], title: e.currentTarget.innerText.trim() };
                              handleSaveSectionField(programSection.id, programSection.title, { ...current, items: updatedItems });
                            }}
                            className={`font-bold text-xs text-stone-900 ${editableClass}`}
                          >
                            {item.title}
                          </h4>
                          {item.location && (
                            <span
                              contentEditable={isEditable}
                              suppressContentEditableWarning
                              onBlur={(e) => {
                                const current = programSection.content as ProgramSectionContent;
                                const updatedItems = [...(current.items || [])];
                                updatedItems[idx] = { ...updatedItems[idx], location: e.currentTarget.innerText.trim() };
                                handleSaveSectionField(programSection.id, programSection.title, { ...current, items: updatedItems });
                              }}
                              className={`text-[9px] text-stone-500 italic ${editableClass}`}
                            >
                              {item.location}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p
                            contentEditable={isEditable}
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const current = programSection.content as ProgramSectionContent;
                              const updatedItems = [...(current.items || [])];
                              updatedItems[idx] = { ...updatedItems[idx], description: e.currentTarget.innerText.trim() };
                              handleSaveSectionField(programSection.id, programSection.title, { ...current, items: updatedItems });
                            }}
                            className={`text-[10px] text-stone-600 font-serif italic mt-0.5 ${editableClass}`}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {customSections.length > 0 && (
              <div className="border-t-2 pt-3" style={{ borderColor: isVogue ? '#18181b' : accentColor }}>
                <div className="flex items-center justify-between mb-1.5">
                  <h3
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveSectionField(customSections[0].id, e.currentTarget.innerText.trim())}
                    className={`text-xs font-bold uppercase tracking-wider ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {customSections[0].title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onEditSection?.(customSections[0])}
                    className="text-[10px] text-stone-400 hover:text-stone-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Options</span>
                  </button>
                </div>

                <div className="p-3 bg-stone-100/50 border border-stone-300/80">
                  {customSections[0].content && (customSections[0].content as CustomSectionContent)?.subtitle && (
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const current = customSections[0].content as CustomSectionContent;
                        handleSaveSectionField(customSections[0].id, customSections[0].title, {
                          ...current,
                          subtitle: e.currentTarget.innerText.trim(),
                        });
                      }}
                      className={`text-[10px] font-serif italic block mb-1 font-semibold ${editableClass}`}
                      style={{ color: accentColor }}
                    >
                      {(customSections[0].content as CustomSectionContent).subtitle}
                    </span>
                  )}
                  <p
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const current = customSections[0].content as CustomSectionContent;
                      handleSaveSectionField(customSections[0].id, customSections[0].title, {
                        ...current,
                        body: e.currentTarget.innerText.trim(),
                      });
                    }}
                    className={`text-[11px] font-serif text-stone-700 leading-relaxed text-justify ${editableClass}`}
                  >
                    {(customSections[0].content as CustomSectionContent)?.body}
                  </p>
                  {(customSections[0].content as CustomSectionContent)?.signature && (
                    <span
                      contentEditable={isEditable}
                      suppressContentEditableWarning
                      onBlur={(e) => {
                        const current = customSections[0].content as CustomSectionContent;
                        handleSaveSectionField(customSections[0].id, customSections[0].title, {
                          ...current,
                          signature: e.currentTarget.innerText.trim().replace(/^—\s*/, ''),
                        });
                      }}
                      className={`text-[10px] font-serif italic text-right block mt-2 text-stone-900 font-semibold ${editableClass}`}
                    >
                      — {(customSections[0].content as CustomSectionContent).signature}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* PAGE 4 : LE GRAND QUIZ, JEUX & REMERCIEMENTS */}
        {/* ==================================================== */}
        {pageNum === 4 && (
          <div className="space-y-4">
            <div className="text-center border-b border-stone-300 pb-1.5">
              <span className="text-[9px] font-sans uppercase tracking-[0.25em] text-stone-500">
                Page 4 — Jeux & Clôture
              </span>
              <h2
                className={`text-2xl font-bold uppercase mt-0.5 ${headlineFont}`}
                style={{ color: isVogue ? '#18181b' : accentColor }}
              >
                Le Grand Quiz des Invités
              </h2>
            </div>

            {quizSection && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                  <h3
                    contentEditable={isEditable}
                    suppressContentEditableWarning
                    onBlur={(e) => handleSaveSectionField(quizSection.id, e.currentTarget.innerText.trim())}
                    className={`text-xs font-bold uppercase tracking-wider ${headlineFont} ${editableClass}`}
                    style={{ color: accentColor }}
                  >
                    {quizSection.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onEditSection?.(quizSection)}
                    className="text-[10px] text-stone-400 hover:text-stone-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Options</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 font-sans">
                  {(quizSection.content as QuizSectionContent)?.questions?.slice(0, 4).map((q, qIdx) => {
                    const chosen = userQuizAnswers[qIdx];
                    const isCorrect = chosen === q.answer_index;
                    return (
                      <div key={qIdx} className="p-2.5 bg-white border border-stone-200 rounded-xs space-y-1.5">
                        <span
                          contentEditable={isEditable}
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const current = quizSection.content as QuizSectionContent;
                            const updatedQuestions = [...(current.questions || [])];
                            updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], question: e.currentTarget.innerText.trim().replace(/^\d+\.\s*/, '') };
                            handleSaveSectionField(quizSection.id, quizSection.title, { ...current, questions: updatedQuestions });
                          }}
                          className={`font-bold text-[10px] text-stone-900 block leading-tight ${editableClass}`}
                        >
                          {qIdx + 1}. {q.question}
                        </span>
                        <div className="space-y-1">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = chosen === optIdx;
                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => setUserQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))}
                                className={`w-full text-left text-[9px] px-2 py-1 rounded transition flex items-center justify-between border cursor-pointer ${
                                  isSelected
                                    ? showSolutions
                                      ? isCorrect
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                                        : 'bg-rose-50 border-rose-400 text-rose-900'
                                      : 'bg-stone-200 border-stone-400 font-bold'
                                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-700'
                                }`}
                              >
                                <span className="truncate">
                                  <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                                </span>
                                {showSolutions && optIdx === q.answer_index && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 ml-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSolutions(!showSolutions)}
                    className="text-[10px] font-sans font-semibold text-stone-500 hover:text-stone-900 underline cursor-pointer"
                  >
                    {showSolutions ? 'Masquer le corrigé' : 'Vérifier mes réponses'}
                  </button>
                </div>
              </div>
            )}

            {/* Remerciements & QR Code interactif */}
            <div className="border border-stone-900 p-3 bg-stone-100/60 flex items-center justify-between gap-3">
              <div className="space-y-1 flex-1">
                <span
                  className="font-bold text-xs uppercase tracking-wider block"
                  style={{ color: accentColor }}
                >
                  Un Immense Merci
                </span>
                <p className="text-[10px] font-serif italic text-stone-700 leading-tight">
                  « Votre présence aujourd’hui est le plus précieux des cadeaux. Merci pour vos sourires et votre amour. »
                </p>
                <span className="text-[9px] font-sans font-semibold text-stone-800 block">
                  — Les mariés
                </span>
              </div>

              {/* Box QR Code avec sélecteur de destination (Page 4) */}
              <div className="w-20 bg-white border border-stone-300 p-1.5 flex flex-col items-center justify-center shrink-0 rounded-xs shadow-2xs">
                <QrCode className="w-7 h-7 text-stone-800 mb-0.5" />
                <span className="text-[7.5px] font-sans font-bold text-center leading-tight">SCAN ME</span>
                <span className="text-[6.5px] text-stone-500 text-center truncate max-w-full">
                  {qrTarget === 'photos' ? 'Photos' : qrTarget === 'honeymoon' ? 'Cagnotte' : 'Livre d’or'}
                </span>

                {isEditable && (
                  <div className="mt-1 flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleSaveMetadataField('qr_code_target', 'guestbook')}
                      className={`text-[6px] px-1 py-0.5 rounded ${qrTarget === 'guestbook' ? 'bg-stone-900 text-white font-bold' : 'text-stone-400 hover:text-stone-700'}`}
                      title="Livre d’or"
                    >
                      Livre
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveMetadataField('qr_code_target', 'photos')}
                      className={`text-[6px] px-1 py-0.5 rounded ${qrTarget === 'photos' ? 'bg-stone-900 text-white font-bold' : 'text-stone-400 hover:text-stone-700'}`}
                      title="Galerie photos"
                    >
                      Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveMetadataField('qr_code_target', 'honeymoon')}
                      className={`text-[6px] px-1 py-0.5 rounded ${qrTarget === 'honeymoon' ? 'bg-stone-900 text-white font-bold' : 'text-stone-400 hover:text-stone-700'}`}
                      title="Cagnotte"
                    >
                      Voyage
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Solutions inversées */}
            <div className="border-t border-stone-300 pt-1 text-center font-sans text-[8px] text-stone-500">
              <span className="font-bold text-stone-700">SOLUTIONS DU QUIZ (À NE LIRE QU'APRÈS LE DESSERT) :</span>{' '}
              {(quizSection?.content as QuizSectionContent)?.questions
                ?.slice(0, 4)
                .map((q, idx) => `Q${idx + 1}:${String.fromCharCode(65 + q.answer_index)}`)
                .join(' • ')}
            </div>
          </div>
        )}

        {/* Pied de page */}
        {renderFooter(pageNum)}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full space-y-6">
      {/* Input de fichier caché pour les photos (Une, Récit, Témoins) */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoFileChange}
        className="hidden"
      />

      {/* ── BARRE D'OUTILS HAUT DE GAMME (100% Lucide Icons, Zéro Emoji) ── */}
      <div className="w-full max-w-5xl bg-white border border-stone-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Ligne 1 : Mode Édition, Choix du Style & Navigation des Pages */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setIsEditable(true)}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  isEditable
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" style={{ color: accentColor }} />
                <span>Éditer au clic</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditable(false)}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  !isEditable
                    ? 'bg-white text-stone-900 font-bold shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-stone-400" />
                <span>Lecture</span>
              </button>
            </div>

            {/* Statut auto-save */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3 h-3 text-stone-400 animate-spin" />
                  <span className="italic text-[11px]">Enregistrement...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold text-[11px]">Enregistré</span>
                </>
              )}
              {saveStatus === 'idle' && isEditable && (
                <span className="text-stone-400 text-[11px] hidden sm:inline">
                  • Cliquez directement sur les textes pour modifier
                </span>
              )}
            </div>
          </div>

          {/* Sélecteur direct de Style de Presse / Thème */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1 hidden md:inline">
              Style :
            </span>
            {(Object.keys(GAZETTE_THEMES) as GazetteTheme[]).map((tKey) => {
              const conf = GAZETTE_THEMES[tKey];
              const isSelected = activeTheme === tKey;
              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => handleSelectTheme(tKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-white text-stone-950 font-bold shadow-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                  title={conf.description}
                >
                  {tKey === 'chic_minimal' && <Sparkles className="w-3.5 h-3.5 text-zinc-900" />}
                  {tKey === 'romantic_rose' && <Heart className="w-3.5 h-3.5 text-rose-500" />}
                  {tKey === 'vintage_gazette' && <BookOpen className="w-3.5 h-3.5 text-amber-800" />}
                  <span>{conf.label}</span>
                </button>
              );
            })}
          </div>

          {/* Navigation Pages Simple vs Ouverte */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setSpreadMode(false)}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  !spreadMode ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Page simple
              </button>
              <button
                type="button"
                onClick={() => setSpreadMode(true)}
                className={`px-3 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                  spreadMode ? 'bg-white text-stone-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Double Page (P.2-3)</span>
              </button>
            </div>

            {!spreadMode && (
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                {([1, 2, 3, 4] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition cursor-pointer ${
                      currentPage === p ? 'bg-stone-900 text-white font-bold' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    P.{p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ligne 2 : Charte Graphique du Mariage (Couleur + Typographie) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Palette de Couleurs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 shrink-0">
              <Palette className="w-3.5 h-3.5" />
              Couleur :
            </span>

            {WEDDING_COLOR_PALETTES.map((pal) => {
              const isSelected = accentColor.toLowerCase() === pal.hex.toLowerCase();
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => handleColorChange(pal.hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                    isSelected ? 'scale-115 border-stone-900 shadow-xs' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: pal.hex }}
                  title={`${pal.label} (${pal.hex})`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>
              );
            })}

            <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-stone-200">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-6 h-6 rounded-md cursor-pointer border border-stone-200 p-0 bg-transparent"
                title="Choisir une couleur personnalisée"
              />
            </div>
          </div>

          {/* Typographie de Titre */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1 shrink-0">
              <Type className="w-3.5 h-3.5" />
              Police :
            </span>
            <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs">
              {(
                [
                  { id: 'bodoni', label: 'Bodoni' },
                  { id: 'playfair', label: 'Playfair' },
                  { id: 'cinzel', label: 'Cinzel' },
                  { id: 'sans', label: 'Sans' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFontChange(f.id)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    (gazette.layout?.font_family || 'bodoni') === f.id
                      ? 'bg-white text-stone-900 font-bold shadow-2xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DU JOURNAL ÉDITABLE */}
      {spreadMode ? (
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 w-full max-w-6xl overflow-x-auto pb-6">
          {renderPage(2)}
          {renderPage(3)}
        </div>
      ) : (
        <div className="flex justify-center w-full">
          {renderPage(currentPage)}
        </div>
      )}
    </div>
  );
}
