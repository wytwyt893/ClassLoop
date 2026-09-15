import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { SortableElementList } from "./SortableElementList";
import { CreateElementModal } from "./CreateElementModal";
import { EditSessionModal } from "./EditSessionModal";
import QRCode from "qrcode";
import { toast } from "sonner";

interface SessionDetailProps {
  session: Doc<"sessions">;
  onBack: () => void;
}

export function SessionDetail({ session, onBack }: SessionDetailProps) {
  const elements = useQuery(api.elements.getSessionElements, { sessionId: session._id }) || [];
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAccessCardExpanded, setIsAccessCardExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importElements = useMutation(api.elements.importElements);

  const participantUrl = `${window.location.origin}/input?session=${session.sessionCode}`;
  const resultsUrl = `${window.location.origin}/output?session=${session.sessionCode}`;

  const downloadQRCode = async (url: string, filename: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleExport = () => {
    // Prepare elements for export (remove internal fields and imageUrls)
    const exportData = elements.map(element => ({
      type: element.type,
      title: element.title,
      subtitle: element.subtitle,
      description: element.description,
      choices: element.choices?.map(choice => ({
        id: choice.id,
        text: choice.text,
        isCorrect: choice.isCorrect,
      })),
      minValue: element.minValue,
      maxValue: element.maxValue,
      step: element.step,
    }));

    // Create and download JSON file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `elements-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Elements exported successfully");
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedElements = JSON.parse(text);

      // Validate the imported data
      if (!Array.isArray(importedElements)) {
        throw new Error("Invalid format: expected an array of elements");
      }

      // Import elements
      await importElements({ sessionId: session._id, elements: importedElements });
      toast.success(`Successfully imported ${importedElements.length} elements`);
    } catch (error: any) {
      toast.error(`Failed to import elements: ${error.message || 'Invalid file format'}`);
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all self-start"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">{session.title}</h1>
          {session.description && (
            <p className="text-gray-600 text-sm sm:text-base mt-1">{session.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
          >
            Edit Session
          </button>
          <span
            className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
              session.isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {session.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <button
          onClick={() => setIsAccessCardExpanded(!isAccessCardExpanded)}
          className="flex items-center justify-between w-full lg:cursor-default mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-blue-900">Session Code: {session.sessionCode}</h3>
          </div>
          <svg 
            className={`w-6 h-6 text-blue-900 transition-transform lg:hidden ${isAccessCardExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden transition-all duration-300 ${
          isAccessCardExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 lg:max-h-[2000px] lg:opacity-100'
        }`}>
          {/* Participate Column */}
          <div className="bg-white/80 rounded-xl p-4 space-y-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <h4 className="text-base font-bold text-gray-900">Participate</h4>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">URL</div>
              <a 
                href={participantUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium break-all block"
              >
                {participantUrl}
              </a>
            </div>
            <button
              onClick={() => downloadQRCode(participantUrl, `${session.sessionCode}-participate-qr.png`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download QR Code
            </button>
          </div>

          {/* Results Column */}
          <div className="bg-white/80 rounded-xl p-4 space-y-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h4 className="text-base font-bold text-gray-900">Results</h4>
              {!session.resultsPublic && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                  Pin Protected
                </span>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">URL</div>
              <a 
                href={resultsUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium break-all block"
              >
                {resultsUrl}
              </a>
            </div>
            <button
              onClick={() => downloadQRCode(resultsUrl, `${session.sessionCode}-results-qr.png`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download QR Code
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Elements ({elements.length})</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          + Add Element
        </button>
      </div>

      {/* Import/Export buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleExport}
          disabled={elements.length === 0}
          className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Elements
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import Elements
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {elements.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white rounded-2xl border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg mb-6">No elements yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Add Your First Element
            </button>
          </div>
        </div>
      ) : (
        <SortableElementList elements={elements} sessionId={session._id} />
      )}

      {showCreateModal && (
        <CreateElementModal
          sessionId={session._id}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showEditModal && (
        <EditSessionModal
          session={session}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
