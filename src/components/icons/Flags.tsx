import type { SVGProps } from 'react';

type FlagProps = SVGProps<SVGSVGElement> & { size?: number };

/** Cờ Anh (St George's Cross). */
export function FlagEngland({ size = 18, className, ...rest }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      width={size}
      height={(size * 40) / 60}
      className={className}
      aria-hidden
      {...rest}
    >
      <rect width="60" height="40" fill="#fff" />
      <rect x="25" width="10" height="40" fill="#c8102e" />
      <rect y="15" width="60" height="10" fill="#c8102e" />
    </svg>
  );
}

/** Cờ Việt Nam. */
export function FlagVietnam({ size = 18, className, ...rest }: FlagProps) {
  return (
    <svg
      viewBox="0 0 60 40"
      width={size}
      height={(size * 40) / 60}
      className={className}
      aria-hidden
      {...rest}
    >
      <rect width="60" height="40" fill="#da251d" />
      <polygon
        fill="#ff0"
        points="30,8 32.9,16.9 42.4,16.9 34.7,22.4 37.6,31.4 30,25.8 22.4,31.4 25.3,22.4 17.6,16.9 27.1,16.9"
      />
    </svg>
  );
}
