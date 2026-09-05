import { formatMetric } from '../utils/helpers';

export default function ChipList({ subnets, metricField, className }) {
  return (
    <div className={className || 'flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto'}>
      {subnets.map((s) => {
        const val = metricField ? parseFloat(s[metricField]) : NaN;
        const hasVal = !isNaN(val);
        return (
          <div
            key={s.netuid}
            className="flex items-center gap-4 px-4 py-4 bg-slate-800 border border-slate-700 rounded-lg"
          >
            <span className="text-xs font-bold text-violet-500 min-w-[32px]">
              #{s.netuid}
            </span>
            <span className="text-xs text-slate-100 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {s.name || 'Unknown'}
            </span>
            {hasVal && (
              <span className={`text-xs font-bold shrink-0 ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatMetric(val, metricField)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
