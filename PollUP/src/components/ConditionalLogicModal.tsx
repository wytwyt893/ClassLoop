import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ConditionalLogicModalProps {
  element: Doc<"elements">;
  availableElements: Doc<"elements">[];
  onClose: () => void;
}

export function ConditionalLogicModal({ element, availableElements, onClose }: ConditionalLogicModalProps) {
  const [enabled, setEnabled] = useState(element.conditionalLogic?.enabled || false);
  const [dependsOnElementId, setDependsOnElementId] = useState(element.conditionalLogic?.dependsOnElementId || "");
  const [condition, setCondition] = useState(element.conditionalLogic?.condition || "equals");
  const [value, setValue] = useState(element.conditionalLogic?.value || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateConditionalLogic = useMutation(api.elements.updateElementConditionalLogic);

  const dependentElement = availableElements.find(e => e._id === dependsOnElementId);

  const getConditionOptions = () => {
    if (!dependentElement) return [];

    switch (dependentElement.type) {
      case "text_input":
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Does not equal" },
          { value: "contains", label: "Contains" },
        ];
      case "number_input":
        return [
          { value: "equals", label: "Equals" },
          { value: "not_equals", label: "Does not equal" },
          { value: "greater_than", label: "Greater than" },
          { value: "less_than", label: "Less than" },
        ];
      case "single_choice":
      case "multiple_choice":
        return [
          { value: "choice_selected", label: "Choice is selected" },
          { value: "choice_not_selected", label: "Choice is not selected" },
        ];
      default:
        return [];
    }
  };

  const getValueInput = () => {
    if (!dependentElement) return null;

    if (dependentElement.type === "single_choice" || dependentElement.type === "multiple_choice") {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={enabled}
        >
          <option value="">Select a choice...</option>
          {dependentElement.choices?.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.text || "Image choice"}
            </option>
          ))}
        </select>
      );
    }

    if (dependentElement.type === "number_input") {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter number..."
          required={enabled}
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter text..."
        required={enabled}
      />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (enabled && (!dependsOnElementId || !condition || (getValueInput() && !value))) {
      toast.error("Please fill in all conditional logic fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateConditionalLogic({
        elementId: element._id,
        conditionalLogic: enabled ? {
          enabled,
          dependsOnElementId: dependsOnElementId as any,
          condition: condition as any,
          value: value || undefined,
        } : undefined,
      });

      toast.success("Conditional logic updated");
      onClose();
    } catch (error) {
      toast.error("Failed to update conditional logic");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Configure Conditional Logic</h2>
        <p className="text-sm text-gray-600 mb-4">
          Element: <strong>{element.title}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Enable conditional logic</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              When enabled, this element will only show if the condition is met
            </p>
          </div>

          {enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Show this element when:
                </label>
                <select
                  value={dependsOnElementId}
                  onChange={(e) => {
                    setDependsOnElementId(e.target.value);
                    setValue(""); // Reset value when changing dependent element
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an element...</option>
                  {availableElements.map((el) => (
                    <option key={el._id} value={el._id}>
                      {el.title}
                    </option>
                  ))}
                </select>
              </div>

              {dependentElement && (
                <>
                  <div>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {getConditionOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {getValueInput()}
                  </div>
                </>
              )}

              {availableElements.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No previous elements available. Add elements before this one to create conditional logic.
                </p>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
