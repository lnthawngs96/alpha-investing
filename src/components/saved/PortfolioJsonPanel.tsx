import type { Portfolio, StatusMessage } from '@/types';
import { formatPortfolioJson } from '@/utils/portfolioJson';
import { ruleLabel, unitLabel, useLocale } from '@/i18n';
import { Button, Eyebrow, Notice } from '@/components/ui';
import { CheckIcon, CodeIcon, CopyIcon, PencilIcon, RefreshIcon, XIcon } from '@/components/icons';
import { useAssetProfile } from '@/store/asset/context';

export interface PortfolioJsonPanelProps {
  portfolio: Portfolio;
  /** Các cặp [netuid, tỷ trọng] đã lưu — dùng khi bắt đầu sửa tỷ trọng. */
  entries: Array<[string, number]>;
  isEditingWeights: boolean;
  isEditingJson: boolean;
  jsonDraft: string;
  copied: boolean;
  message: StatusMessage | undefined;
  onJsonDraftChange: (text: string) => void;
  onApplyWeights: () => void;
  onCancelWeights: () => void;
  onApplyJson: () => void;
  onCancelJson: () => void;
  onCopy: () => void;
  onRebalance: () => void;
  onStartEditWeights: () => void;
  onStartEditJson: () => void;
}

/**
 * Cột phải của chi tiết danh mục: JSON (xem / sửa tay) và các nút hành động
 * (copy, rebalance, sửa tỷ trọng, sửa JSON) tuỳ theo chế độ đang ở.
 */
export function PortfolioJsonPanel({
  portfolio,
  isEditingWeights,
  isEditingJson,
  jsonDraft,
  copied,
  message,
  onJsonDraftChange,
  onApplyWeights,
  onCancelWeights,
  onApplyJson,
  onCancelJson,
  onCopy,
  onRebalance,
  onStartEditWeights,
  onStartEditJson,
}: PortfolioJsonPanelProps) {
  const profile = useAssetProfile();
  const { t } = useLocale();
  const unit = unitLabel(profile.unit);
  return (
    <div className="show-scrollbar flex flex-col gap-3 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>{t('saved.jsonTitle')}</Eyebrow>
        <div className="flex flex-wrap items-center gap-2">
          {isEditingWeights ? (
            <>
              <Button
                size="sm"
                variant="success"
                icon={<CheckIcon size={13} strokeWidth={2.5} />}
                onClick={onApplyWeights}
                title={t('saved.applyWeightsTitle')}
              >
                {t('common.apply')}
              </Button>
              <Button size="sm" variant="secondary" icon={<XIcon size={13} />} onClick={onCancelWeights}>
                {t('common.cancel')}
              </Button>
            </>
          ) : isEditingJson ? (
            <>
              <Button
                size="sm"
                variant="success"
                icon={<CheckIcon size={13} strokeWidth={2.5} />}
                onClick={onApplyJson}
                title={t('saved.applyJsonTitle', { rule: ruleLabel(profile.key) })}
              >
                {t('saved.applyJson')}
              </Button>
              <Button size="sm" variant="secondary" icon={<XIcon size={13} />} onClick={onCancelJson}>
                {t('common.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="success"
                icon={copied ? <CheckIcon size={13} strokeWidth={2.5} /> : <CopyIcon size={13} />}
                onClick={onCopy}
                title={t('saved.copyTitle')}
              >
                {copied ? t('common.copied') : t('common.copyJson')}
              </Button>
              <Button
                size="sm"
                variant="accent"
                icon={<RefreshIcon size={13} />}
                onClick={onRebalance}
                title={t('saved.rebalanceTitle')}
              >
                {t('saved.rebalance')}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<PencilIcon size={13} />}
                onClick={onStartEditWeights}
                title={t('saved.editWeightsTitle', {
                  unit,
                  source: profile.key === 'alpha' ? t('saved.growthSource') : t('saved.rankSource'),
                })}
                className="hover:border-accent hover:text-accent"
              >
                {t('saved.editWeights', { unit })}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<CodeIcon size={13} />}
                onClick={onStartEditJson}
                title={t('saved.editJsonTitle')}
                className="hover:border-accent hover:text-accent"
              >
                {t('saved.editJson')}
              </Button>
            </>
          )}
        </div>
      </div>

      {message && (
        <Notice tone={message.ok ? 'success' : 'error'} hideIcon className="font-bold">
          {message.text}
        </Notice>
      )}

      {isEditingJson ? (
        <textarea
          autoFocus
          spellCheck={false}
          value={jsonDraft}
          onChange={(e) => onJsonDraftChange(e.target.value)}
          className="field min-h-[240px] w-full resize-y whitespace-pre border-accent p-3 font-mono leading-relaxed text-code"
        />
      ) : (
        <pre className="whitespace-pre rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs leading-relaxed text-code animate-fade-in">
          {formatPortfolioJson(portfolio)}
        </pre>
      )}
    </div>
  );
}
