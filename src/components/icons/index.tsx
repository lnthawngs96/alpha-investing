import { cn } from '@/utils/classNames';
import { Svg, type IconProps } from './Svg';

export type { IconProps } from './Svg';

/*
 * Bộ icon SVG của app. Mọi icon dùng stroke `currentColor`.
 *
 * Quy ước animation:
 *   - `animated` → animation lặp (idle) cho icon trạng thái / trang trí.
 *   - Icon nằm trong phần tử cha có class `group` sẽ phản ứng khi hover
 *     (vd RefreshIcon xoay một vòng, ArrowIcon nhích lên).
 *   - Icon có trạng thái (ChevronIcon `open`) xoay bằng transition.
 */

// ───────────────────────── Điều hướng / tab ─────────────────────────

export function TableIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
    </Svg>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" className="transition-transform duration-500 origin-center group-hover:scale-110" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </Svg>
  );
}

// ───────────────────────── Theme ─────────────────────────

export function SunIcon({ animated, className, ...rest }: IconProps) {
  return (
    <Svg {...rest} className={cn(animated && 'animate-spin [animation-duration:14s]', className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
    </Svg>
  );
}

export function StarsIcon({ animated, ...rest }: IconProps) {
  return (
    <Svg {...rest}>
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />
      <path d="M18 3v3M16.5 4.5h3" className={cn('origin-center', animated && 'animate-twinkle')} />
      <path
        d="M21 9v2M20 10h2"
        className={cn('origin-center', animated && 'animate-twinkle [animation-delay:0.6s]')}
      />
    </Svg>
  );
}

export function MonitorIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </Svg>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 1.4-3.4 2 2 0 0 1 1.4-3.4H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3z" />
      <circle cx="7.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

// ───────────────────────── Hành động ─────────────────────────

export interface ChevronIconProps extends IconProps {
  /** Đang mở → xoay 180° (mũi tên chỉ lên). */
  open?: boolean;
}

export function ChevronIcon({ open, className, ...rest }: ChevronIconProps) {
  return (
    <Svg {...rest} className={cn('transition-transform duration-300', open && 'rotate-180', className)}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

export function UploadIcon({ className, ...rest }: IconProps) {
  return (
    <Svg {...rest} className={className}>
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M12 15V4M7 9l5-5 5 5" className="transition-transform duration-300 group-hover:-translate-y-0.5" />
    </Svg>
  );
}

export function DownloadIcon({ className, ...rest }: IconProps) {
  return (
    <Svg {...rest} className={className}>
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M12 4v11M7 10l5 5 5-5" className="transition-transform duration-300 group-hover:translate-y-0.5" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h9" className="transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </Svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </Svg>
  );
}

export function RefreshIcon({ className, ...rest }: IconProps) {
  return (
    <Svg {...rest} className={cn('group-hover:animate-spin-once', className)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 5v14l11-7z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function EraserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 15l9-9a2 2 0 0 1 3 0l4 4a2 2 0 0 1 0 3l-7 7H8l-4-4a2 2 0 0 1 0-1z" />
      <path d="M9 20l6-6" />
    </Svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
    </Svg>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3v18M4 7h16" />
      <path d="M7 7l-3 7a3 3 0 0 0 6 0L7 7zM17 7l-3 7a3 3 0 0 0 6 0l-3-7z" />
    </Svg>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </Svg>
  );
}

export function ArrowUpDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 4v16M4 8l4-4 4 4" />
      <path d="M16 20V4M12 16l4 4 4-4" />
    </Svg>
  );
}

export function ArrowUpIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </Svg>
  );
}

export function ArrowDownIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </Svg>
  );
}

export function ArrowLeftRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8h16M16 4l4 4-4 4" />
      <path d="M20 16H4M8 12l-4 4 4 4" />
    </Svg>
  );
}

// ───────────────────────── Trạng thái / biểu tượng ngữ nghĩa ─────────────────────────

export function SparklesIcon({ animated, ...rest }: IconProps) {
  return (
    <Svg {...rest}>
      <path
        d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z"
        fill="currentColor"
        stroke="none"
        className={cn('origin-[19px_18.5px]', animated && 'animate-twinkle')}
      />
      <path
        d="M5 15l.5 1.3 1.3.5-1.3.5L5 18.5l-.5-1.2-1.3-.5 1.3-.5L5 15z"
        fill="currentColor"
        stroke="none"
        className={cn('origin-[5px_16.7px]', animated && 'animate-twinkle [animation-delay:0.8s]')}
      />
    </Svg>
  );
}

export function ZapIcon({ animated, className, ...rest }: IconProps) {
  return (
    <Svg {...rest} className={cn(animated && 'animate-flicker', className)}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" fillOpacity="0.2" />
    </Svg>
  );
}

export function DropletIcon({ animated, className, ...rest }: IconProps) {
  return (
    <Svg {...rest} className={cn(animated && 'animate-bob', className)}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" fill="currentColor" fillOpacity="0.2" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l10 18H2L12 3z" />
      <path d="M12 10v4M12 17.5v.5" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.5" />
    </Svg>
  );
}

/** Icon Guide / sách hướng dẫn. */
export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5a2 2 0 0 1 2-2h11v18H6a2 2 0 0 0-2 2V5z" />
      <path d="M6 3a2 2 0 0 0-2 2v15" />
      <path d="M8 7h7M8 11h7M8 15h5" />
    </Svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </Svg>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </Svg>
  );
}

export function CoinsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="9" cy="7" rx="6" ry="2.5" />
      <path d="M3 7v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" />
      <path d="M3 12v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
      <path d="M15 9.5c3.3 0 6 1.1 6 2.5v5c0 1.4-2.7 2.5-6 2.5" />
    </Svg>
  );
}

/** Robot — biểu tượng agent. Ăng-ten nhấp nháy khi `animated`. */
export function BotIcon({ animated, ...rest }: IconProps) {
  return (
    <Svg {...rest}>
      <rect x="4" y="9" width="16" height="11" rx="3" />
      <path d="M12 9V5" />
      <circle
        cx="12"
        cy="4"
        r="1.2"
        fill="currentColor"
        stroke="none"
        className={cn('origin-[12px_4px]', animated && 'animate-twinkle')}
      />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9.5 17.5h5" />
    </Svg>
  );
}

/** Dấu thương hiệu: tia sét gradient theo màu accent, dùng ở header. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 46" fill="none" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent-strong)" />
          <stop offset="1" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      <path
        fill="url(#logo-grad)"
        d="M25.9 44.9c-.7.9-2 .4-2-.7V33.9a2.3 2.3 0 0 0-2.3-2.2H10.3c-.9 0-1.5-1.1-.9-1.8l7.5-10.5c1.1-1.5 0-3.6-1.9-3.6H1.2c-.9 0-1.4-1-.9-1.8L10 .5c.2-.3.6-.5.9-.5h28.9c.9 0 1.5 1 .9 1.8l-7.5 10.5c-1.1 1.5 0 3.6 1.8 3.6h11.4c.9 0 1.5 1.1.9 1.8L25.9 44.9z"
      />
    </svg>
  );
}
