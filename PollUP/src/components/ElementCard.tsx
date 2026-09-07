import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ElementCardProps {
  element: any; // Using any for now to handle the complex type from the query
  onEdit?: () => void;
  onDuplicate?: () => void;
}

export function ElementCard({ element, onEdit, onDuplicate }: ElementCardProps) {
  const deleteElement = useMutation(api.elements.deleteElement);
  const duplicateElement = useMutation(api.elements.duplicateElement);

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this element? This will delete all responses.")) {
      try {
        await deleteElement({ elementId: element._id });
        toast.success("Element deleted");
      } catch (error) {
        toast.error("Failed to delete element");
      }
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateElement({ elementId: element._id });
      toast.success("Element duplicated");
      if (onDuplicate) onDuplicate();
    } catch (error) {
      toast.error("Failed to duplicate element");
    }
  };

  const getElementTypeLabel = (type: string) => {
    switch (type) {
      case "single_choice": return "Single Choice";
      case "multiple_choice": return "Multiple Choice";
      case "text_input": return "Text Input";
      case "number_input": return "Number Input";
      case "file_upload": return "File Upload";
      default: return type;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
      {/* Align edit buttons right */}

      {/* Title and content */}
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">
          {element.title}
        </h3>
        <span className="px-2.5 py-1 pb-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
          {getElementTypeLabel(element.type)}
        </span>
        {element.subtitle && (
          <p className="text-gray-700 py-2 text-sm mb-1 break-words">{element.subtitle}</p>
        )}
        {element.description && (
          <p className="text-gray-600 text-xs sm:text-sm break-words">{element.description}</p>
        )}
      </div>

      {element.imageUrl && (
        <div className="mb-4">
          <img
            src={element.imageUrl}
            alt="Element image"
            className="max-w-full sm:max-w-xs max-h-48 object-cover rounded-lg"
          />
        </div>
      )}

      {element.choices && element.choices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Choices:</h4>
          <div className="space-y-2">
            {element.choices.map((choice: any) => (
              <div key={choice.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                {choice.imageUrl ? (
                  <img
                    src={choice.imageUrl}
                    alt="Choice image"
                    className="w-8 h-8 object-cover rounded flex-shrink-0"
                  />
                ) : null}
                <span className="text-sm break-words flex-1 min-w-0">{choice.text || "Image choice"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {element.type === "number_input" && (
        <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
          <span className="font-semibold">Range:</span> {element.minValue ?? 0} - {element.maxValue ?? 100}
          {element.step && ` (step: ${element.step})`}
        </div>
      )}
      <div className="flex items-end justify-center gap-3 mt-3 mb-1">
        <div className="flex items-end justify-end gap-1.5 flex-shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all"
              title="Edit element"
            >
              Edit
            </button>
          )}
          <button
            onClick={handleDuplicate}
            className="px-2.5 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-all"
            title="Duplicate element"
          >
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="px-2.5 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-all"
            title="Delete element"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
    
  );
}
