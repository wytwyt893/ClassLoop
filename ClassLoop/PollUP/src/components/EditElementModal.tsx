import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface EditElementModalProps {
  element: Doc<"elements"> & { imageUrl?: string | null; choices?: any[] };
  onClose: () => void;
}

type ElementType = "single_choice" | "single_choice_unique" | "multiple_choice" | "text_input" | "number_input" | "file_upload";

interface Choice {
  id: string;
  text: string;
  imageFile?: File;
  imageId?: Id<"_storage">;
  isCorrect?: boolean;
}

export function EditElementModal({ element, onClose }: EditElementModalProps) {
  const [title, setTitle] = useState(element.title);
  const [subtitle, setSubtitle] = useState(element.subtitle || "");
  const [description, setDescription] = useState(element.description || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [choices, setChoices] = useState<Choice[]>(() => {
    if (element.choices && element.choices.length > 0) {
      return element.choices.map(c => ({
        id: c.id,
        text: c.text || "",
        imageId: c.imageId,
        isCorrect: c.isCorrect,
      }));
    }
    return [
      { id: "1", text: "" },
      { id: "2", text: "" }
    ];
  });
  const [minValue, setMinValue] = useState(element.minValue ?? 0);
  const [maxValue, setMaxValue] = useState(element.maxValue ?? 100);
  const [step, setStep] = useState(element.step ?? 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateElement = useMutation(api.elements.updateElement);
  const generateUploadUrl = useMutation(api.elements.generateUploadUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const type = element.type;

  const addChoice = () => {
    setChoices([...choices, { id: Date.now().toString(), text: "" }]);
  };

  const removeChoice = (id: string) => {
    if (choices.length > 2) {
      setChoices(choices.filter(c => c.id !== id));
    }
  };

  const updateChoice = (id: string, text: string) => {
    setChoices(choices.map(c => c.id === id ? { ...c, text } : c));
  };

  const updateChoiceImage = (id: string, file: File) => {
    setChoices(choices.map(c => c.id === id ? { ...c, imageFile: file } : c));
  };

  const toggleChoiceCorrect = (id: string) => {
    setChoices(choices.map(c => c.id === id ? { ...c, isCorrect: !c.isCorrect } : c));
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      
      // Extract first column from each row
      const newChoices: Choice[] = lines.map((line, index) => {
        const firstColumn = line.split(',')[0].trim();
        return {
          id: Date.now().toString() + '_' + index,
          text: firstColumn,
        };
      }).filter(choice => choice.text); // Remove empty choices
      
      if (newChoices.length === 0) {
        toast.error("No valid choices found in CSV");
        return;
      }
      
      setChoices(newChoices);
      toast.success(`Imported ${newChoices.length} choices from CSV`);
    } catch (error) {
      toast.error("Failed to parse CSV file");
    }
  };

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });
    const json = await result.json();
    if (!result.ok) {
      throw new Error(`Upload failed: ${JSON.stringify(json)}`);
    }
    return json.storageId;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Upload main image if a new one is provided
      let imageId: Id<"_storage"> | undefined = element.imageId;
      if (imageFile) {
        imageId = await uploadFile(imageFile);
      }

      // Upload choice images and prepare choices data
      let choicesData;
      if (type === "single_choice" || type === "single_choice_unique" || type === "multiple_choice") {
        choicesData = await Promise.all(
          choices.map(async (choice) => {
            let choiceImageId: Id<"_storage"> | undefined = choice.imageId;
            if (choice.imageFile) {
              choiceImageId = await uploadFile(choice.imageFile);
            }
            return {
              id: choice.id,
              text: choice.text.trim() || undefined,
              imageId: choiceImageId,
              isCorrect: choice.isCorrect || undefined,
            };
          })
        );
        // Filter out empty choices
        choicesData = choicesData.filter(c => c.text || c.imageId);
      }

      await updateElement({
        elementId: element._id,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        description: description.trim() || undefined,
        imageId,
        choices: choicesData,
        minValue: type === "number_input" ? minValue : undefined,
        maxValue: type === "number_input" ? maxValue : undefined,
        step: type === "number_input" ? step : undefined,
      });

      toast.success("Element updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to update element");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getElementTypeLabel = (type: string) => {
    switch (type) {
      case "single_choice": return "Single Choice";
      case "single_choice_unique": return "Single Choice - Unique Answers";
      case "multiple_choice": return "Multiple Choice";
      case "text_input": return "Text Input";
      case "number_input": return "Number Input";
      case "file_upload": return "File Upload";
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-end" onClick={onClose}>
      <div 
        className="bg-white w-full h-full md:max-w-2xl md:h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-8 py-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Element</h2>
            <p className="text-sm text-gray-500 mt-0.5">Update your interactive content</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-all hover:scale-105"
            title="Close"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-8 py-6">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Element Type
            </label>
            <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600 text-base">
              {getElementTypeLabel(type)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Element type cannot be changed after creation</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              placeholder="What do you want to ask?"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Subtitle <span className="text-gray-400 text-xs normal-case">(Optional)</span>
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              placeholder="Add additional context"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Description <span className="text-gray-400 text-xs normal-case">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base resize-none"
              placeholder="Provide detailed instructions or information"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Image <span className="text-gray-400 text-xs normal-case">(Optional)</span>
            </label>
            {element.imageUrl && !imageFile && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <img src={element.imageUrl} alt="Current" className="max-w-xs max-h-32 object-cover rounded-lg" />
                <p className="text-xs text-gray-500 mt-2">Current image • Upload a new one to replace</p>
              </div>
            )}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          {(type === "single_choice" || type === "single_choice_unique" || type === "multiple_choice") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Choices
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleCsvUpload(file);
                        e.target.value = ''; // Reset input
                      }
                    }}
                    className="hidden"
                    id="csv-upload-edit"
                  />
                  <label
                    htmlFor="csv-upload-edit"
                    className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Import CSV
                  </label>
                  <span className="text-xs text-gray-500">(First column only)</span>
                </div>
              </div>
              <div className="space-y-3">
                {choices.map((choice, index) => (
                  <div key={choice.id} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-sm font-semibold text-gray-600 flex-shrink-0 mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={choice.text}
                          onChange={(e) => updateChoice(choice.id, e.target.value)}
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base bg-white"
                          placeholder="Enter choice text"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) updateChoiceImage(choice.id, file);
                          }}
                          className="w-32 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {choices.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeChoice(choice.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove choice"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={choice.isCorrect || false}
                          onChange={() => toggleChoiceCorrect(choice.id)}
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-offset-0"
                        />
                        <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Mark as correct answer</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addChoice}
                className="w-full mt-2 px-4 py-2.5 text-sm font-medium bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                + Add Choice
              </button>
            </div>
          )}

          {type === "number_input" && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Min Value
                </label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Max Value
                </label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Step
                </label>
                <input
                  type="number"
                  value={step}
                  onChange={(e) => setStep(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                  min="0.1"
                  step="0.1"
                />
              </div>
            </div>
          )}

          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-8 py-5 -mx-8 -mb-6 mt-8">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-5 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-semibold hover:scale-[1.02] active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isSubmitting}
                className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? "Updating..." : "Update Element"}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

