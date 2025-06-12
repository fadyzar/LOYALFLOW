import React from 'react';
import { motion } from 'framer-motion';
import { Section } from '../types';
import { X, Sliders, Palette, Layout, Type } from 'lucide-react';

interface ComponentSettingsProps {
  componentId: string;
  sections: Section[];
  onChange: (sections: Section[]) => void;
  onClose?: () => void;
}

export function ComponentSettings({ componentId, sections, onChange, onClose }: ComponentSettingsProps) {
  // מצא את הרכיב הנבחר
  let selectedComponent;
  let sectionId;
  for (const section of sections) {
    const component = section.components.find(c => c.id === componentId);
    if (component) {
      selectedComponent = component;
      sectionId = section.id;
      break;
    }
  }

  if (!selectedComponent) {
    return null;
  }

  const handleSettingChange = (key: string, value: any) => {
    const updatedSections = sections.map(section => ({
      ...section,
      components: section.components.map(component => 
        component.id === componentId ? {
          ...component,
          settings: {
            ...component.settings,
            [key]: value
          }
        } : component
      )
    }));

    onChange(updatedSections);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Sliders className="h-4 w-4 text-indigo-600" />
          </div>
          <h3 className="font-medium">הגדרות רכיב</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* הגדרות ספציפיות לכל סוג רכיב */}
        {selectedComponent.type === 'heading' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                טקסט
              </label>
              <input
                type="text"
                value={selectedComponent.settings.text || ''}
                onChange={(e) => handleSettingChange('text', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="הזן כותרת..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                גודל
              </label>
              <select
                value={selectedComponent.settings.size || 'lg'}
                onChange={(e) => handleSettingChange('size', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="sm">קטן</option>
                <option value="base">רגיל</option>
                <option value="lg">גדול</option>
                <option value="xl">גדול מאוד</option>
                <option value="2xl">ענק</option>
              </select>
            </div>
          </div>
        )}

        {selectedComponent.type === 'text' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תוכן
            </label>
            <textarea
              value={selectedComponent.settings.content || ''}
              onChange={(e) => handleSettingChange('content', e.target.value)}
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="הזן טקסט..."
            />
          </div>
        )}

        {selectedComponent.type === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                כתובת תמונה
              </label>
              <input
                type="text"
                value={selectedComponent.settings.url || ''}
                onChange={(e) => handleSettingChange('url', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="הזן כתובת URL של תמונה"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יחס גובה-רוחב
              </label>
              <select
                value={selectedComponent.settings.aspect || '16/9'}
                onChange={(e) => handleSettingChange('aspect', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="1/1">ריבוע (1:1)</option>
                <option value="4/3">סטנדרטי (4:3)</option>
                <option value="16/9">רחב (16:9)</option>
                <option value="21/9">פנורמי (21:9)</option>
              </select>
            </div>
          </div>
        )}

        {/* הגדרות עיצוב כלליות */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span>פריסה</span>
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מרווח עליון
            </label>
            <select
              value={selectedComponent.settings.marginTop || '4'}
              onChange={(e) => handleSettingChange('marginTop', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="0">ללא</option>
              <option value="2">קטן</option>
              <option value="4">בינוני</option>
              <option value="6">גדול</option>
              <option value="8">גדול מאוד</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מרווח תחתון
            </label>
            <select
              value={selectedComponent.settings.marginBottom || '4'}
              onChange={(e) => handleSettingChange('marginBottom', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="0">ללא</option>
              <option value="2">קטן</option>
              <option value="4">בינוני</option>
              <option value="6">גדול</option>
              <option value="8">גדול מאוד</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              רוחב
            </label>
            <select
              value={selectedComponent.settings.width || 'full'}
              onChange={(e) => handleSettingChange('width', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="full">מלא</option>
              <option value="3/4">75%</option>
              <option value="1/2">50%</option>
              <option value="1/4">25%</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>עיצוב</span>
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              רקע
            </label>
            <select
              value={selectedComponent.settings.background || 'transparent'}
              onChange={(e) => handleSettingChange('background', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="transparent">שקוף</option>
              <option value="white">לבן</option>
              <option value="gray">אפור</option>
              <option value="primary">צבע ראשי</option>
              <option value="secondary">צבע משני</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              אנימציה
            </label>
            <select
              value={selectedComponent.settings.animation || 'none'}
              onChange={(e) => handleSettingChange('animation', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="none">ללא</option>
              <option value="fade">הופעה הדרגתית</option>
              <option value="slide">החלקה</option>
              <option value="scale">גדילה</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span>טיפוגרפיה</span>
          </h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              יישור טקסט
            </label>
            <select
              value={selectedComponent.settings.textAlign || 'right'}
              onChange={(e) => handleSettingChange('textAlign', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="right">ימין</option>
              <option value="center">מרכז</option>
              <option value="left">שמאל</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              צבע טקסט
            </label>
            <select
              value={selectedComponent.settings.textColor || 'default'}
              onChange={(e) => handleSettingChange('textColor', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="default">ברירת מחדל</option>
              <option value="primary">צבע ראשי</option>
              <option value="secondary">צבע משני</option>
              <option value="white">לבן</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}