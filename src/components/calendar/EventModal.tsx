import React, { useState, useEffect } from 'react';
import { X, Clock, Palette, FileText } from 'lucide-react';
import { CalendarEvent } from '../../types/calendar';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  initialDate?: Date;
  editEvent?: CalendarEvent;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialDate,
  editEvent
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setStartTime(editEvent.startTime.toTimeString().slice(0, 5));
      setEndTime(editEvent.endTime.toTimeString().slice(0, 5));
      setColor(editEvent.color);
      setDescription(editEvent.description || '');
      setIsAllDay(editEvent.isAllDay || false);
    } else if (initialDate) {
      setTitle('');
      setStartTime(initialDate.toTimeString().slice(0, 5));
      const endDate = new Date(initialDate);
      endDate.setHours(endDate.getHours() + 1);
      setEndTime(endDate.toTimeString().slice(0, 5));
      setColor('#3B82F6');
      setDescription('');
      setIsAllDay(false);
    }
  }, [editEvent, initialDate]);

  const handleSave = () => {
    if (!title.trim()) return;

    const baseDate = initialDate || (editEvent ? editEvent.startTime : new Date());
    const start = new Date(baseDate);
    const end = new Date(baseDate);

    if (!isAllDay) {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      start.setHours(startHour, startMinute, 0, 0);
      end.setHours(endHour, endMinute, 0, 0);
    } else {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    onSave({
      title: title.trim(),
      startTime: start,
      endTime: end,
      color,
      description: description.trim(),
      isAllDay
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
          <h2 className="text-lg font-semibold">
            {editEvent ? 'עריכת אירוע' : 'אירוע חדש'}
          </h2>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            שמירה
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כותרת
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="הזן כותרת לאירוע"
              dir="rtl"
            />
          </div>

          {/* All day toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">יום שלם</span>
            <button
              onClick={() => setIsAllDay(!isAllDay)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${isAllDay ? 'bg-blue-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${isAllDay ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Time selection */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-2" />
                  שעת התחלה
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock size={16} className="inline mr-2" />
                  שעת סיום
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Color selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Palette size={16} className="inline mr-2" />
              צבע
            </label>
            <div className="flex flex-wrap gap-3">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`
                    w-10 h-10 rounded-full border-2 transition-all
                    ${color === colorOption ? 'border-gray-800 scale-110' : 'border-gray-300'}
                  `}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="inline mr-2" />
              תיאור
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="הוסף תיאור לאירוע"
              dir="rtl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;