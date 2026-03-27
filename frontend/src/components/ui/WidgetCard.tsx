import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Reusable Widget Card component for a modular dashboard layout.
 */
interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  children: ReactNode;
  className?: string;
  titleLayoutId?: string;
  headerAction?: ReactNode;
}

const WidgetCard: React.FC<WidgetCardProps> = ({ 
  title, 
  icon: Icon, 
  iconColor, 
  children,
  className = "",
  titleLayoutId,
  headerAction
}) => (
  <div className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}>
    <div className="flex justify-between items-start mb-4">
      <motion.h3 
        layoutId={titleLayoutId}
        className="font-semibold text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider"
      >
        {title}
      </motion.h3>
      <div className="flex items-center space-x-2">
        {headerAction}
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
    </div>
    {children}
  </div>
);

export default WidgetCard;
