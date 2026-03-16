import { cn } from '@/lib/utils';

export function ProgressBar({ value, completed = false, urgent = false, compact = false, label }: { value: number; completed?: boolean; urgent?: boolean; compact?: boolean; label?: string }) {
  return (
    <div className={cn('progress-wrap', compact && 'compact')}>
      {label ? (
        <div className="progress-label-row">
          <span className="small">{label}</span>
          <strong>{value}%</strong>
        </div>
      ) : null}
      <div className={cn('progress', completed && 'completed', urgent && 'urgent')}>
        <span style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
