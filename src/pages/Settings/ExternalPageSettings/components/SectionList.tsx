import React from 'react';
import { motion } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import { Section } from '../types';
import { Trash2, Settings, Move } from 'lucide-react';

interface SectionListProps {
  sections: Section[];
  onDeleteComponent?: (sectionId: string, componentId: string) => void;
  onEditComponent?: (sectionId: string, componentId: string) => void;
}

export function SectionList({ sections, onDeleteComponent, onEditComponent }: SectionListProps) {
  return (
    <div className="space-y-6">
      <h3 className="font-medium">מבנה הדף</h3>
      <div className="space-y-6">
        {sections.map((section) => (
          <SectionDropZone 
            key={section.id} 
            section={section}
            onDeleteComponent={onDeleteComponent}
            onEditComponent={onEditComponent}
          />
        ))}
      </div>
    </div>
  );
}

function SectionDropZone({ 
  section,
  onDeleteComponent,
  onEditComponent 
}: { 
  section: Section;
  onDeleteComponent?: (sectionId: string, componentId: string) => void;
  onEditComponent?: (sectionId: string, componentId: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: section.id
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h4 className="font-medium">{section.label}</h4>
      </div>
      
      <div ref={setNodeRef} className="p-4">
        {section.components.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
            <p className="text-sm text-gray-500">גרור רכיבים לכאן</p>
          </div>
        ) : (
          <div className="space-y-2">
            {section.components.map((component) => (
              <motion.div
                key={component.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group"
                whileHover={{ scale: 1.02 }}
              >
                <div className="p-2 bg-white rounded-lg">
                  <Move className="h-4 w-4 text-gray-400 cursor-move" />
                </div>
                
                <div className="flex-1">
                  <h5 className="font-medium">{component.label}</h5>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onEditComponent && (
                    <button
                      onClick={() => onEditComponent(section.id, component.id)}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                  
                  {onDeleteComponent && (
                    <button
                      onClick={() => onDeleteComponent(section.id, component.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}