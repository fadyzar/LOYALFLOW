import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickActionProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  path: string;
  gradient: string;
}

export function QuickAction({ title, subtitle, icon: Icon, path, gradient }: QuickActionProps) {
  return (
    <Link to={path}>
      <div className={`bg-gradient-to-br ${gradient} p-4 rounded-2xl text-white relative overflow-hidden transform hover:scale-[1.02] transition-transform`}>
        <div className="bg-white/20 p-3 rounded-xl w-fit mb-2">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-white/80">{subtitle}</p>
      </div>
    </Link>
  );
}