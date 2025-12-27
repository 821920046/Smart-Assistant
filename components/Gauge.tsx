import React from 'react';

interface GaugeProps {
  value: number;       // 当前完成数
  total: number;       // 总数
  title: string;
  subtitle?: string;
  color?: string;      // 主色
  emptyText?: string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  total,
  title,
  subtitle,
  color = "#6366F1", // indigo-500
  emptyText = "No tasks"
}) => {
  const radius = 72;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const percent = total === 0 ? 0 : Math.min(value / total, 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-200">{title}</h3>

      <div className="relative flex flex-col items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          {/* background */}
          <circle
            stroke="#E5E7EB"
            className="dark:stroke-slate-700"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />

          {/* progress */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">
            {total === 0 ? "0" : `${value}/${total}`}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {total === 0 ? emptyText : "Tasks"}
          </div>
        </div>
      </div>

      {subtitle && (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 text-center">
          {subtitle}
        </p>
      )}
    </div>
  );
};
