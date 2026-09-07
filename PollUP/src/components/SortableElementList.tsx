import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { ElementCard } from "./ElementCard";
import { ConditionalLogicModal } from "./ConditionalLogicModal";
import { EditElementModal } from "./EditElementModal";
import { toast } from "sonner";

interface SortableElementListProps {
  elements: (Doc<"elements"> & { imageUrl?: string | null; choices?: any[] })[];
  sessionId: Id<"sessions">;
}

export function SortableElementList({ elements, sessionId }: SortableElementListProps) {
  const [selectedElementForConditional, setSelectedElementForConditional] = useState<Doc<"elements"> | null>(null);
  const [selectedElementForEdit, setSelectedElementForEdit] = useState<(Doc<"elements"> & { imageUrl?: string | null; choices?: any[] }) | null>(null);
  const moveElementUp = useMutation(api.elements.moveElementUp);
  const moveElementDown = useMutation(api.elements.moveElementDown);

  const handleMoveUp = async (elementId: Id<"elements">) => {
    try {
      const moved = await moveElementUp({ elementId });
      if (moved) {
        toast.success("Element moved up");
      } else {
        toast.info("Element is already at the top");
      }
    } catch (error) {
      toast.error("Failed to move element");
    }
  };

  const handleMoveDown = async (elementId: Id<"elements">) => {
    try {
      const moved = await moveElementDown({ elementId });
      if (moved) {
        toast.success("Element moved down");
      } else {
        toast.info("Element is already at the bottom");
      }
    } catch (error) {
      toast.error("Failed to move element");
    }
  };

  return (
    <>
      <div className="space-y-4">
        {elements.map((element, index) => (
          <div key={element._id} className="flex items-start gap-2">
            {/* Move buttons - hidden on very small screens, shown as compact buttons */}
            <div className="hidden sm:flex flex-col gap-1 pt-2">
              <button
                onClick={() => handleMoveUp(element._id)}
                disabled={index === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-gray-200"
                title="Move up"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => handleMoveDown(element._id)}
                disabled={index === elements.length - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-gray-200"
                title="Move down"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Element card */}
            <div className="flex-1 min-w-0">
              <ElementCard element={element} onEdit={() => setSelectedElementForEdit(element)} />
              
              {/* Conditional logic indicator and mobile move buttons */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {element.conditionalLogic?.enabled && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">
                      Conditional
                    </span>
                  )}
                  
                  {/* Mobile move buttons */}
                  <div className="flex sm:hidden items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(element._id)}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-gray-200"
                      title="Move up"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(element._id)}
                      disabled={index === elements.length - 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-gray-200"
                      title="Move down"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedElementForConditional(element)}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Configure Logic</span>
                  <span className="sm:hidden">Logic</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedElementForConditional && (
        <ConditionalLogicModal
          element={selectedElementForConditional}
          availableElements={elements.filter((e: Doc<"elements">) => 
            e.order < selectedElementForConditional.order && e._id !== selectedElementForConditional._id
          )}
          onClose={() => setSelectedElementForConditional(null)}
        />
      )}

      {selectedElementForEdit && (
        <EditElementModal
          element={selectedElementForEdit}
          onClose={() => setSelectedElementForEdit(null)}
        />
      )}
    </>
  );
}
