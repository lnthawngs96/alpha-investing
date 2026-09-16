import type { SVGProps } from 'react';
import { cn } from '@/utils/classNames';

/** Props chung cho mọi icon: kích thước (px), độ dày nét, class bổ sung. */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
  strokeWidth?: number;
  /** Bật animation "idle" (chỉ có ở một số icon: Sparkles, Zap, Droplet, Bot…). */
  animated?: boolean;
  title?: string;
}

/**
 * Khung SVG 24×24 dùng chung: stroke theo `currentColor` nên icon tự đổi màu
 * theo text color của phần tử cha; `shrink-0` để không bị bóp trong flex.
 */
export function Svg({ size = 16, strokeWidth = 1.8, className, title, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={cn('shrink-0', className)}
      {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}
