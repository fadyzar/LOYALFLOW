import React from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Image, Type, Users, Calendar, MapPin, Phone, Mail, Facebook, Instagram, Apple as WhatsApp, Scissors, Package, Clock, Star } from 'lucide-react';

const components = [
  {
    category: 'תוכן',
    items: [
      { id: 'heading', label: 'כותרת', icon: Type },
      { id: 'text', label: 'טקסט', icon: Type },
      { id: 'image', label: 'תמונה', icon: Image },
      { id: 'gallery', label: 'גלריה', icon: Image }
    ]
  },
  {
    category: 'שירותים',
    items: [
      { id: 'services', label: 'רשימת שירותים', icon: Scissors },
      { id: 'products', label: 'מוצרים', icon: Package },
      { id: 'pricing', label: 'מחירון', icon: Star },
      { id: 'hours', label: 'שעות פעילות', icon: Clock }
    ]
  },
  {
    category: 'צוות',
    items: [
      { id: 'staff', label: 'אנשי צוות', icon: Users },
      { id: 'staff-member', label: 'איש צוות בודד', icon: Users }
    ]
  },
  {
    category: 'הזמנות',
    items: [
      { id: 'booking', label: 'הזמנת תור', icon: Calendar },
      { id: 'availability', label: 'לוח זמנים', icon: Calendar }
    ]
  },
  {
    category: 'יצירת קשר',
    items: [
      { id: 'contact-form', label: 'טופס יצירת קשר', icon: Mail },
      { id: 'contact-info', label: 'פרטי התקשרות', icon: Phone },
      { id: 'map', label: 'מפה', icon: MapPin },
      { id: 'social', label: 'רשתות חברתיות', icon: Facebook }
    ]
  }
];

function DraggableComponent({ id, label, icon: Icon }: { id: string; label: string; icon: any }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `component-${id}`
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform)
  } : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 cursor-move hover:border-indigo-200 transition-colors"
    >
      <div className="p-2 bg-indigo-50 rounded-lg">
        <Icon className="h-4 w-4 text-indigo-600" />
      </div>
      <span className="font-medium">{label}</span>
    </motion.div>
  );
}

export function ComponentList() {
  return (
    <div className="space-y-6">
      <h3 className="font-medium">רכיבים זמינים</h3>
      {components.map((category) => (
        <div key={category.category} className="space-y-3">
          <h4 className="text-sm font-medium text-gray-500">{category.category}</h4>
          <div className="space-y-2">
            {category.items.map((component) => (
              <DraggableComponent
                key={component.id}
                id={component.id}
                label={component.label}
                icon={component.icon}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}