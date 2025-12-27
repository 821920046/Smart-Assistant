import React from 'react';

interface GaugeProps {
  value: number;
  max: number;
  title: string;
  color?: string;
  centerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  className?: string;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  max,
  title,
  color = "#6366F1",
  centerContent,
  footerContent,
  className = ""
}) => {
  const radius = 70;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  const percent = max === 0 ? 0 : Math.min(value / max, 1);
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-between h-full ${className}`}>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2 w-full text-center truncate">{title}</h3>

      <div className="relative flex items-center justify-center my-2">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="#F3F4F6"
            className="dark:stroke-slate-700"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerContent}
        </div>
      </div>

      <div className="mt-2 w-full">
        {footerContent}
      </div>
    </div>
  );
};
