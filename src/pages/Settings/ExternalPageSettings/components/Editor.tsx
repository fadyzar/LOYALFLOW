import React from 'react';
import { motion } from 'framer-motion';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ComponentConfig, Section, EditorState } from '../types';
import { ComponentList } from './ComponentList';
import { SectionList } from './SectionList';
import { ComponentSettings } from './ComponentSettings';
import { Preview } from './Preview';

interface EditorProps {
  state: EditorState;
  onChange: (state: EditorState) => void;
}

export function Editor({ state, onChange }: EditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    onChange({
      ...state,
      selectedComponent: active.id as string
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // אם זה רכיב חדש מהרשימה
    if (typeof activeId === 'string' && activeId.startsWith('component-')) {
      const componentType = activeId.replace('component-', '');
      const sectionId = overId as string;

      // מצא את הסקשן המתאים
      const section = state.sections.find(s => s.id === sectionId);
      if (!section) return;

      // צור רכיב חדש
      const newComponent: ComponentConfig = {
        id: crypto.randomUUID(),
        type: componentType,
        label: `רכיב ${componentType} חדש`,
        icon: 'puzzle',
        settings: {
          marginTop: '4',
          marginBottom: '4',
          animation: 'fade',
          background: 'transparent'
        }
      };

      // עדכן את הסקשן
      const updatedSections = state.sections.map(s => 
        s.id === sectionId ? {
          ...s,
          components: [...s.components, newComponent]
        } : s
      );

      onChange({
        ...state,
        sections: updatedSections,
        selectedComponent: newComponent.id
      });
    }
    // אם זה רכיב קיים שמזיזים
    else {
      const updatedSections = [...state.sections];
      let sourceSection: Section | undefined;
      let sourceIndex = -1;
      let targetSection: Section | undefined;
      let targetIndex = -1;

      // מצא את הרכיב המקור
      for (const section of updatedSections) {
        const index = section.components.findIndex(c => c.id === activeId);
        if (index !== -1) {
          sourceSection = section;
          sourceIndex = index;
          break;
        }
      }

      // מצא את היעד
      for (const section of updatedSections) {
        const index = section.components.findIndex(c => c.id === overId);
        if (index !== -1) {
          targetSection = section;
          targetIndex = index;
          break;
        }
      }

      if (sourceSection && sourceIndex !== -1 && targetSection && targetIndex !== -1) {
        // הזז את הרכיב
        const [movedComponent] = sourceSection.components.splice(sourceIndex, 1);
        targetSection.components.splice(targetIndex, 0, movedComponent);

        onChange({
          ...state,
          sections: updatedSections
        });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-12 gap-6">
        {/* Component List */}
        <div className="col-span-3">
          <ComponentList />
        </div>

        {/* Sections */}
        <div className="col-span-6">
          <SortableContext items={state.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <SectionList sections={state.sections} />
          </SortableContext>
        </div>

        {/* Settings */}
        <div className="col-span-3">
          {state.selectedComponent && (
            <ComponentSettings
              componentId={state.selectedComponent}
              sections={state.sections}
              onChange={(updatedSections) => onChange({
                ...state,
                sections: updatedSections
              })}
            />
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="mt-8">
        <Preview sections={state.sections} />
      </div>
    </DndContext>
  );
}