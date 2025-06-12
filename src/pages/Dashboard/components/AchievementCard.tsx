import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface AchievementCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  progress: number;
}

export function AchievementCard({ title, value, icon: Icon, color, bg, progress }: AchievementCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-white/50 p-3 shadow-sm text-right transform hover:scale-[1.02] transition-transform">
      <div className={`${bg} ${color} p-2 rounded-xl w-fit mb-2`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-gray-600">{title}</p>
      <p className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
        {value}
      </p>
      
      <div 
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-1000"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}