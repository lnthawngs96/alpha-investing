import { isWebMCPAvailable } from '@/webmcp/useWebMCP';
import { useLocale } from '@/i18n';
import { cn } from '@/utils/classNames';
import { BotIcon, LogoMark } from '@/components/icons';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GuideSwitcher } from './GuideSwitcher';

/**
 * Header cố định: logo + tên app, trạng thái WebMCP, ngôn ngữ, guide và theme.
 * Quầng sáng gradient phía sau trôi chậm (animate-drift) để header có chiều sâu.
 */
export function AppHeader() {
  const webmcp = isWebMCPAvailable();
  const { t } = useLocale();

  return (
    <header className="relative z-30 shrink-0 border-b border-line bg-surface/80 backdrop-blur">
      {/* Quầng sáng trang trí — bọc trong lớp overflow-hidden RIÊNG (không đặt lên
          header) để popover theme mở ra bên dưới không bị clip / cuộn mất nội dung. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-24 -top-32 h-72 w-[38rem] rounded-full blur-3xl animate-drift"
          style={{
            background: `radial-gradient(closest-side, color-mix(in oklab, var(--accent) calc(var(--glow-alpha) * 100%), transparent), transparent)`,
          }}
        />
      </div>

      <div className="relative flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/30 transition-transform duration-500 hover:rotate-6 hover:scale-105">
            <LogoMark size={22} />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold tracking-tight text-fg">
              Alpha Investing
              <span className="ml-2 rounded-md bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                SN88
              </span>
            </h1>
            <p className="text-[11px] text-fg-muted">{t('header.tagline')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'hidden items-center gap-2 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold sm:flex',
              webmcp ? 'border-positive/50 bg-positive/10 text-positive' : 'border-line bg-surface text-fg-faint'
            )}
            title={webmcp ? t('header.webmcpOnTitle') : t('header.webmcpOffTitle')}
          >
            <BotIcon size={14} animated={webmcp} />
            <span
              className={cn('h-1.5 w-1.5 rounded-full', webmcp ? 'bg-positive animate-pulse-ring' : 'bg-fg-faint')}
            />
            {webmcp ? t('header.webmcpOn') : t('header.webmcpOff')}
          </div>
          <LanguageSwitcher />
          <GuideSwitcher />
          <ThemeSwitcher />
        </div>
      </div>
      <div className="hairline-accent h-px w-full opacity-60" />
    </header>
  );
}
