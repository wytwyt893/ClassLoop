import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface Subchapter {
  name: string;
  duration: number;
}

export function TimerView() {
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialDuration, setInitialDuration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [style, setStyle] = useState("default");
  const [showControls, setShowControls] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bulletPoints, setBulletPoints] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [bgColor, setBgColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [subchapters, setSubchapters] = useState<Subchapter[]>([]);
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const duration = parseInt(urlParams.get("duration") || "300"); // Default 5 minutes
    const timerStyle = urlParams.get("style") || "default";
    const customTitle = urlParams.get("title") || "";
    const customDescription = urlParams.get("description") || "";
    const customMessage = urlParams.get("message") || "";
    const customBgColor = urlParams.get("bg") || "";
    const customAccentColor = urlParams.get("accent") || "";
    const customSubmissionUrl = urlParams.get("submissionUrl") || "";
    const customCtaText = urlParams.get("ctaText") || "";
    
    // Parse subchapters if present
    const subchaptersParam = urlParams.get("subchapters");
    let parsedSubchapters: Subchapter[] = [];
    if (subchaptersParam) {
      try {
        parsedSubchapters = JSON.parse(decodeURIComponent(subchaptersParam));
      } catch (e) {
        console.error("Failed to parse subchapters:", e);
      }
    }
    
    // Parse bullet points if present
    const bulletsParam = urlParams.get("bullets");
    let parsedBullets: string[] = [];
    if (bulletsParam) {
      try {
        parsedBullets = JSON.parse(decodeURIComponent(bulletsParam));
      } catch (e) {
        console.error("Failed to parse bullets:", e);
      }
    }
    
    setTimeLeft(duration);
    setInitialDuration(duration);
    setStyle(timerStyle);
    setTitle(customTitle);
    setDescription(customDescription);
    setBulletPoints(parsedBullets);
    setMessage(customMessage);
    setBgColor(customBgColor);
    setAccentColor(customAccentColor);
    setSubchapters(parsedSubchapters);
    setSubmissionUrl(customSubmissionUrl);
    setCtaText(customCtaText);

    // Generate QR code if URL is provided
    if (customSubmissionUrl) {
      QRCode.toDataURL(decodeURIComponent(customSubmissionUrl), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(url => {
          setQrCodeDataUrl(url);
        })
        .catch(err => {
          console.error('Error generating QR code:', err);
        });
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (initialDuration === 0) return 0;
    return ((initialDuration - timeLeft) / initialDuration) * 100;
  };

  const getCurrentSubchapter = () => {
    if (subchapters.length === 0) return null;
    
    const elapsedTime = initialDuration - timeLeft;
    let cumulativeTime = 0;
    
    for (let i = 0; i < subchapters.length; i++) {
      cumulativeTime += subchapters[i].duration;
      if (elapsedTime < cumulativeTime) {
        return { index: i, ...subchapters[i] };
      }
    }
    
    // If we're at the end, return the last subchapter
    return { index: subchapters.length - 1, ...subchapters[subchapters.length - 1] };
  };

  const handleTimerClick = () => {
    if (!isRunning && timeLeft > 0) {
      setIsRunning(true);
      setShowHint(false);
    } else if (isRunning) {
      setShowControls(!showControls);
    }
  };

  const handleReset = () => {
    setTimeLeft(initialDuration);
    setIsRunning(true);
    setShowControls(false);
  };

  const handleAddTime = (additionalSeconds: number) => {
    setTimeLeft(prev => prev + additionalSeconds);
    setInitialDuration(prev => prev + additionalSeconds);
    if (!isRunning) setIsRunning(true);
    setShowControls(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    setShowControls(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const getStyleClasses = () => {
    // If custom colors are provided, use them regardless of style
    if (bgColor || accentColor) {
      const bg = bgColor ? `#${bgColor.replace('#', '')}` : '#f9fafb';
      const accent = accentColor ? `#${accentColor.replace('#', '')}` : '#2563eb';
      
      return {
        container: "min-h-screen flex items-center justify-center relative",
        timer: "text-8xl font-mono font-bold cursor-pointer select-none transition-opacity hover:opacity-80",
        hint: "text-lg mt-4 opacity-60",
        controlsPanel: "absolute mt-4 bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[120px]",
        button: "px-4 py-2 text-white rounded hover:opacity-80 transition-colors text-sm",
        customStyles: { bg, accent }
      };
    }

    switch (style) {
      case "minimal":
        return {
          container: "min-h-screen bg-white flex items-center justify-center relative",
          timer: "text-8xl font-mono font-bold text-gray-900 cursor-pointer select-none transition-opacity hover:opacity-80",
          hint: "text-gray-400 text-lg mt-4",
          controlsPanel: "absolute mt-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[120px]",
          button: "px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm",
        };
      case "dark":
        return {
          container: "min-h-screen bg-gray-900 flex items-center justify-center relative",
          timer: "text-8xl font-mono font-bold text-white cursor-pointer select-none transition-opacity hover:opacity-80",
          hint: "text-gray-500 text-lg mt-4",
          controlsPanel: "absolute mt-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[120px]",
          button: "px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm",
        };
      case "colorful":
        return {
          container: "min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center relative",
          timer: "text-8xl font-mono font-bold text-white drop-shadow-lg cursor-pointer select-none transition-opacity hover:opacity-80",
          hint: "text-white text-opacity-60 text-lg mt-4",
          controlsPanel: "absolute mt-4 bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[120px]",
          button: "px-4 py-2 bg-white bg-opacity-20 text-white rounded hover:bg-opacity-30 transition-colors text-sm backdrop-blur-sm",
        };
      default:
        return {
          container: "min-h-screen bg-gray-50 flex items-center justify-center relative",
          timer: "text-8xl font-mono font-bold text-blue-600 cursor-pointer select-none transition-opacity hover:opacity-80",
          hint: "text-gray-400 text-lg mt-4",
          controlsPanel: "absolute mt-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col gap-2 min-w-[120px]",
          button: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm",
        };
    }
  };

  const styleClasses = getStyleClasses();
  const isExpired = timeLeft === 0;

  const containerStyle = styleClasses.customStyles ? {
    backgroundColor: styleClasses.customStyles.bg
  } : {};

  const timerStyle = styleClasses.customStyles ? {
    color: styleClasses.customStyles.accent
  } : {};

  const buttonStyle = styleClasses.customStyles ? {
    backgroundColor: styleClasses.customStyles.accent
  } : {};

  const progressStyle = styleClasses.customStyles ? {
    backgroundColor: styleClasses.customStyles.accent
  } : {};

  const currentSubchapter = getCurrentSubchapter();

  const hasQrCode = qrCodeDataUrl && ctaText && !isExpired;

  return (
    <div className={styleClasses.container} style={containerStyle}>
      {/* Fullscreen Toggle Button */}
      <button
        onClick={toggleFullscreen}
        className={`fixed top-4 right-4 z-50 p-3 rounded-lg transition-all duration-300 hover:scale-110 ${
          style === 'dark'
            ? 'bg-gray-800 bg-opacity-60 hover:bg-opacity-80 text-gray-200 border border-gray-700'
            : style === 'colorful'
              ? 'bg-white bg-opacity-25 hover:bg-opacity-35 text-white border border-white border-opacity-30'
              : styleClasses.customStyles
                ? 'bg-white bg-opacity-35 hover:bg-opacity-45 border border-white border-opacity-40'
                : 'bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 border border-gray-200 shadow-lg'
        }`}
        style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}
        title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className={`w-full ${hasQrCode ? 'flex gap-6 items-center max-w-7xl' : 'max-w-6xl'}`}>
          {/* Main Content Area - 3/4 width when QR code present */}
          <div className={`${hasQrCode ? 'flex-[3]' : 'w-full'} text-center`}>
            {/* Custom Title */}
            {title && (
              <div className="mb-4 animate-fade-in">
                <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight ${
                  styleClasses.customStyles 
                    ? 'drop-shadow-lg' 
                    : style === 'dark' 
                      ? 'text-white drop-shadow-lg' 
                      : style === 'colorful'
                        ? 'text-white drop-shadow-2xl'
                        : 'text-gray-900'
                }`} 
                    style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                  {decodeURIComponent(title)}
                </h1>
              </div>
            )}

            {/* Current Subchapter Name */}
            {currentSubchapter && !isExpired && (
              <div className={`mb-3 px-4 py-1.5 rounded-full inline-block backdrop-blur-sm animate-fade-in text-sm md:text-base ${
                style === 'dark' 
                  ? 'bg-gray-800 bg-opacity-50 text-gray-200' 
                  : style === 'colorful'
                    ? 'bg-white bg-opacity-25 text-white font-semibold'
                    : styleClasses.customStyles
                      ? 'bg-white bg-opacity-30'
                      : 'bg-blue-50 text-blue-700'
              }`}
                   style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                <span className="font-medium">
                  {currentSubchapter.name}
                </span>
              </div>
            )}

            {/* Timer */}
            <div 
              className={`text-6xl md:text-7xl lg:text-8xl font-mono font-bold cursor-pointer select-none transition-all duration-300 mb-4 ${
                isExpired ? 'animate-pulse text-red-500 drop-shadow-2xl' : 'drop-shadow-2xl hover:opacity-80'
              }`}
              onClick={handleTimerClick}
              style={!isExpired ? timerStyle : {}}
            >
              {formatTime(timeLeft)}
            </div>

            {/* Description */}
            {description && (
              <div className={`mb-4 mx-auto animate-fade-in text-base md:text-lg lg:text-xl font-medium ${
                styleClasses.customStyles 
                  ? 'opacity-90' 
                  : style === 'dark' 
                    ? 'text-gray-200' 
                    : style === 'colorful'
                      ? 'text-white text-opacity-90'
                      : 'text-gray-700'
              }`}
                   style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                {decodeURIComponent(description)}
              </div>
            )}

            {/* Cards without bullet points */}
            {bulletPoints.length > 0 && (
              <div className="mb-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bulletPoints.map((bullet, i) => (
                    <div
                      key={i}
                      className={`p-3 md:p-4 rounded-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                        style === 'dark' 
                          ? 'bg-gray-800 bg-opacity-60 border border-gray-700 shadow-lg' 
                          : style === 'colorful'
                            ? 'bg-white bg-opacity-25 border border-white border-opacity-30 shadow-xl'
                            : styleClasses.customStyles
                              ? 'bg-white bg-opacity-35 border border-white border-opacity-40 shadow-lg'
                              : 'bg-white bg-opacity-90 border border-gray-200 shadow-md'
                      }`}
                    >
                      <span className={`text-sm md:text-base font-medium leading-snug block ${
                        styleClasses.customStyles 
                          ? 'opacity-95' 
                          : style === 'dark' 
                            ? 'text-gray-100' 
                            : style === 'colorful'
                              ? 'text-white'
                              : 'text-gray-800'
                      }`}
                            style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                        {bullet}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Progress Bar with Subchapters */}
            {subchapters.length > 0 ? (
              <div className="mt-3 w-full mx-auto">
                <div className="w-full flex gap-1.5 h-4 shadow-md rounded-lg overflow-hidden backdrop-blur-sm">
              {subchapters.map((subchapter, index) => {
                const segmentWidth = (subchapter.duration / initialDuration) * 100;
                const isActive = currentSubchapter?.index === index;
                const elapsedTime = initialDuration - timeLeft;
                
                // Calculate cumulative time up to this segment
                let cumulativeTime = 0;
                for (let i = 0; i < index; i++) {
                  cumulativeTime += subchapters[i].duration;
                }
                
                // Calculate progress within this segment
                const segmentElapsed = Math.max(0, Math.min(subchapter.duration, elapsedTime - cumulativeTime));
                const segmentProgress = (segmentElapsed / subchapter.duration) * 100;
                
                return (
                  <div
                    key={index}
                    className={`relative h-full transition-all duration-300 ${
                      isActive ? 'scale-y-110' : 'scale-y-100'
                    }`}
                    style={{ width: `${segmentWidth}%` }}
                    title={subchapter.name}
                  >
                    <div className={`h-full ${
                      styleClasses.customStyles 
                        ? 'bg-gray-300 bg-opacity-40' 
                        : style === 'dark' 
                          ? 'bg-gray-700' 
                          : style === 'colorful'
                            ? 'bg-white bg-opacity-30'
                            : 'bg-gray-300'
                    }`} />
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-1000 ${
                        isActive ? 'opacity-100 shadow-lg' : 'opacity-60'
                      }`}
                      style={{
                        width: `${segmentProgress}%`,
                        backgroundColor: styleClasses.customStyles?.accent || (style === 'dark' ? '#60a5fa' : style === 'colorful' ? '#ffffff' : '#2563eb')
                      }}
                    />
                  </div>
                );
              })}
            </div>
            {/* Subchapter labels */}
            <div className="flex gap-1.5 mt-3">
              {subchapters.map((subchapter, index) => {
                const segmentWidth = (subchapter.duration / initialDuration) * 100;
                const isActive = currentSubchapter?.index === index;
                return (
                  <div
                    key={index}
                    className={`text-sm md:text-base lg:text-lg break-words text-center leading-tight transition-all duration-300 ${
                      isActive 
                        ? styleClasses.customStyles 
                          ? 'font-bold opacity-100' 
                          : style === 'dark'
                            ? 'font-bold text-blue-300'
                            : style === 'colorful'
                              ? 'font-bold text-white drop-shadow-md'
                              : 'font-bold text-blue-700'
                        : styleClasses.customStyles 
                          ? 'opacity-60' 
                          : style === 'dark'
                            ? 'text-gray-400'
                            : style === 'colorful'
                              ? 'text-white text-opacity-60'
                              : 'text-gray-500'
                    }`}
                    style={{ 
                      width: `${segmentWidth}%`,
                      color: styleClasses.customStyles && isActive ? styleClasses.customStyles.accent : undefined
                    }}
                  >
                    {subchapter.name}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {(style === "default" || style === "minimal") && !styleClasses.customStyles && (
              <div className="mt-3 w-full mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            )}

            {style === "dark" && !styleClasses.customStyles && (
              <div className="mt-3 w-full mx-auto">
                <div className="w-full bg-gray-700 rounded-full h-3 shadow-inner overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            )}

            {style === "colorful" && !styleClasses.customStyles && (
              <div className="mt-3 w-full mx-auto">
                <div className="w-full bg-white bg-opacity-30 rounded-full h-3 shadow-lg backdrop-blur-sm overflow-hidden">
                  <div
                    className="bg-white h-3 rounded-full transition-all duration-1000 shadow-xl"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            )}

            {styleClasses.customStyles && (
              <div className="mt-3 w-full mx-auto">
                <div className="w-full bg-gray-200 bg-opacity-30 rounded-full h-3 shadow-inner backdrop-blur-sm overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ 
                      width: `${getProgressPercentage()}%`,
                      ...progressStyle
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

            {isExpired && (
              <div className="mt-4 animate-bounce">
                <div className="text-3xl md:text-4xl font-bold text-red-500 drop-shadow-2xl mb-2">
                  TIME'S UP!
                </div>
                <div className={`text-xl ${
                  style === 'dark' ? 'text-gray-300' : style === 'colorful' ? 'text-white' : 'text-gray-600'
                }`}>
                  🎉
                </div>
              </div>
            )}

            {/* Custom Message */}
            {message && !isExpired && (
              <div className={`mt-3 text-base md:text-lg font-medium px-4 py-2 rounded-lg inline-block backdrop-blur-sm ${
                style === 'dark' 
                  ? 'bg-gray-800 bg-opacity-40 text-gray-200' 
                  : style === 'colorful'
                    ? 'bg-white bg-opacity-20 text-white'
                    : styleClasses.customStyles
                      ? 'bg-white bg-opacity-25'
                      : 'bg-gray-100 text-gray-700'
              }`}
                   style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                {decodeURIComponent(message)}
              </div>
            )}

            {/* Subtle hint beneath timer */}
            {showHint && !isRunning && timeLeft > 0 && (
              <div className={`mt-3 text-sm md:text-base animate-pulse ${
                styleClasses.customStyles 
                  ? 'opacity-60' 
                  : style === 'dark' 
                    ? 'text-gray-400' 
                    : style === 'colorful'
                      ? 'text-white text-opacity-60'
                      : 'text-gray-500'
              }`} 
                   style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                👆 Click timer to start
              </div>
            )}

            {isRunning && !showControls && (
              <div className={`mt-3 text-xs md:text-sm ${
                styleClasses.customStyles 
                  ? 'opacity-50' 
                  : style === 'dark' 
                    ? 'text-gray-500' 
                    : style === 'colorful'
                      ? 'text-white text-opacity-50'
                      : 'text-gray-400'
              }`}
                   style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                Click again for controls
              </div>
            )}

            {/* Controls Panel - appears below timer when running and clicked */}
            {showControls && isRunning && (
              <div className={styleClasses.controlsPanel}>
                <button
                  onClick={toggleTimer}
                  className={styleClasses.button}
                  style={buttonStyle}
                >
                  {isRunning ? "Pause" : "Start"}
                </button>
                
                <button
                  onClick={handleReset}
                  className={styleClasses.button}
                  style={buttonStyle}
                >
                  Reset
                </button>
                
                <button
                  onClick={() => handleAddTime(60)}
                  className={styleClasses.button}
                  style={buttonStyle}
                >
                  +1 Min
                </button>
                
                <button
                  onClick={() => handleAddTime(300)}
                  className={styleClasses.button}
                  style={buttonStyle}
                >
                  +5 Min
                </button>
              </div>
            )}
          </div>

          {/* QR Code Section - Side Panel (1/4 width) */}
          {hasQrCode && (
            <div className="flex-1 flex items-center justify-center">
              <div className={`p-6 rounded-2xl shadow-2xl border backdrop-blur-lg ${
                style === 'dark'
                  ? 'bg-gray-800 bg-opacity-60 border-gray-700'
                  : style === 'colorful'
                    ? 'bg-white bg-opacity-30 border-white border-opacity-40'
                    : styleClasses.customStyles
                      ? 'bg-white bg-opacity-40 border-white border-opacity-60'
                      : 'bg-white bg-opacity-95 border-gray-200'
              }`}>
                <div className={`text-lg md:text-xl font-bold mb-4 text-center ${
                  styleClasses.customStyles 
                    ? '' 
                    : style === 'dark' 
                      ? 'text-gray-100' 
                      : style === 'colorful'
                        ? 'text-white'
                        : 'text-gray-800'
                }`}
                     style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                  {decodeURIComponent(ctaText)}
                </div>
                <div className="p-3 bg-white rounded-xl shadow-inner">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code" 
                    className="mx-auto w-full max-w-[200px]"
                  />
                </div>
                <div className={`text-xs md:text-sm mt-3 text-center ${
                  style === 'dark' 
                    ? 'text-gray-300' 
                    : style === 'colorful'
                      ? 'text-white text-opacity-80'
                      : styleClasses.customStyles
                        ? 'opacity-70'
                        : 'text-gray-600'
                }`}
                     style={styleClasses.customStyles ? { color: styleClasses.customStyles.accent } : {}}>
                  📱 Scan with your phone
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close controls */}
      {showControls && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setShowControls(false)}
        />
      )}
    </div>
  );
}
