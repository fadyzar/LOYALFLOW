import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DivideIcon as LucideIcon, ChevronLeft, Check, X, Loader2, Copy, ExternalLink } from 'lucide-react';

interface SettingItemProps {
  title: string;
  value: string | undefined;
  icon: LucideIcon;
  field?: string;
  editable?: boolean;
  copyable?: boolean;
  openInNew?: boolean;
  type?: 'text' | 'toggle' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  currentValue?: boolean | string;
  isLoading?: boolean;
  onEdit?: (field: string, value: string) => void;
  onCopy?: (value: string | undefined) => void;
  onOpen?: (value: string | undefined) => void;
}

export function SettingItem({
  title,
  value,
  icon: Icon,
  field,
  editable = false,
  copyable = false,
  openInNew = false,
  type = 'text',
  options = [],
  placeholder,
  currentValue,
  isLoading = false,
  onEdit,
  onCopy,
  onOpen
}: SettingItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = () => {
    if (editable && field) {
      setIsEditing(true);
      setEditValue(type === 'toggle' ? currentValue?.toString() || 'false' : value || '');
    }
  };

  const handleSave = () => {
    if (onEdit && field) {
      onEdit(field, editValue);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-500" />
        <span className="font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {type === 'toggle' ? (
              <button
                onClick={() => setEditValue(editValue === 'true' ? 'false' : 'true')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  editValue === 'true' ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editValue === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            ) : type === 'select' ? (
              <select
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder={placeholder}
              />
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSave}
              disabled={isLoading}
              className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCancel}
              className="p-1 text-red-600 hover:text-red-700"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center max-w-[120px] overflow-hidden">
              <span className="text-gray-600 truncate block" title={value || '---'}>
                {value || '---'}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {copyable && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onCopy?.(value)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </motion.button>
              )}
              {openInNew && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onOpen?.(value)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </motion.button>
              )}
            </div>
            {editable && (
              <ChevronLeft
                onClick={handleStartEdit}
                className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}