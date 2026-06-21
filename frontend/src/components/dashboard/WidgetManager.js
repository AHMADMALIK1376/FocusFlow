import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../../preferences/usePreferences';
import { WIDGETS } from '../../dashboard/registry';
import { Switch } from '../ui';

function SortableWidgetRow({ widget, enabled, onToggle }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-3 px-4 bg-surface rounded-token-md shadow-neu-sm mb-2 cursor-default"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="text-muted/60 hover:text-muted cursor-grab active:cursor-grabbing p-1 focus-visible:outline-none"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>

      <span className="text-lg">{widget.icon}</span>

      <span className="flex-1 text-sm font-bold text-ink">
        {t(widget.titleKey, { defaultValue: widget.titleKey.split('.').pop() })}
      </span>

      <Switch
        checked={Boolean(enabled)}
        onChange={() => onToggle(widget.id)}
        label={`Toggle ${widget.id}`}
      />
    </div>
  );
}

export default function WidgetManager() {
  const { activeDashboard, toggleWidget, reorderWidgets } = usePreferences();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!activeDashboard) return null;

  const { order, enabled } = activeDashboard.widgets;

  // Build display order: ordered known ids first, then any extras
  const knownIds = WIDGETS.map((w) => w.id);
  const orderedIds = [
    ...order.filter((id) => knownIds.includes(id)),
    ...knownIds.filter((id) => !order.includes(id)),
  ];

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(active.id);
    const newIndex = orderedIds.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderWidgets(arrayMove(orderedIds, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
        {orderedIds.map((id) => {
          const widget = WIDGETS.find((w) => w.id === id);
          if (!widget) return null;
          return (
            <SortableWidgetRow
              key={id}
              widget={widget}
              enabled={enabled[id]}
              onToggle={toggleWidget}
            />
          );
        })}
      </SortableContext>
    </DndContext>
  );
}
