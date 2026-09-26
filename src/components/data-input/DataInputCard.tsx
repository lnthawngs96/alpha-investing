import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SubnetRow } from '@/types';
import { SAMPLE_SUBNETS } from '@/constants/sampleSubnets';
import { fetchAssetsDeregList } from '@/utils/fetchDeregList';
import { parseSubnetInput } from '@/utils/subnetData';
import { cn } from '@/utils/classNames';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { CheckIcon, ChevronIcon, PlayIcon, SparklesIcon, XIcon } from '@/components/icons';

export interface DataInputCardProps {
  onSubmit: (data: SubnetRow[], deregIds: number[]) => void;
  onClear: () => void;
  /** Số subnet đang nạp (để hiện badge trên header). */
  loadedCount: number;
}

const PLACEHOLDER = `[
  { "netuid": 1, "name": "...", "price_change_1_hour": "1.2", "fear_and_greed_index": 42, ... },
  { "netuid": 2, ... }
]`;

type DeregLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Card nhập dữ liệu: dán JSON subnet. Dereg list lấy thẳng từ
 * api.investing88.ai/assets (chỉ hiển thị, không cần điền) và bị loại khỏi
 * bảng khi submit.
 */
export function DataInputCard({ onSubmit, onClear, loadedCount }: DataInputCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [deregIds, setDeregIds] = useState<number[]>([]);
  const [deregLoad, setDeregLoad] = useState<DeregLoadState>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    setDeregLoad('loading');
    fetchAssetsDeregList(ac.signal)
      .then((ids) => {
        setDeregIds(ids);
        setDeregLoad('ready');
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setDeregLoad('error');
        console.warn('Không tải được dereg list từ assets:', err);
      });
    return () => ac.abort();
  }, []);

  function handleInput(e: FormEvent<HTMLTextAreaElement>) {
    setCharCount(e.currentTarget.value.length);
    setError('');
  }

  function handleSubmit() {
    const raw = textareaRef.current?.value.trim() ?? '';
    try {
      const parsed = parseSubnetInput(raw);
      setError('');
      setCollapsed(true);
      onSubmit(parsed, deregIds);
    } catch (e) {
      setError('⚠ ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  function handleLoadSample() {
    const text = JSON.stringify(SAMPLE_SUBNETS, null, 2);
    if (textareaRef.current) textareaRef.current.value = text;
    setCharCount(text.length);
    setError('');
    setCollapsed(true);
    onSubmit([...SAMPLE_SUBNETS], deregIds);
  }

  function handleClear() {
    if (textareaRef.current) textareaRef.current.value = '';
    setCharCount(0);
    setError('');
    setCollapsed(false);
    onClear();
  }

  const deregHint =
    deregLoad === 'loading'
      ? 'Đang tải từ api.investing88.ai/assets…'
      : deregLoad === 'ready'
        ? 'Đã lấy từ api.investing88.ai/assets'
        : deregLoad === 'error'
          ? 'Không tải được API — dereg rỗng'
          : 'Lấy từ api.investing88.ai/assets khi mở app';

  return (
    <Card className="overflow-hidden animate-slide-up">
      <CardHeader
        divided={!collapsed}
        className="cursor-pointer select-none hover:bg-surface-raised"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <ChevronIcon size={15} open={!collapsed} className="text-accent" />
          <span className="eyebrow">Data input</span>
          {loadedCount > 0 && (
            <Badge tone="positive" className="animate-scale-in">
              <CheckIcon size={11} strokeWidth={2.5} />
              {loadedCount} subnets
            </Badge>
          )}
        </div>
        <span className="text-[11px] text-fg-faint">Paste JSON array hoặc single object</span>
      </CardHeader>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="p-5">
            <textarea
              ref={textareaRef}
              className={cn(
                'field w-full min-h-40 resize-y font-mono text-code leading-relaxed p-3',
                error && 'border-negative animate-shake'
              )}
              placeholder={PLACEHOLDER}
              onInput={handleInput}
              spellCheck={false}
            />

            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="eyebrow">Dereg list</span>
                <span
                  className={cn(
                    'text-[11px]',
                    deregLoad === 'error' ? 'text-negative' : 'text-fg-faint'
                  )}
                >
                  {deregHint}
                </span>
              </div>
              <p className="font-mono text-code leading-relaxed text-fg-muted">
                {deregLoad === 'loading'
                  ? '…'
                  : deregLoad === 'error'
                    ? '—'
                    : JSON.stringify(deregIds)}
              </p>
            </div>

            {error && <div className="mt-2 text-xs text-negative animate-slide-down">{error}</div>}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={<PlayIcon size={12} />} onClick={handleSubmit}>
                Submit data
              </Button>
              <Button
                variant="accent"
                icon={<SparklesIcon size={14} animated />}
                onClick={handleLoadSample}
                title="Nạp 40 subnet mẫu (dữ liệu hư cấu) để dùng thử ngay"
              >
                Load sample data
              </Button>
              {loadedCount > 0 && (
                <Button
                  variant="secondary"
                  icon={<XIcon size={13} />}
                  onClick={handleClear}
                  className="hover:text-negative hover:border-negative"
                >
                  Clear
                </Button>
              )}
              <span className="ml-auto text-[11px] tabular-nums text-fg-faint">{charCount} ký tự</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
