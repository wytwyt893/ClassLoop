import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface CreateSessionModalProps {
  onClose: () => void;
}

export function CreateSessionModal({ onClose }: CreateSessionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resultsPublic, setResultsPublic] = useState(true);
  const [resultsPinCode, setResultsPinCode] = useState("");
  const [completionTitle, setCompletionTitle] = useState("");
  const [completionSubtitle, setCompletionSubtitle] = useState("");
  const [completionDescription, setCompletionDescription] = useState("");
  const [completionImageFile, setCompletionImageFile] = useState<File | null>(null);
  const [bgColor, setBgColor] = useState("#f9fafb");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createSession = useMutation(api.sessions.createSession);
  const generateUploadUrl = useMutation(api.elements.generateUploadUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    if (!resultsPublic && (!resultsPinCode || resultsPinCode.length !== 4)) {
      toast.error("Please enter a 4-digit pin code for private results");
      return;
    }

    setIsSubmitting(true);
    try {
      let completionImageId: Id<"_storage"> | undefined;
      if (completionImageFile) {
        completionImageId = await uploadFile(completionImageFile);
      }

      await createSession({
        title: title.trim(),
        description: description.trim() || undefined,
        resultsPublic,
        resultsPinCode: !resultsPublic ? resultsPinCode : undefined,
        completionTitle: completionTitle.trim() || undefined,
        completionSubtitle: completionSubtitle.trim() || undefined,
        completionDescription: completionDescription.trim() || undefined,
        completionImageId,
        bgColor: bgColor || undefined,
        accentColor: accentColor || undefined,
      });
      toast.success("Session created successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-end" onClick={onClose}>
      <div 
        className="bg-white w-full h-full md:max-w-2xl md:h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 sm:px-8 py-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Create New Session</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Set up your interactive classroom experience</p>
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
        
        <div className="px-6 sm:px-8 py-6">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Session Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              placeholder="e.g., Morning Math Quiz"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Description <span className="text-gray-400 text-xs normal-case">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base resize-none"
              placeholder="Brief description of this session"
              rows={3}
            />
          </div>

          {/* Results Privacy */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Results Privacy</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all group">
                <input
                  type="radio"
                  checked={resultsPublic}
                  onChange={() => setResultsPublic(true)}
                  className="w-5 h-5 text-blue-600 mt-0.5 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Public Results</div>
                  <div className="text-sm text-gray-600">Anyone with the results link can view</div>
                </div>
              </label>
              <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all group">
                <input
                  type="radio"
                  checked={!resultsPublic}
                  onChange={() => setResultsPublic(false)}
                  className="w-5 h-5 text-blue-600 mt-0.5 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Private Results</div>
                  <div className="text-sm text-gray-600">Require 4-digit pin code to view</div>
                </div>
              </label>
              {!resultsPublic && (
                <div className="ml-8 mt-3">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Pin Code
                  </label>
                  <input
                    type="text"
                    value={resultsPinCode}
                    onChange={(e) => setResultsPinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-32 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono text-lg tracking-wider"
                    placeholder="0000"
                    maxLength={4}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Visual Customization */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Visual Customization</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-14 h-12 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="#f9fafb"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-14 h-12 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="#2563eb"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Completion Message */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Completion Message</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Title <span className="text-gray-400 text-xs normal-case">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={completionTitle}
                  onChange={(e) => setCompletionTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                  placeholder="Thank you for participating!"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Subtitle <span className="text-gray-400 text-xs normal-case">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={completionSubtitle}
                  onChange={(e) => setCompletionSubtitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                  placeholder="Your responses have been recorded"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Description <span className="text-gray-400 text-xs normal-case">(Optional)</span>
                </label>
                <textarea
                  value={completionDescription}
                  onChange={(e) => setCompletionDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base resize-none"
                  placeholder="Additional completion message"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Image <span className="text-gray-400 text-xs normal-case">(Optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCompletionImageFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 sm:px-8 py-5 -mx-6 sm:-mx-8 -mb-6 mt-8">
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
                {isSubmitting ? "Creating..." : "Create Session"}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
