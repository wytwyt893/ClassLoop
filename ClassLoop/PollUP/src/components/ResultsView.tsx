import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ResultsView() {
  const [sessionCode, setSessionCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinError, setPinError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showParticipantManager, setShowParticipantManager] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<string | null>(null);
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("session");
    if (code) {
      setSessionCode(code);
    }
  }, []);

  const session = useQuery(
    api.sessions.getSessionByCode,
    sessionCode ? { sessionCode } : "skip"
  );

  const accessVerification = useQuery(
    api.sessions.verifyResultsAccess,
    sessionCode && (session?.resultsPublic || pinCode.length === 4) 
      ? { sessionCode, pinCode: pinCode || undefined } 
      : "skip"
  );

  const elements = useQuery(
    api.elements.getSessionElements,
    session && accessGranted ? { sessionId: session._id } : "skip"
  ) || [];

  const responses = useQuery(
    api.responses.getSessionResponses,
    session && accessGranted ? { sessionId: session._id } : "skip"
  ) || [];

  const isOwner = useQuery(
    api.responses.checkSessionOwnership,
    session ? { sessionId: session._id } : "skip"
  );

  const participants = useQuery(
    api.responses.getSessionParticipants,
    session && isOwner ? { sessionId: session._id } : "skip"
  );

  const deleteAllResponses = useMutation(api.responses.deleteAllSessionResponses);
  const deleteParticipantResponses = useMutation(api.responses.deleteParticipantResponses);

  // Get custom colors with defaults
  const bgColor = session?.bgColor || "#f9fafb";
  const accentColor = session?.accentColor || "#2563eb";

  useEffect(() => {
    if (accessVerification) {
      if (accessVerification.success) {
        setAccessGranted(true);
        setPinError("");
      } else {
        setAccessGranted(false);
        if (accessVerification.error === "Pin code required") {
          setShowPinInput(true);
        } else if (accessVerification.error === "Invalid pin code") {
          setPinError("Invalid pin code. Please try again.");
        }
      }
    }
  }, [accessVerification]);

  useEffect(() => {
    if (session && session.resultsPublic) {
      setAccessGranted(true);
    } else if (session && !session.resultsPublic) {
      setShowPinInput(true);
    }
  }, [session]);

  // Handle escape key to close image modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imageModalUrl) {
        setImageModalUrl(null);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [imageModalUrl]);

  const handleExportCSV = () => {
    if (!session || !elements || !responses) return;

    // Create CSV header
    const headers = ["Participant ID", "Element", "Element Type", "Response", "File URL"];
    const rows = [headers];

    // Group responses by participant
    const participantIds = new Set(responses.map(r => r.participantId));
    
    participantIds.forEach(participantId => {
      elements.forEach(element => {
        const response = responses.find(r => r.participantId === participantId && r.elementId === element._id);
        
        if (response) {
          let responseValue = "";
          
          if (response.textValue) {
            responseValue = `"${response.textValue.replace(/"/g, '""')}"`;
          } else if (response.numberValue !== undefined) {
            responseValue = response.numberValue.toString();
          } else if (response.choiceIds && response.choiceIds.length > 0) {
            const choiceTexts = response.choiceIds.map((choiceId: string) => {
              const choice = element.choices?.find((c: any) => c.id === choiceId);
              return choice?.text || choiceId;
            });
            responseValue = `"${choiceTexts.join(", ")}"`;
          } else if (response.fileUrl) {
            responseValue = "File uploaded";
          }

          rows.push([
            participantId,
            `"${element.title.replace(/"/g, '""')}"`,
            element.type,
            responseValue,
            response.fileUrl || ""
          ]);
        }
      });
    });

    // Convert to CSV string
    const csv = rows.map(row => row.join(",")).join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.title.replace(/[^a-z0-9]/gi, '_')}_results_${sessionCode}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Results exported successfully");
  };

  const handleDeleteResponses = async () => {
    if (!session) return;
    
    try {
      await deleteAllResponses({ sessionId: session._id });
      toast.success("All responses deleted successfully");
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error("Failed to delete responses");
      console.error(error);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!session) return;
    
    try {
      await deleteParticipantResponses({ sessionId: session._id, participantId });
      toast.success("Participant responses deleted successfully");
      setParticipantToDelete(null);
    } catch (error) {
      toast.error("Failed to delete participant responses");
      console.error(error);
    }
  };

  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">PollUp Results</h1>
          <p className="text-gray-600">No session code provided in URL</p>
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Not Found</h1>
          <p className="text-gray-600">Session code "{sessionCode}" is not valid</p>
        </div>
      </div>
    );
  }

  if (showPinInput && !accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{session.title} - Results</h1>
            <p className="text-gray-600">This session requires a pin code to view results</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 4-digit pin code
              </label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPinCode(value);
                  setPinError("");
                }}
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0000"
                maxLength={4}
              />
              {pinError && (
                <p className="mt-2 text-sm text-red-600">{pinError}</p>
              )}
            </div>
            
            <div className="text-center text-sm text-gray-500">
              <p className="mb-2">Session: {sessionCode}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalParticipants = new Set(responses.map(r => r.participantId)).size;

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: bgColor }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.title} - Results</h1>
          {session.description && (
            <p className="text-gray-600">{session.description}</p>
          )}
          <div className="flex justify-center gap-4 mt-4 text-sm flex-wrap">
            <span 
              className="px-3 py-1 rounded-full"
              style={{ 
                backgroundColor: `${accentColor}20`,
                color: accentColor
              }}
            >
              Session: {sessionCode}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              {totalParticipants} Participants
            </span>
            {!session.resultsPublic && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                Private Results
              </span>
            )}
          </div>
          
          {/* Owner Actions */}
          {isOwner && (
            <div className="flex justify-center gap-3 mt-6 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={() => setShowParticipantManager(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Participants
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete All Responses
              </button>
            </div>
          )}
        </div>

        {elements.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No elements in this session</p>
          </div>
        ) : (
          <div className="space-y-8">
            {elements.map((element) => (
              <ElementResults
                key={element._id}
                element={element}
                responses={responses.filter(r => r.elementId === element._id)}
                totalParticipants={totalParticipants}
                accentColor={accentColor}
                onImageClick={setImageModalUrl}
              />
            ))}
          </div>
        )}
        
        {/* CTA Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Create Your Own Interactive Polls
            </h2>
            <p className="text-gray-600 mb-6">
              Engage your audience with real-time polls, quizzes, and surveys
            </p>
            <a
              href="/"
              className="inline-block px-8 py-3 text-white rounded-lg transition-colors font-medium"
              style={{ backgroundColor: accentColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              Get Started - Everything's 100% Free
            </a>
          </div>
        </div>
      </div>

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete All Responses?
                </h3>
                <p className="text-sm text-gray-600">
                  This will permanently delete all {responses.length} response(s) from {totalParticipants} participant(s). 
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteResponses}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete All Responses
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participant Manager Modal */}
      {showParticipantManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Manage Participants
              </h3>
              <button
                onClick={() => setShowParticipantManager(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {participants && participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div
                      key={participant.participantId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          Participant #{index + 1}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {participant.responseCount} response{participant.responseCount !== 1 ? 's' : ''} • 
                          Joined {new Date(participant.firstResponseTime).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => setParticipantToDelete(participant.participantId)}
                        className="ml-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No participants yet
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowParticipantManager(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Participant Confirmation Modal */}
      {participantToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Participant?
                </h3>
                <p className="text-sm text-gray-600">
                  This will permanently delete all responses from this participant. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setParticipantToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteParticipant(participantToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Participant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4"
          onClick={() => setImageModalUrl(null)}
        >
          <button
            onClick={() => setImageModalUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div 
            className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageModalUrl}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </div>
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <p className="text-white text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
              Click anywhere or press ESC to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ElementResultsProps {
  element: any;
  responses: any[];
  totalParticipants: number;
  accentColor: string;
  onImageClick: (url: string) => void;
}

function ElementResults({ element, responses, totalParticipants, accentColor, onImageClick }: ElementResultsProps) {
  const getChoiceStats = () => {
    if (!element.choices) return {};
    
    const stats: Record<string, number> = {};
    element.choices.forEach((choice: any) => {
      stats[choice.id] = 0;
    });

    responses.forEach(response => {
      if (response.choiceIds) {
        response.choiceIds.forEach((choiceId: string) => {
          stats[choiceId] = (stats[choiceId] || 0) + 1;
        });
      }
    });

    return stats;
  };

  const getNumberStats = () => {
    const values = responses
      .map(r => r.numberValue)
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return null;

    return {
      count: values.length,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };

  const choiceStats = getChoiceStats();
  const numberStats = getNumberStats();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{element.title}</h3>
        {element.subtitle && (
          <p className="text-gray-700 mb-1">{element.subtitle}</p>
        )}
        {element.description && (
          <p className="text-gray-600 text-sm">{element.description}</p>
        )}
        <div className="mt-2 text-sm text-gray-500">
          {responses.length} of {totalParticipants} participants responded
        </div>
      </div>

      {element.imageUrl && (
        <div className="mb-6 flex justify-center">
          <button
            onClick={() => onImageClick(element.imageUrl)}
            className="relative group cursor-pointer"
          >
            <img
              src={element.imageUrl}
              alt="Element image"
              className="max-w-md max-h-64 object-contain rounded-lg group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {(element.type === "single_choice" || element.type === "single_choice_unique" || element.type === "multiple_choice") && (
        <div className="space-y-3">
          {element.choices?.map((choice: any) => {
            const count = choiceStats[choice.id] || 0;
            const percentage = responses.length > 0 ? (count / responses.length) * 100 : 0;
            const isCorrect = choice.isCorrect || false;
            
            return (
              <div 
                key={choice.id} 
                className={`flex items-center gap-4 p-3 rounded-lg ${isCorrect ? 'bg-green-50 border-2 border-green-300' : 'bg-white'}`}
              >
                {choice.imageUrl && (
                  <button
                    onClick={() => onImageClick(choice.imageUrl)}
                    className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded overflow-hidden flex items-center justify-center group cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
                  >
                    <img
                      src={choice.imageUrl}
                      alt="Choice image"
                      className="w-full h-full object-contain group-hover:opacity-80 transition-opacity"
                    />
                  </button>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isCorrect ? 'text-green-900' : ''}`}>
                        {choice.text || "Image choice"}
                      </span>
                      {isCorrect && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                          ✓ Correct
                        </span>
                      )}
                    </div>
                    <span className={`text-sm ${isCorrect ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isCorrect ? '#16a34a' : accentColor
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {element.type === "number_input" && numberStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold" style={{ color: accentColor }}>{numberStats.count}</div>
            <div className="text-sm text-gray-600">Responses</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{numberStats.average.toFixed(1)}</div>
            <div className="text-sm text-gray-600">Average</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{numberStats.min}</div>
            <div className="text-sm text-gray-600">Minimum</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{numberStats.max}</div>
            <div className="text-sm text-gray-600">Maximum</div>
          </div>
        </div>
      )}

      {element.type === "text_input" && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {responses.filter(r => r.textValue).map((response, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">{response.textValue}</p>
            </div>
          ))}
          {responses.filter(r => r.textValue).length === 0 && (
            <p className="text-gray-500 text-sm">No text responses yet</p>
          )}
        </div>
      )}

      {element.type === "file_upload" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {responses.filter(r => r.fileUrl).map((response, index) => {
              // Check if file is an image based on content type
              const isImage = response.fileContentType && response.fileContentType.startsWith('image/');
              
              return (
                <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                  {isImage ? (
                    <button
                      onClick={() => onImageClick(response.fileUrl)}
                      className="block group w-full text-left cursor-pointer"
                    >
                      <div className="relative aspect-video bg-gray-100">
                        <img
                          src={response.fileUrl}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-contain group-hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                      <div className="p-2 text-center">
                        <span 
                          className="text-xs font-medium hover:underline"
                          style={{ color: accentColor }}
                        >
                          Click to View Full Size
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="p-3">
                      <a
                        href={response.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline text-sm"
                        style={{ color: accentColor }}
                      >
                        📎 File {index + 1}
                        {response.fileContentType && (
                          <span className="block text-xs text-gray-500 mt-1">
                            {response.fileContentType}
                          </span>
                        )}
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {responses.filter(r => r.fileUrl).length === 0 && (
            <p className="text-gray-500 text-sm">No files uploaded yet</p>
          )}
        </div>
      )}
    </div>
  );
}
