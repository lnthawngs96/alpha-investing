import { useRef, useState } from 'react';
import type { Portfolio, SubnetRow } from '@/types';
import { TOAST_COPY_MS } from '@/constants/editor';
import { formatMetric } from '@/utils/format';
import { toNumber } from '@/utils/numeric';
import { sanitizeNumericText } from '@/utils/numeric';
import { buildNormalizedPortfolio } from '@/utils/portfolioMath';
import { formatPortfolioJson } from '@/utils/portfolioJson';
import { portfolioEntriesDesc, validatePortfolio } from '@/utils/portfolioValidation';
import { findSubnet } from '@/utils/subnetData';
import { cn } from '@/utils/classNames';
import { formatAssetId } from '@/constants/assets';
import { useAssetProfile } from '@/store/asset/context';
import { Button, Card, Eyebrow } from '@/components/ui';
import { BookmarkIcon, CheckIcon, CopyIcon, PencilIcon, RefreshIcon, XIcon } from '@/components/icons';

export interface PortfolioResultProps {
  portfolio: Portfolio;
  /** Các subnet đã chọn — để tra tên và chỉ số. */
  filteredSubnets: SubnetRow[];
  /** Chỉ số hiển thị cạnh tên (vd thanh khoản). */
  metricField?: string;
  editMode: boolean;
  onToggleEdit: () => void;
  onRegenerate: () => void;
  onApplyEdit: (portfolio: Portfolio) => void;
  onSave: () => void;
}

/**
 * Kết quả danh mục đang dựng: tổng phân bổ + trạng thái hợp lệ, thanh tỷ trọng
 * từng subnet (có thể sửa tay rồi chuẩn hoá), và JSON để copy.
 */
export function PortfolioResult({
  portfolio,
  filteredSubnets,
  metricField,
  editMode,
  onToggleEdit,
  onRegenerate,
  onApplyEdit,
  onSave,
}: PortfolioResultProps) {
  const profile = useAssetProfile();
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const entries = portfolioEntriesDesc(portfolio);
  const { valid, errors, total, cash } = validatePortfolio(portfolio);
  const json = formatPortfolioJson(portfolio);

  function handleCopy() {
    if (!valid) return;
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), TOAST_COPY_MS);
    });
  }

  // Đọc % người dùng gõ ở từng ô, chuẩn hoá tổng về 1.0.
  function handleApply() {
    const netuids = Object.keys(portfolio).filter((k) => k !== '_');
    const vals = netuids.map((id) => {
      const el = inputRefs.current[id];
      const v = el ? parseFloat(el.value) : portfolio[id] * 100;
      return isNaN(v) ? 0 : Math.max(0, v);
    });
    onApplyEdit(buildNormalizedPortfolio(netuids, vals, portfolio._ ?? profile.assetClass));
  }

  return (
    <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-5 animate-slide-up">
      {/* Head */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Portfolio allocation</Eyebrow>
          <div className="mt-2 text-xs text-fg-muted">
            Tổng:{' '}
            <span className={cn('font-mono font-bold tabular-nums', valid ? 'text-positive' : 'text-negative')}>
              {total.toFixed(6)}
            </span>
            {cash > 0 && <span className="text-fg-faint"> · Cash: {cash.toFixed(6)}</span>}
            <span className={cn('ml-2 inline-flex items-center gap-1', valid ? 'text-positive' : 'text-negative')}>
              {valid ? <CheckIcon size={12} strokeWidth={2.5} /> : <XIcon size={12} strokeWidth={2.5} />}
              {valid ? `Hợp lệ (${profile.ruleLabel})` : 'Không hợp lệ'}
            </span>
          </div>
          {!valid && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-negative">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={editMode ? <XIcon size={13} /> : <PencilIcon size={13} />}
            onClick={onToggleEdit}
          >
            {editMode ? 'Hủy' : 'Chỉnh sửa'}
          </Button>
          <Button
            size="sm"
            variant="accent"
            icon={copied ? <CheckIcon size={13} strokeWidth={2.5} /> : <CopyIcon size={13} />}
            onClick={handleCopy}
            disabled={!valid}
          >
            {copied ? 'Đã copy' : 'Copy JSON'}
          </Button>
          <Button size="sm" variant="secondary" icon={<RefreshIcon size={13} />} onClick={onRegenerate}>
            Tạo lại
          </Button>
          <Button size="sm" variant="success" icon={<BookmarkIcon size={13} />} onClick={onSave} disabled={!valid}>
            Lưu danh mục
          </Button>
          {editMode && (
            <Button size="sm" variant="success" icon={<CheckIcon size={13} strokeWidth={2.5} />} onClick={handleApply}>
              Áp dụng &amp; cân bằng
            </Button>
          )}
        </div>
      </div>

      {/* Bar list */}
      <div className="show-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {entries.map(([netuid, weight], i) => {
          const s = findSubnet(filteredSubnets, netuid);
          const pct = (weight * 100).toFixed(2);
          const metric = s && metricField ? toNumber(s[metricField]) : NaN;
          return (
            <div key={netuid} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <span className="min-w-[36px] font-mono text-xs font-bold text-accent">{formatAssetId(profile, netuid)}</span>
                <span className="flex-1 truncate text-xs text-fg">{s?.name || 'Unknown'}</span>
                {!isNaN(metric) && (
                  <span
                    className={cn('font-mono text-[11px] tabular-nums', metric >= 0 ? 'text-positive' : 'text-negative')}
                  >
                    {formatMetric(metric, metricField)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full origin-left rounded-full bg-gradient-to-r from-accent to-positive transition-[width] duration-500 ease-out animate-bar-grow"
                    style={{ width: `${Math.min(100, weight * 100)}%`, animationDelay: `${Math.min(i, 20) * 20}ms` }}
                  />
                </div>
                {editMode ? (
                  <input
                    ref={(el) => {
                      inputRefs.current[netuid] = el;
                    }}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={pct}
                    onChange={(e) => {
                      e.target.value = sanitizeNumericText(e.target.value);
                    }}
                    className="field w-20 border-accent text-right font-mono tabular-nums"
                  />
                ) : (
                  <span className="min-w-[60px] text-right font-mono text-xs tabular-nums text-fg">{pct}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* JSON output */}
      <div className="max-h-[160px] shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken">
        <div className="border-b border-line bg-surface-raised/70 px-3 py-1.5">
          <Eyebrow className="text-fg-faint">JSON output</Eyebrow>
        </div>
        <pre className="show-scrollbar max-h-[120px] overflow-auto px-4 py-2 font-mono text-xs leading-relaxed text-code">
          {json}
        </pre>
      </div>
    </Card>
  );
}
