import * as React from 'react';
import * as Ph from '@phosphor-icons/react';

type Weight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

export type IconProps = Omit<Ph.IconProps, 'weight'> & {
  strokeWidth?: number;
};

export type LucideIcon = React.FC<IconProps>;

const FALLBACK_ICON = (Ph as any).Question ?? (Ph as any).Info ?? (Ph as any).Circle;

function phosphor(name: string) {
  return (Ph as any)[name] || FALLBACK_ICON;
}

function make(name: string, weight: Weight = 'regular'): LucideIcon {
  const Icon = phosphor(name);
  const C: LucideIcon = ({ strokeWidth: _strokeWidth, ...props }) => {
    const { size, color, className, ...rest } = props;
    return React.createElement(Icon, {
      size,
      color,
      className,
      weight,
      ...rest,
    });
  };
  return C;
}

export const Heart = make('Heart');
export const Search = make('MagnifyingGlass');
export const MapPin = make('MapPin');
export const Star = make('Star', 'fill');
export const X = make('X');
export const Menu = make('List');
export const List = make('List');
export const Grid3X3 = make('SquaresFour');
export const Tag = make('Tag');
export const Crown = make('Crown');
export const Zap = make('Lightning');
export const Store = make('Storefront');
export const Camera = make('Camera');
export const Utensils = make('ForkKnife');
export const Flower2 = make('Flower');
export const Music = make('MusicNotes');
export const Users = make('Users');
export const Award = make('Trophy');
export const TrendingUp = make('TrendUp');
export const Euro = make('CurrencyEur');
export const CreditCard = make('CreditCard');
export const Check = make('Check');
export const CheckCircle = make('CheckCircle');
export const CheckCircle2 = make('CheckCircle');
export const CheckSquare = make('CheckSquare');
export const Clock = make('Clock');
export const AlertCircle = make('WarningCircle');
export const XCircle = make('XCircle');
export const Plus = make('Plus');
export const Trash2 = make('Trash');
export const Edit = make('PencilSimple');
export const PenLine = make('PencilSimple');
export const PencilLine = make('PencilSimple');
export const Pencil = make('PencilSimple');
export const Save = make('FloppyDisk');
export const Minus = make('Minus');
export const ChevronLeft = make('CaretLeft');
export const ChevronRight = make('CaretRight');
export const ChevronDown = make('CaretDown');
export const ChevronUp = make('CaretUp');
export const ChevronRightIcon = make('CaretRight');
export const Calculator = make('Calculator');
export const ArrowRight = make('ArrowRight');
export const ArrowLeft = make('ArrowLeft');
export const Calendar = make('Calendar');
export const CalendarDays = make('CalendarDots');
export const CalendarClock = make('Calendar');
export const FileText = make('FileText');
export const File = make('File');
export const FilePen = make('NotePencil');
export const FileCheck = make('FileCheck');
export const Download = make('DownloadSimple');
export const Upload = make('UploadSimple');
export const MessageCircle = make('ChatCircle');
export const MessageSquare = make('ChatText');
export const Send = make('PaperPlaneTilt');
export const Sparkles = make('Sparkle');
export const Megaphone = make('Megaphone');
export const Eye = make('Eye');
export const EyeOff = make('EyeSlash');
export const Lock = make('Lock');
export const Mail = make('EnvelopeSimple');
export const User = make('User');
export const Phone = make('Phone');
export const Chrome = make('ChromeLogo');
export const Share2 = make('ShareNetwork');
export const Bookmark = make('BookmarkSimple');
export const ExternalLink = make('ArrowSquareOut');
export const Globe = make('Globe');
export const Building2 = make('Buildings');
export const LayoutDashboard = make('Layout');
export const BarChart3 = make('ChartBar');
export const ThumbsUp = make('ThumbsUp');
export const Bell = make('Bell');
export const Settings = make('Gear');
export const LogOut = make('SignOut');
export const Receipt = make('Receipt');
export const FileCheck2 = make('FileCheck');
export const Paperclip = make('Paperclip');
export const RotateCcw = make('ArrowCounterClockwise');
export const RefreshCw = make('ArrowCounterClockwise');
export const Bolt = make('Lightning');
export const Image = make('Image');
export const ImageIcon = make('Image');

export const Database = make('Database');
export const SlidersHorizontal = make('Sliders');
export const Delete = make('Backspace');
export const ZoomIn = make('MagnifyingGlassPlus');

export const BookOpen = make('BookOpen');
export const ClipboardList = make('ClipboardText');
export const Copy = make('Copy');
export const Circle = make('Circle');
export const MoreVertical = make('DotsThreeVertical');
export const ToggleLeft = make('ToggleLeft');
export const ToggleRight = make('ToggleRight');
export const ShieldCheck = make('ShieldCheck');
export const BadgeCheck = make('SealCheck');
export const UserPlus = make('UserPlus');
export const UserCheck = make('UserCheck');
export const UsersRound = make('UsersThree');
export const ArrowUpRight = make('ArrowSquareOut');
export const SeparatorVertical = make('LineVertical');
export const Rotate = make('ArrowClockwise');
export const Refresh = make('ArrowCounterClockwise');

export const Instagram = make('InstagramLogo');
export const Facebook = make('FacebookLogo');
export const Twitter = make('TwitterLogo');

export const Loader2: LucideIcon = ({ className, ...props }) => {
  const Icon = phosphor('SpinnerGap');
  return React.createElement(Icon, { className, ...props, weight: 'regular' });
};

export const defaultIcon: LucideIcon = make('Question');
