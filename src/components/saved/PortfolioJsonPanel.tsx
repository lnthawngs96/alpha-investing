import type { Portfolio, StatusMessage } from '@/types';
import { formatPortfolioJson } from '@/utils/portfolioJson';
import { Button, Eyebrow, Notice } from '@/components/ui';
import { CheckIcon, CodeIcon, CopyIcon, PencilIcon, RefreshIcon, XIcon } from '@/components/icons';

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
  return (
    <div className="show-scrollbar flex flex-col gap-3 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>JSON portfolio</Eyebrow>
        <div className="flex flex-wrap items-center gap-2">
          {isEditingWeights ? (
            <>
              <Button
                size="sm"
                variant="success"
                icon={<CheckIcon size={13} strokeWidth={2.5} />}
                onClick={onApplyWeights}
                title="Chuẩn hoá tổng về 1.0 rồi lưu danh mục"
              >
                Áp dụng
              </Button>
              <Button size="sm" variant="secondary" icon={<XIcon size={13} />} onClick={onCancelWeights}>
                Hủy
              </Button>
            </>
          ) : isEditingJson ? (
            <>
              <Button
                size="sm"
                variant="success"
                icon={<CheckIcon size={13} strokeWidth={2.5} />}
                onClick={onApplyJson}
                title="Kiểm tra hợp lệ Tao/Alpha rồi lưu JSON"
              >
                Áp dụng JSON
              </Button>
              <Button size="sm" variant="secondary" icon={<XIcon size={13} />} onClick={onCancelJson}>
                Hủy
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="success"
                icon={copied ? <CheckIcon size={13} strokeWidth={2.5} /> : <CopyIcon size={13} />}
                onClick={onCopy}
                title="Copy JSON danh mục hiện tại"
              >
                {copied ? 'Đã copy' : 'Copy JSON'}
              </Button>
              <Button
                size="sm"
                variant="accent"
                icon={<RefreshIcon size={13} />}
                onClick={onRebalance}
                title="Rebalance random rồi normalize; tự tăng biên độ để khoảng cách tới danh mục khác ≥ ngưỡng dedupe"
              >
                Rebalance
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<PencilIcon size={13} />}
                onClick={onStartEditWeights}
                title={
                  'Sửa tỷ trọng / bỏ subnet — chọn subnet nhận lại phần tỷ trọng đã bỏ (mặc định chia đều cho tất cả subnet còn lại).\n' +
                  'Thêm subnet mới từ danh sách tăng trưởng cao nhất — tỷ trọng trích từ 10% của mỗi subnet trong top 10 lớn nhất.'
                }
                className="hover:border-accent hover:text-accent"
              >
                Sửa / thêm subnet
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<CodeIcon size={13} />}
                onClick={onStartEditJson}
                title="Sửa trực tiếp JSON danh mục"
                className="hover:border-accent hover:text-accent"
              >
                Sửa JSON
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
