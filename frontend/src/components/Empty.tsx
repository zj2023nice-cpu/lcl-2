import { cn } from '@/lib/utils';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function Empty({
  title = '暂无数据',
  description,
  icon,
  className,
}: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      {icon && (
        <div className="mb-4 opacity-50">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-theme-text mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-theme-text-muted text-center max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}
