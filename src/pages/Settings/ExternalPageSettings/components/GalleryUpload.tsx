import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Upload, X, Plus } from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
}

interface GalleryUploadProps {
  businessId: string;
  items: GalleryItem[];
  onChange: (items: GalleryItem[]) => void;
}

function SortableItem({ item }: { item: GalleryItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-move"
    >
      {item.type === 'video' ? (
        <video
          src={item.url}
          className="w-full h-full object-cover"
          controls
          muted
        />
      ) : (
        <img
          src={item.url}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute top-2 right-2">
        <div className={`p-1 rounded-lg ${
          item.type === 'video' ? 'bg-blue-500' : 'bg-green-500'
        } text-white`}>
          {item.type === 'video' ? (
            <Video className="h-4 w-4" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryUpload({ businessId, items, onChange }: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newItems: GalleryItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // בדיקת גודל קובץ
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`הקובץ ${file.name} גדול מדי (מקסימום 20MB)`);
          continue;
        }

        // בדיקת סוג קובץ
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        
        if (!isVideo && !isImage) {
          toast.error(`הקובץ ${file.name} אינו בפורמט נתמך`);
          continue;
        }

        // העלאת הקובץ
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
        const filePath = `${businessId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('external_page')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('external_page')
          .getPublicUrl(filePath);

        newItems.push({
          id: crypto.randomUUID(),
          type: isVideo ? 'video' : 'image',
          url: data.publicUrl
        });
      }

      // עדכון הרשימה
      onChange([...items, ...newItems]);
      toast.success('הקבצים הועלו בהצלחה');
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('שגיאה בהעלאת הקבצים');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      
      const newItems = [...items];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      
      onChange(newItems);
    }
  };

  const handleDelete = async (itemToDelete: GalleryItem) => {
    try {
      // מחיקת הקובץ מהאחסון
      const fileName = itemToDelete.url.split('/').pop();
      if (fileName) {
        const { error: deleteError } = await supabase.storage
          .from('external_page')
          .remove([`${businessId}/${fileName}`]);

        if (deleteError) throw deleteError;
      }

      // מחיקה מהרשימה
      onChange(items.filter(item => item.id !== itemToDelete.id));
      toast.success('הפריט נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('שגיאה במחיקת הפריט');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>מעלה...</span>
            </>
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span>העלה תמונות וסרטונים</span>
            </>
          )}
        </motion.button>
        <p className="mt-2 text-sm text-gray-500 text-center">
          ניתן להעלות תמונות וסרטונים עד 20MB
        </p>
      </div>

      {/* Gallery Grid */}
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <SortableItem item={item} />
                <button
                  onClick={() => handleDelete(item)}
                  className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}