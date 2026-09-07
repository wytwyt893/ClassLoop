import { useState } from "react";
import { toast } from "sonner";

interface Subchapter {
  id: string;
  name: string;
  minutes: number;
  seconds: number;
}

interface BulletPoint {
  id: string;
  text: string;
}

interface TimerConfigModalProps {
  onClose: () => void;
}

export function TimerConfigModal({ onClose }: TimerConfigModalProps) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [style, setStyle] = useState("default");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bulletPoints, setBulletPoints] = useState<BulletPoint[]>([]);
  const [message, setMessage] = useState("");
  const [bgColor, setBgColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [useSubchapters, setUseSubchapters] = useState(false);
  const [subchapters, setSubchapters] = useState<Subchapter[]>([
    { id: "1", name: "Part 1", minutes: 5, seconds: 0 }
  ]);

  const getTotalDuration = () => {
    if (useSubchapters) {
      return subchapters.reduce((total, sub) => total + sub.minutes * 60 + sub.seconds, 0);
    }
    return hours * 3600 + minutes * 60 + seconds;
  };

  const addSubchapter = () => {
    const newId = (Math.max(...subchapters.map(s => parseInt(s.id)), 0) + 1).toString();
    setSubchapters([...subchapters, { id: newId, name: `Part ${newId}`, minutes: 5, seconds: 0 }]);
  };

  const removeSubchapter = (id: string) => {
    if (subchapters.length > 1) {
      setSubchapters(subchapters.filter(s => s.id !== id));
    }
  };

  const updateSubchapter = (id: string, updates: Partial<Subchapter>) => {
    setSubchapters(subchapters.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addBulletPoint = () => {
    const newId = (Math.max(0, ...bulletPoints.map(b => parseInt(b.id))) + 1).toString();
    setBulletPoints([...bulletPoints, { id: newId, text: "" }]);
  };

  const removeBulletPoint = (id: string) => {
    setBulletPoints(bulletPoints.filter(b => b.id !== id));
  };

  const updateBulletPoint = (id: string, text: string) => {
    setBulletPoints(bulletPoints.map(b => b.id === id ? { ...b, text } : b));
  };

  const exportConfiguration = () => {
    const config = {
      version: "1.0",
      timer: {
        hours,
        minutes,
        seconds,
        style,
        title,
        description,
        bulletPoints: bulletPoints.map(b => b.text).filter(t => t.trim()),
        message,
        bgColor,
        accentColor,
        submissionUrl,
        ctaText,
        useSubchapters,
        subchapters: useSubchapters ? subchapters : []
      }
    };

    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `timer-config-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Configuration exported successfully!");
  };

  const importConfiguration = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        
        if (!config.timer) {
          toast.error("Invalid configuration file");
          return;
        }

        const t = config.timer;
        
        // Set basic timer values
        if (typeof t.hours === "number") setHours(t.hours);
        if (typeof t.minutes === "number") setMinutes(t.minutes);
        if (typeof t.seconds === "number") setSeconds(t.seconds);
        if (t.style) setStyle(t.style);
        if (t.title !== undefined) setTitle(t.title);
        if (t.description !== undefined) setDescription(t.description);
        if (t.message !== undefined) setMessage(t.message);
        if (t.bgColor !== undefined) setBgColor(t.bgColor);
        if (t.accentColor !== undefined) setAccentColor(t.accentColor);
        if (t.submissionUrl !== undefined) setSubmissionUrl(t.submissionUrl);
        if (t.ctaText !== undefined) setCtaText(t.ctaText);

        // Import bullet points
        if (Array.isArray(t.bulletPoints)) {
          const importedBullets = t.bulletPoints.map((text: string, index: number) => ({
            id: (index + 1).toString(),
            text
          }));
          setBulletPoints(importedBullets);
        }

        // Import subchapters
        if (typeof t.useSubchapters === "boolean") {
          setUseSubchapters(t.useSubchapters);
        }
        if (Array.isArray(t.subchapters) && t.subchapters.length > 0) {
          const importedSubchapters = t.subchapters.map((sub: any, index: number) => ({
            id: (index + 1).toString(),
            name: sub.name || `Part ${index + 1}`,
            minutes: typeof sub.minutes === "number" ? sub.minutes : 5,
            seconds: typeof sub.seconds === "number" ? sub.seconds : 0
          }));
          setSubchapters(importedSubchapters);
        }

        toast.success("Configuration imported successfully!");
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Failed to import configuration. Please check the file format.");
      }
    };
    reader.readAsText(file);
    
    // Reset the input so the same file can be imported again
    event.target.value = "";
  };

  const generateTimerUrl = () => {
    const totalSeconds = getTotalDuration();
    
    if (totalSeconds <= 0) {
      toast.error("Please set a duration greater than 0");
      return;
    }

    const params = new URLSearchParams();
    params.set('duration', totalSeconds.toString());
    params.set('style', style);
    
    if (title.trim()) params.set('title', encodeURIComponent(title.trim()));
    if (description.trim()) params.set('description', encodeURIComponent(description.trim()));
    if (message.trim()) params.set('message', encodeURIComponent(message.trim()));
    if (bgColor.trim()) params.set('bg', bgColor.replace('#', ''));
    if (accentColor.trim()) params.set('accent', accentColor.replace('#', ''));
    if (submissionUrl.trim()) params.set('submissionUrl', encodeURIComponent(submissionUrl.trim()));
    if (ctaText.trim()) params.set('ctaText', encodeURIComponent(ctaText.trim()));
    
    if (useSubchapters) {
      const subchaptersData = subchapters.map(s => ({
        name: s.name,
        duration: s.minutes * 60 + s.seconds
      }));
      params.set('subchapters', encodeURIComponent(JSON.stringify(subchaptersData)));
    }

    // Include bullet points if any
    const nonEmptyBullets = bulletPoints.filter(b => b.text.trim());
    if (nonEmptyBullets.length > 0) {
      const bulletsData = nonEmptyBullets.map(b => b.text.trim());
      params.set('bullets', encodeURIComponent(JSON.stringify(bulletsData)));
    }

    const url = `${window.location.origin}/timer?${params.toString()}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Timer URL copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy URL");
    });

    // Open in new tab
    window.open(url, '_blank');
    onClose();
  };

  const presetTimes = [
    { label: "1 minute", h: 0, m: 1, s: 0 },
    { label: "5 minutes", h: 0, m: 5, s: 0 },
    { label: "10 minutes", h: 0, m: 10, s: 0 },
    { label: "15 minutes", h: 0, m: 15, s: 0 },
    { label: "30 minutes", h: 0, m: 30, s: 0 },
    { label: "1 hour", h: 1, m: 0, s: 0 },
  ];

  const styles = [
    { value: "default", label: "Default", description: "Blue theme with progress bar" },
    { value: "minimal", label: "Minimal", description: "Clean white background" },
    { value: "dark", label: "Dark", description: "Dark theme for low light" },
    { value: "colorful", label: "Colorful", description: "Gradient background" },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Configure Timer</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportConfiguration}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
              title="Export configuration"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <label className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1" title="Import configuration">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
              <input
                type="file"
                accept=".json"
                onChange={importConfiguration}
                className="hidden"
              />
            </label>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration {useSubchapters && <span className="text-xs text-gray-500">(set via subchapters)</span>}
            </label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                  disabled={useSubchapters}
                />
                <label className="block text-xs text-gray-500 text-center mt-1">Hours</label>
              </div>
              <span className="text-gray-500">:</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                  disabled={useSubchapters}
                />
                <label className="block text-xs text-gray-500 text-center mt-1">Minutes</label>
              </div>
              <span className="text-gray-500">:</span>
              <div className="flex-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="0"
                  disabled={useSubchapters}
                />
                <label className="block text-xs text-gray-500 text-center mt-1">Seconds</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presetTimes.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setHours(preset.h);
                    setMinutes(preset.m);
                    setSeconds(preset.s);
                  }}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  disabled={useSubchapters}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={useSubchapters}
                onChange={(e) => setUseSubchapters(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Use Subchapters (segments)
              </span>
            </label>

            {useSubchapters && (
              <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
                {subchapters.map((subchapter) => (
                  <div key={subchapter.id} className="flex gap-2 items-start bg-white p-2 rounded border border-gray-200">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={subchapter.name}
                        onChange={(e) => updateSubchapter(subchapter.id, { name: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Subchapter name"
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={subchapter.minutes}
                          onChange={(e) => updateSubchapter(subchapter.id, { minutes: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">min</span>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={subchapter.seconds}
                          onChange={(e) => updateSubchapter(subchapter.id, { seconds: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">sec</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSubchapter(subchapter.id)}
                      disabled={subchapters.length === 1}
                      className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  onClick={addSubchapter}
                  className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  + Add Subchapter
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Break Time"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Main description text displayed above the timer"
            />
          </div>

          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
              <span>Bullet Points (optional)</span>
              <button
                type="button"
                onClick={addBulletPoint}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
              >
                + Add Bullet
              </button>
            </label>
            {bulletPoints.length > 0 && (
              <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                {bulletPoints.map((bullet) => (
                  <div key={bullet.id} className="flex gap-2 items-center">
                    <span className="text-gray-500">•</span>
                    <input
                      type="text"
                      value={bullet.text}
                      onChange={(e) => updateBulletPoint(bullet.id, e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Bullet point text"
                    />
                    <button
                      onClick={() => removeBulletPoint(bullet.id)}
                      className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {bulletPoints.length === 0 && (
              <p className="text-xs text-gray-500">No bullet points added yet. Click "+ Add Bullet" to add one.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message (optional)
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Take a moment to stretch"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">QR Code & Call-to-Action</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission URL (optional)
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., https://forms.google.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call-to-Action Text (optional)
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Scan to submit your response"
                />
              </div>

              {submissionUrl && ctaText && (
                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                  ℹ️ A QR code will be displayed on the timer page
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={bgColor || "#ffffff"}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accent Color
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={accentColor || "#2563eb"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style (ignored if colors are set)
            </label>
            <div className="space-y-2">
              {styles.map((styleOption) => (
                <label key={styleOption.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="style"
                    value={styleOption.value}
                    checked={style === styleOption.value}
                    onChange={(e) => setStyle(e.target.value)}
                    className="mt-1 w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-sm">{styleOption.label}</div>
                    <div className="text-xs text-gray-500">{styleOption.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">
              <strong>Preview:</strong>{" "}
              {useSubchapters ? (
                <>
                  {Math.floor(getTotalDuration() / 60)}m {getTotalDuration() % 60}s (
                  {subchapters.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && ", "}
                      {s.name}: {s.minutes}m {s.seconds}s
                    </span>
                  ))}
                  )
                </>
              ) : (
                <>
                  {hours > 0 && `${hours}h `}{minutes > 0 && `${minutes}m `}{seconds > 0 && `${seconds}s`}
                  {getTotalDuration() === 0 && "No duration set"}
                </>
              )}
              {title && <div className="mt-1"><strong>Title:</strong> {title}</div>}
              {description && <div className="mt-1"><strong>Description:</strong> {description}</div>}
              {bulletPoints.filter(b => b.text.trim()).length > 0 && (
                <div className="mt-1">
                  <strong>Bullets:</strong>
                  <ul className="ml-4 mt-0.5">
                    {bulletPoints.filter(b => b.text.trim()).map(b => (
                      <li key={b.id} className="list-disc">{b.text}</li>
                    ))}
                  </ul>
                </div>
              )}
              {message && <div className="mt-1"><strong>Message:</strong> {message}</div>}
              {submissionUrl && ctaText && (
                <div className="mt-1"><strong>QR Code:</strong> {ctaText}</div>
              )}
              {(bgColor || accentColor) && (
                <div className="mt-1 text-xs">
                  Custom colors will override the selected style
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generateTimerUrl}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Timer
          </button>
        </div>
      </div>
    </div>
  );
}
