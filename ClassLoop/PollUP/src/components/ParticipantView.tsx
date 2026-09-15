import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

// Helper function to render text with clickable links
function TextWithLinks({ text, className = "" }: { text: string; className?: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}

export function ParticipantView() {
  const [sessionCode, setSessionCode] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [currentElementIndex, setCurrentElementIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputCode, setInputCode] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("session");
    if (code) {
      setSessionCode(code);
    }

    // Generate or get participant ID
    let id = localStorage.getItem("participantId");
    if (!id) {
      id = "participant_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("participantId", id);
    }
    setParticipantId(id);
  }, []);

  const session = useQuery(
    api.sessions.getSessionByCode,
    sessionCode ? { sessionCode } : "skip"
  );

  const elements = useQuery(
    api.elements.getVisibleElementsForParticipant,
    session && participantId ? { sessionId: session._id, participantId } : "skip"
  ) || [];

  const participantResponses = useQuery(
    api.responses.getParticipantResponses,
    session && participantId ? { sessionId: session._id, participantId } : "skip"
  ) || [];

  // Get custom colors with defaults
  const bgColor = session?.bgColor || "#f9fafb";
  const accentColor = session?.accentColor || "#2563eb";

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      setSessionCode(inputCode.trim().toUpperCase());
      // Update URL without reloading
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("session", inputCode.trim().toUpperCase());
      window.history.pushState({}, "", newUrl);
    }
  };

  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PollUp</h1>
            <p className="text-gray-600">Enter your session code to join</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
              Session Code
            </label>
            <input
              id="sessionCode"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., ABC123)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-lg font-mono uppercase"
              autoFocus
              maxLength={10}
            />
            <button
              type="submit"
              disabled={!inputCode.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Join Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Session Not Found</h1>
            <p className="text-gray-600 mb-1">Session code <span className="font-mono font-semibold">{sessionCode}</span> is not valid</p>
            <p className="text-sm text-gray-500">Please check the code and try again</p>
          </div>
          
          <form onSubmit={handleCodeSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700 mb-2">
              Enter a Different Code
            </label>
            <input
              id="sessionCode"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., ABC123)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-lg font-mono uppercase"
              autoFocus
              maxLength={10}
            />
            <button
              type="submit"
              disabled={!inputCode.trim()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Try Again
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-3">Want to make your own interactive polls?</p>
              <a
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Create Your Own PollUp - It's 100% Free
              </a>
            </div>
        </div>
      </div>
    );
  }

  if (!session.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
          <p className="text-gray-600">This session is currently inactive</p>
        </div>
      </div>
    );
  }

  const activeElements = elements.filter(e => e.isActive);
  const respondedElementIds = new Set(participantResponses.map(r => r.elementId));
  const allElementsResponded = activeElements.every(e => respondedElementIds.has(e._id));

  // Show completion screen if completed OR if all responded (unless user is actively editing)
  const shouldShowCompletion = (isCompleted || allElementsResponded) && !isEditing;

  if (shouldShowCompletion) {
    const handleEditResponses = () => {
      setIsEditing(true);
      setIsCompleted(false);
      setCurrentElementIndex(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            {session.completionImageUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={session.completionImageUrl}
                  alt="Completion image"
                  className="max-w-full max-h-64 object-contain rounded-lg"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              <TextWithLinks text={session.completionTitle || "Thank you for participating!"} />
            </h1>
            {session.completionSubtitle && (
              <p className="text-xl text-gray-700 mb-4">
                <TextWithLinks text={session.completionSubtitle} />
              </p>
            )}
            {session.completionDescription && (
              <p className="text-gray-600 mb-6">
                <TextWithLinks text={session.completionDescription} />
              </p>
            )}
            
            {/* Edit Responses Button */}
            <div className="mb-6">
              <button
                onClick={handleEditResponses}
                className="px-6 py-3 text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg"
                style={{ 
                  backgroundColor: accentColor,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                Edit Your Responses
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Want to create your own interactive polls?</p>
              <a
                href="/"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
              >
                Start Your Own Poll - It's Free
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeElements.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{session.title}</h1>
          <p className="text-gray-500">No active elements in this session</p>
        </div>
      </div>
    );
  }

  const currentElement = activeElements[currentElementIndex];
  const hasResponded = respondedElementIds.has(currentElement._id);
  const isLastElement = currentElementIndex === activeElements.length - 1;

  const handleNext = () => {
    if (currentElementIndex < activeElements.length - 1) {
      setCurrentElementIndex(currentElementIndex + 1);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setIsCompleted(true);
      setIsEditing(false); // Reset editing mode to show completion screen
    }
  };

  const handlePrevious = () => {
    if (currentElementIndex > 0) {
      setCurrentElementIndex(currentElementIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: bgColor }}>
      <div className="flex-1 py-8 pb-44">
        <div className="max-w-2xl mx-auto px-4">
          {/* Display session image on first question */}
          {currentElementIndex === 0 && session.completionImageUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={session.completionImageUrl}
                alt="Session image"
                className="max-w-full max-h-64 object-contain rounded-lg"
              />
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.title}</h1>
            {session.description && (
              <p className="text-gray-600">{session.description}</p>
            )}
            
            {/* Progress indicator */}
            <div className="mt-4">
              <div className="flex justify-center items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">
                  Question {currentElementIndex + 1} of {activeElements.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((currentElementIndex + 1) / activeElements.length) * 100}%`,
                    backgroundColor: accentColor
                  }}
                />
              </div>
            </div>
          </div>

        <ElementResponse
          element={currentElement}
          sessionId={session._id}
          participantId={participantId}
          hasResponded={hasResponded}
          isLastElement={isLastElement}
          onNext={handleNext}
          onPrevious={handlePrevious}
          canGoPrevious={currentElementIndex > 0}
          accentColor={accentColor}
          bgColor={bgColor}
        />
        </div>
      </div>
    </div>
  );
}

interface ElementResponseProps {
  element: any;
  sessionId: Id<"sessions">;
  participantId: string;
  hasResponded: boolean;
  isLastElement: boolean;
  onNext: () => void;
  onPrevious: () => void;
  canGoPrevious: boolean;
  accentColor: string;
  bgColor: string;
}

function ElementResponse({ 
  element, 
  sessionId, 
  participantId, 
  hasResponded, 
  isLastElement, 
  onNext, 
  onPrevious, 
  canGoPrevious,
  accentColor,
  bgColor
}: ElementResponseProps) {
  const [textValue, setTextValue] = useState("");
  const [numberValue, setNumberValue] = useState(element.minValue || 0);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingFileId, setExistingFileId] = useState<Id<"_storage"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedThisSession, setHasSubmittedThisSession] = useState(hasResponded);

  const submitResponse = useMutation(api.responses.submitResponse);
  const generateUploadUrl = useMutation(api.elements.generateUploadUrl);
  
  // Get taken choices for unique single choice elements
  const takenChoices = useQuery(
    api.responses.getTakenChoices,
    element.type === "single_choice_unique" ? { elementId: element._id, participantId } : "skip"
  ) || [];

  // Load existing response if available
  const existingResponses = useQuery(
    api.responses.getParticipantResponses,
    { sessionId, participantId }
  ) || [];

  // Get file metadata for existing file upload
  const existingFileMetadata = useQuery(
    api.responses.getFileMetadata,
    existingFileId ? { fileId: existingFileId } : "skip"
  );

  // Reset state when element changes
  useEffect(() => {
    setTextValue("");
    setNumberValue(element.minValue || 0);
    setSelectedChoices([]);
    setUploadedFile(null);
    setExistingFileId(null);
    setHasSubmittedThisSession(false);
  }, [element._id]);

  // Load existing response if available
  useEffect(() => {
    const existingResponse = existingResponses.find(r => r.elementId === element._id);
    if (existingResponse) {
      if (existingResponse.textValue) setTextValue(existingResponse.textValue);
      if (existingResponse.numberValue !== undefined) setNumberValue(existingResponse.numberValue);
      if (existingResponse.choiceIds) setSelectedChoices(existingResponse.choiceIds);
      if (existingResponse.fileId) setExistingFileId(existingResponse.fileId);
      setHasSubmittedThisSession(true);
    }
  }, [existingResponses, element._id]);

  const handleSubmitAndNext = async () => {
    setIsSubmitting(true);
    try {
      let fileId: Id<"_storage"> | undefined;
      
      if (element.type === "file_upload") {
        if (uploadedFile) {
          // Upload new file
          const uploadUrl = await generateUploadUrl();
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": uploadedFile.type },
            body: uploadedFile,
          });
          const json = await result.json();
          if (!result.ok) {
            throw new Error(`Upload failed: ${JSON.stringify(json)}`);
          }
          fileId = json.storageId;
        } else if (existingFileId) {
          // Keep existing file if no new file uploaded
          fileId = existingFileId;
        }
      }

      await submitResponse({
        sessionId,
        elementId: element._id,
        participantId,
        textValue: element.type === "text_input" ? textValue : undefined,
        numberValue: element.type === "number_input" ? numberValue : undefined,
        choiceIds: (element.type === "single_choice" || element.type === "single_choice_unique" || element.type === "multiple_choice") 
          ? selectedChoices : undefined,
        fileId,
      });

      setHasSubmittedThisSession(true);
      toast.success("Response saved!");
      onNext();
    } catch (error) {
      toast.error("Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = () => {
    switch (element.type) {
      case "text_input":
        return textValue.trim().length > 0;
      case "number_input":
        return true; // Always valid for number input
      case "single_choice":
      case "single_choice_unique":
      case "multiple_choice":
        return selectedChoices.length > 0;
      case "file_upload":
        return uploadedFile !== null || existingFileId !== null;
      default:
        return false;
    }
  };

  const handleChoiceChange = (choiceId: string) => {
    // For unique single choice, check if choice is taken by someone else
    if (element.type === "single_choice_unique" && takenChoices.includes(choiceId)) {
      toast.error("This option has already been selected by another participant");
      return;
    }
    
    if (element.type === "single_choice" || element.type === "single_choice_unique") {
      setSelectedChoices([choiceId]);
    } else {
      setSelectedChoices(prev => 
        prev.includes(choiceId) 
          ? prev.filter(id => id !== choiceId)
          : [...prev, choiceId]
      );
    }
  };

  const getHintText = () => {
    switch (element.type) {
      case "text_input":
        return "Type your answer below";
      case "number_input":
        return "Use the slider to select your value";
      case "single_choice":
        return "Select one option";
      case "single_choice_unique":
        return "Select one option - Each can only be chosen once";
      case "multiple_choice":
        return "Select one or more options";
      case "file_upload":
        return "Upload a file to submit";
      default:
        return "";
    }
  };

  return (
    <>
      {/* Question Title & Subtitle - Sticky on scroll */}
      <div 
        className="sticky top-0 z-40 pb-6 pt-4 mb-2 -mx-4 px-4 border-b border-gray-200"
        style={{ 
          backgroundColor: bgColor,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
        }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{element.title}</h2>
        {element.subtitle && (
          <p className="text-lg md:text-xl text-gray-700 mb-3">{element.subtitle}</p>
        )}
        {element.description && (
          <p className="text-gray-600 mb-4">{element.description}</p>
        )}
        
        {/* Hint text */}
        <p className="text-sm text-gray-500 italic">{getHintText()}</p>
      </div>

      {element.imageUrl && (
        <div className="mb-6 flex justify-center">
          <img
            src={element.imageUrl}
            alt="Element image"
            className="max-w-full max-h-96 object-contain rounded-lg shadow-md"
          />
        </div>
      )}

      {/* Response Input Area */}
      <div className="mb-6">
        {element.type === "text_input" && (
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent bg-white shadow-sm"
            placeholder="Enter your response..."
            rows={6}
          />
        )}

        {element.type === "number_input" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <input
              type="range"
              min={element.minValue || 0}
              max={element.maxValue || 100}
              step={element.step || 1}
              value={numberValue}
              onChange={(e) => setNumberValue(Number(e.target.value))}
              className="w-full mb-4"
              style={{
                accentColor: accentColor
              }}
            />
            <div className="text-center text-3xl font-bold mb-2" style={{ color: accentColor }}>{numberValue}</div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{element.minValue || 0}</span>
              <span>{element.maxValue || 100}</span>
            </div>
          </div>
        )}

        {(element.type === "single_choice" || element.type === "single_choice_unique" || element.type === "multiple_choice") && (
          (() => {
            const hasAnyImage = element.choices?.some((c: any) => c.imageUrl);
            const choiceCount = element.choices?.length || 0;
            
            // Determine grid layout based on choices
            let gridClass = "";
            if (hasAnyImage) {
              // For image choices: responsive grid
              if (choiceCount <= 2) {
                gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-4";
              } else if (choiceCount <= 4) {
                gridClass = "grid grid-cols-2 gap-4";
              } else {
                gridClass = "grid grid-cols-2 md:grid-cols-3 gap-4";
              }
            } else {
              // For text-only choices
              if (choiceCount === 2) {
                gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-3";
              } else if (choiceCount <= 4) {
                gridClass = "grid grid-cols-1 gap-3";
              } else {
                gridClass = "grid grid-cols-1 sm:grid-cols-2 gap-3";
              }
            }
            
            return (
              <div className={gridClass}>
                {element.choices?.map((choice: any) => {
                  const isSelected = selectedChoices.includes(choice.id);
                  const hasImage = !!choice.imageUrl;
                  const isTaken = element.type === "single_choice_unique" && takenChoices.includes(choice.id);
                  const isMyChoice = isSelected && hasSubmittedThisSession;
                  
                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleChoiceChange(choice.id)}
                      disabled={isTaken && !isMyChoice}
                      className={`
                        ${hasImage ? "flex flex-col items-center justify-start" : "flex items-center justify-center"} 
                        ${hasImage ? "p-3" : "p-4 min-h-[60px]"}
                        border-2 rounded-lg transition-all relative
                        ${isSelected 
                          ? "shadow-md scale-[0.98]" 
                          : isTaken 
                            ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed" 
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm"
                        }
                      `}
                      style={isSelected ? {
                        borderColor: accentColor,
                        backgroundColor: `${accentColor}10`
                      } : {}}
                    >
                      {isTaken && !isMyChoice && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                          Taken
                        </div>
                      )}
                      {choice.imageUrl && (
                        <div className="w-full aspect-video mb-2 overflow-hidden rounded bg-gray-50 flex items-center justify-center">
                          <img
                            src={choice.imageUrl}
                            alt="Choice image"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span 
                        className={`
                          ${hasImage ? "text-center text-sm font-medium" : "text-base font-medium text-center"}
                        `}
                        style={isSelected ? { color: accentColor } : { color: isTaken ? "#6b7280" : "#111827" }}
                      >
                        {choice.text || ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })()
        )}

        {element.type === "file_upload" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {existingFileMetadata && !uploadedFile && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-1">Previously uploaded file:</p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-blue-800">
                      {existingFileMetadata.contentType || "File"}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Size: {(existingFileMetadata.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {existingFileMetadata && !uploadedFile ? "Upload a new file (optional)" : "Upload a file"}
              </label>
              <input
                type="file"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent"
              />
            </div>
            {uploadedFile && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  New file selected: {uploadedFile.name}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {hasSubmittedThisSession && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <p className="text-green-800 text-sm font-medium">✓ Response saved. You can revise your answer and submit again.</p>
        </div>
      )}

      {/* Fixed Footer with Navigation and Consent */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-2xl mx-auto px-4 py-4 sm:py-5">
          {/* Navigation Buttons */}
          <div className="flex gap-3 mb-3">
            {canGoPrevious && (
              <button
                onClick={onPrevious}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleSubmitAndNext}
              disabled={!canSubmit() || isSubmitting}
              className="flex-1 px-6 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              style={{ 
                backgroundColor: accentColor,
                filter: !canSubmit() || isSubmitting ? 'brightness(0.7)' : 'brightness(1)'
              }}
              onMouseEnter={(e) => {
                if (canSubmit() && !isSubmitting) {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }
              }}
              onMouseLeave={(e) => {
                if (canSubmit() && !isSubmitting) {
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
            >
              {isSubmitting ? "Saving..." : isLastElement ? "Finish" : "Next"}
            </button>
          </div>
          
          {/* Consent Notice */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              By submitting, your responses will be stored and accessible to the poll creator.{" "}
              <a 
                href="/privacy" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Privacy Policy
              </a>
              {" · "}
              <a 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Terms of Use
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
