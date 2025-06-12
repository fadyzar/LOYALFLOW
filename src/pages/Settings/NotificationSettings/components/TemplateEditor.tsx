import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { debounce } from 'lodash';

interface TemplateEditorProps {
  id: string;
  value: string;
  variables: Array<{ key: string; label: string }>;
  onChange: (value: string) => void;
  rows?: number;
}

export function TemplateEditor({ id, value, variables, onChange, rows = 4 }: TemplateEditorProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the onChange callback
  const debouncedOnChange = useCallback(
    debounce((value: string) => {
      onChange(value);
    }, 300),
    [onChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const insertVariable = (variable: string) => {
    const textArea = document.getElementById(id) as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const before = localValue.substring(0, start);
      const after = localValue.substring(end);
      const newValue = `${before}{{${variable}}}${after}`;
      
      setLocalValue(newValue);
      debouncedOnChange(newValue);

      // Set cursor position after the inserted variable
      requestAnimationFrame(() => {
        textArea.focus();
        const newPosition = start + variable.length + 4;
        textArea.setSelectionRange(newPosition, newPosition);
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Variables */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          משתנים זמינים
        </label>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <button
              key={variable.key}
              type="button"
              onClick={() => insertVariable(variable.key)}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm"
            >
              <Plus className="h-3 w-3" />
              <span>{variable.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message Content */}
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          תוכן ההודעה
        </label>
        <textarea
          id={id}
          value={localValue}
          onChange={handleChange}
          rows={rows}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          required
          dir="auto"
        />
      </div>
    </div>
  );
}