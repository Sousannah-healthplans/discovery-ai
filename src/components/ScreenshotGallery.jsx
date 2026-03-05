import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Download, Calendar, Monitor, Globe, Clock, Search, Tag, X, RefreshCw } from 'lucide-react';
import { BACKEND_URL } from '../lib/config';

export default function ScreenshotGallery({ screenshots=[], showSearch=true, onRefresh, authToken=null }) {
  const [idx, setIdx] = useState(-1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [processingOCR, setProcessingOCR] = useState(new Set());
  const [updatedScreenshots, setUpdatedScreenshots] = useState(null); // Store locally updated screenshots
  const [proxyImageUrls, setProxyImageUrls] = useState({}); // id -> blob URL for auth proxy images

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return '0m 0s';
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  };

  const formatFileSize = (sizeKB) => {
    if (!sizeKB) return 'Unknown';
    if (sizeKB < 1024) return `${sizeKB} KB`;
    return `${(sizeKB / 1024).toFixed(2)} MB`;
  };

  const getFileSize = (screenshot) => {
    // First try direct fileSizeKB field
    if (screenshot.fileSizeKB) return screenshot.fileSizeKB;
    if (screenshot.data?.fileSizeKB) return screenshot.data.fileSizeKB;
    
    // Fallback: calculate from dataUrl if available (for old screenshots)
    const dataUrl = screenshot.dataUrl || screenshot.data?.dataUrl || screenshot.url;
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      try {
        const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        if (base64Part) {
          // Base64 is ~33% larger than binary: (base64Length * 3) / 4
          const approxSizeKB = Math.round((base64Part.length * 3) / 4 / 1024);
          return approxSizeKB;
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    return null;
  };

  // Get tags from screenshot (support both direct field and nested in data)
  const getTags = (screenshot) => {
    const tags = screenshot.ocrTags || screenshot.data?.ocrTags || [];
    // Debug: log if tags exist but are empty
    if (screenshot.ocrProcessed === false && tags.length === 0) {
      // OCR not processed yet - this is expected for new screenshots
    }
    return tags;
  };

  // Use updated screenshots if available, otherwise use prop screenshots
  const effectiveScreenshots = updatedScreenshots || screenshots;
  
  // Update effective screenshots when prop screenshots change
  useEffect(() => {
    if (screenshots.length > 0) {
      setUpdatedScreenshots(null); // Reset to use fresh prop data
    }
  }, [screenshots]);

  // Resolve proxy image URLs with auth (for PM Claims so img loads without CORS)
  useEffect(() => {
    if (!authToken) return;
    const list = updatedScreenshots || screenshots;
    const proxyItems = list.filter(
      (s) => (s.proxyUrl || (String(s.url || '').includes('/api/pm/screenshots/') && String(s.url || '').includes('/image')))
    );
    let cancelled = false;
    const newUrls = {};
    Promise.all(
      proxyItems.map(async (s) => {
        const key = s.id || s._id;
        const targetUrl = s.url;
        if (!key || !targetUrl) return;
        try {
          const res = await fetch(targetUrl, {
            headers: { Authorization: `Bearer ${authToken}` },
            credentials: 'include'
          });
          if (!res.ok || cancelled) return;
          const blob = await res.blob();
          if (cancelled) return;
          newUrls[key] = URL.createObjectURL(blob);
        } catch (_) {}
      })
    ).then(() => {
      if (!cancelled) setProxyImageUrls((prev) => ({ ...prev, ...newUrls }));
    });
    return () => {
      cancelled = true;
      Object.values(newUrls).forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} });
    };
  }, [authToken, screenshots, updatedScreenshots]);
  
  // Filter screenshots based on search query
  const filteredScreenshots = useMemo(() => {
    const screenshotsToFilter = effectiveScreenshots;
    if (!searchQuery.trim()) {
      return screenshotsToFilter;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return screenshotsToFilter.filter(screenshot => {
      // Search in tags
      const tags = getTags(screenshot);
      const tagMatch = tags.some(tag => tag.toLowerCase().includes(query));
      
      // Search in OCR text
      const ocrText = screenshot.ocrText || screenshot.data?.ocrText || '';
      const textMatch = ocrText.toLowerCase().includes(query);
      
      // Search in URL/title
      const urlMatch = (screenshot.url || '').toLowerCase().includes(query);
      const titleMatch = (screenshot.title || '').toLowerCase().includes(query);
      
      return tagMatch || textMatch || urlMatch || titleMatch;
    });
  }, [effectiveScreenshots, searchQuery]);

  if (screenshots.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <Eye size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No screenshots available</p>
        <p className="text-sm">Screenshots will appear here when captured during the session</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with search and view toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Eye size={16} />
          <span>
            {filteredScreenshots.length} of {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
            {searchQuery && ` (filtered)`}
          </span>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search bar */}
          {showSearch && (
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by tags or text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* No results message */}
      {filteredScreenshots.length === 0 && searchQuery && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No screenshots found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      )}

      {/* Screenshots */}
      {filteredScreenshots.length > 0 && (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
            : 'space-y-3'
        }>
          {filteredScreenshots.map((screenshot, i) => {
            const tags = getTags(screenshot);
            const isProxy = authToken && (screenshot.proxyUrl || (String(screenshot.url || '').includes('/api/pm/screenshots/') && String(screenshot.url || '').includes('/image')));
            const imgSrc = isProxy ? proxyImageUrls[screenshot.id] : screenshot.url;
            const hasValidUrl = isProxy ? !!proxyImageUrls[screenshot.id] : (screenshot.url && screenshot.url.length > 0);
            return (
          <motion.div
            key={screenshot.id || i}
            onClick={() => setIdx(i)}
            className={
              viewMode === 'grid'
                ? 'group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer'
                : 'group w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-4 p-3 cursor-pointer'
            }
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {viewMode === 'grid' ? (
              <>
                <div className="relative overflow-hidden">
                  {hasValidUrl ? (
                    <img 
                      src={imgSrc || screenshot.url} 
                      alt={`Screenshot ${i + 1}`} 
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                      // If image fails to load, try to regenerate from public_id if available
                      const img = e.target;
                      const screenshotData = screenshot;
                      
                      // Check if we have cloudinaryPublicId to regenerate URL
                      if (screenshotData.cloudinaryPublicId && !img.dataset.retried) {
                        img.dataset.retried = 'true';
                        // Try regenerating URL from public_id (basic attempt)
                        const publicId = screenshotData.cloudinaryPublicId;
                        // Extract cloud name from original URL if possible
                        const urlMatch = screenshot.url?.match(/res\.cloudinary\.com\/([^/]+)\//);
                        if (urlMatch) {
                          const cloudName = urlMatch[1];
                          const regeneratedUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${publicId}.jpg`;
                          img.src = regeneratedUrl;
                          return; // Let it try the regenerated URL
                        }
                      }
                      
                      // If regeneration failed or not possible, show error placeholder
                      img.style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'w-full h-32 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400';
                      errorDiv.textContent = 'Image unavailable';
                      img.parentNode.appendChild(errorDiv);
                    }}
                    />
                  ) : isProxy ? (
                    <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                      <RefreshCw size={20} className="animate-spin opacity-60" />
                      <span className="ml-2">Loading…</span>
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                      No image URL
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    #{i + 1}
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Monitor size={12} />
                    <span>{screenshot.device || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Globe size={12} />
                    <span>{screenshot.browser || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <Calendar size={12} />
                    <span>{formatTimestamp(screenshot.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span className="font-medium text-cyan-600 dark:text-cyan-400">
                      {formatFileSize(getFileSize(screenshot))}
                    </span>
                  </div>
                  {/* Tags */}
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 3).map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          +{tags.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (screenshot.ocrProcessed === false || screenshot.ocrProcessed === undefined) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find the index of this screenshot and trigger OCR
                        const screenshotIndex = filteredScreenshots.findIndex(s => s.id === screenshot.id);
                        if (screenshotIndex >= 0) {
                          setIdx(screenshotIndex);
                          // Small delay to let modal open, then trigger OCR
                          setTimeout(() => {
                            const modalScreenshot = filteredScreenshots[screenshotIndex];
                            if (modalScreenshot && (!modalScreenshot.ocrProcessed || modalScreenshot.ocrProcessed === undefined)) {
                              // Trigger the OCR processing function
                              const baseUrl = BACKEND_URL;
                              const token = localStorage.getItem('authToken') || '';
                              const eventId = modalScreenshot._id || (modalScreenshot.id?.includes('_') ? modalScreenshot.id.split('_')[0] : modalScreenshot.id);
                              
                              if (eventId) {
                                setProcessingOCR(prev => new Set(prev).add(modalScreenshot.id));
                                fetch(`${baseUrl}/api/analytics/screenshots/${eventId}/process-ocr`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  }
                                })
                                .then(res => res.json())
                                .then(result => {
                                  console.log('[OCR] Result:', result);
                                  if (onRefresh) onRefresh();
                                })
                                .catch(err => {
                                  console.error('[OCR] Error:', err);
                                  alert(`Failed to process OCR: ${err.message}`);
                                })
                                .finally(() => {
                                  setProcessingOCR(prev => {
                                    const next = new Set(prev);
                                    next.delete(modalScreenshot.id);
                                    return next;
                                  });
                                });
                              }
                            }
                          }, 100);
                        }
                      }}
                      className="mt-2 w-full px-2 py-1 text-[10px] bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                    >
                      Process OCR
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="relative w-20 h-20 flex-shrink-0">
                  {hasValidUrl ? (
                    <img 
                      src={imgSrc || screenshot.url} 
                      alt={`Screenshot ${i + 1}`} 
                      className="w-full h-full object-cover rounded-lg" 
                    />
                  ) : isProxy ? (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 rounded-lg">
                      <RefreshCw size={14} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] text-slate-500 dark:text-slate-400 rounded-lg">
                      No URL
                    </div>
                  )}
                  <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded text-[10px]">
                    #{i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Monitor size={14} />
                      <span>{screenshot.device || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe size={14} />
                      <span>{screenshot.browser || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDuration(screenshot.duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-cyan-600 dark:text-cyan-400">
                        {formatFileSize(getFileSize(screenshot))}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">
                    {formatTimestamp(screenshot.timestamp)}
                  </div>
                  {/* Tags in list view */}
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 5).map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                      {tags.length > 5 && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          +{tags.length - 5}
                        </span>
                      )}
                    </div>
                  ) : (screenshot.ocrProcessed === false || screenshot.ocrProcessed === undefined) ? (
                    <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 italic">
                      Click to process OCR
                    </div>
                  ) : null}
                </div>
              </>
            )}
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {idx >= 0 && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-6"
            onClick={() => setIdx(-1)}
          >
            <motion.div 
              className="max-w-6xl w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image */}
              <div className="relative flex-shrink-0">
                {(proxyImageUrls[filteredScreenshots[idx]?.id] || filteredScreenshots[idx]?.url) ? (
                  <img 
                    src={proxyImageUrls[filteredScreenshots[idx]?.id] || filteredScreenshots[idx].url} 
                    alt={`Screenshot ${idx + 1}`} 
                    className="w-full h-auto max-h-[50vh] object-contain"
                    onError={(e) => {
                    // If image fails to load in modal, show error message
                    e.target.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'w-full h-[70vh] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg text-slate-500 dark:text-slate-400';
                    errorDiv.innerHTML = '<div class="text-center"><p class="mb-2">Image unavailable</p><p class="text-sm">The screenshot may have been deleted or the URL is invalid.</p></div>';
                    e.target.parentNode.appendChild(errorDiv);
                  }}
                  />
                ) : (
                  <div className="w-full h-[50vh] bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-lg text-slate-500 dark:text-slate-400">
                    <div className="text-center">
                      <p className="mb-2">No image URL available</p>
                      <p className="text-sm">The screenshot URL is missing or invalid.</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setIdx(-1)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Info - Scrollable */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Screenshot {filteredScreenshots.findIndex(s => s === filteredScreenshots[idx]) + 1} of {filteredScreenshots.length}
                  </h3>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = filteredScreenshots[idx]?.url;
                      link.download = `screenshot-${idx + 1}.png`;
                      link.click();
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                  >
                    <Download size={16} />
                    Download
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Device</div>
                    <div className="font-medium">{filteredScreenshots[idx]?.device || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Browser</div>
                    <div className="font-medium">{filteredScreenshots[idx]?.browser || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Country</div>
                    <div className="font-medium">{filteredScreenshots[idx]?.country || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 mb-1">File Size</div>
                    <div className="font-medium">{formatFileSize(getFileSize(filteredScreenshots[idx]))}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 mb-1">Captured</div>
                    <div className="font-medium">{formatTimestamp(filteredScreenshots[idx]?.timestamp)}</div>
                  </div>
                </div>
                
                {/* Tags Section - Always visible under screenshot info */}
                {(() => {
                  const currentScreenshot = filteredScreenshots[idx];
                  if (!currentScreenshot) {
                    return (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Loading screenshot data...</div>
                      </div>
                    );
                  }
                  
                  const tags = getTags(currentScreenshot);
                  const isProcessing = processingOCR.has(currentScreenshot.id);
                  // Show button if OCR not processed, or if processed but no tags (might need reprocessing)
                  const needsOCR = currentScreenshot.ocrProcessed === false || 
                                   currentScreenshot.ocrProcessed === undefined || 
                                   (currentScreenshot.ocrProcessed === true && tags.length === 0);
                  
                  console.log('[ScreenshotGallery] Modal screenshot data:', {
                    id: currentScreenshot.id,
                    _id: currentScreenshot._id,
                    ocrProcessed: currentScreenshot.ocrProcessed,
                    ocrProcessedType: typeof currentScreenshot.ocrProcessed,
                    tagsLength: tags.length,
                    needsOCR,
                    hasOcrText: !!currentScreenshot.ocrText,
                    ocrTags: currentScreenshot.ocrTags,
                    ocrTagsType: Array.isArray(currentScreenshot.ocrTags),
                    allTags: tags,
                    directOcrTags: currentScreenshot.ocrTags,
                    dataOcrTags: currentScreenshot.data?.ocrTags
                  });
                  
                  const handleProcessOCR = async () => {
                    if (!currentScreenshot.id || isProcessing) return;
                    
                    setProcessingOCR(prev => new Set(prev).add(currentScreenshot.id));
                    
                    try {
                      const baseUrl = BACKEND_URL;
                      const token = localStorage.getItem('authToken') || '';
                      // Use MongoDB _id directly, or extract from id format: _id_idx
                      const eventId = currentScreenshot._id || (currentScreenshot.id?.includes('_') ? currentScreenshot.id.split('_')[0] : currentScreenshot.id);
                      
                      if (!eventId) {
                        throw new Error('No event ID available');
                      }
                      
                      console.log('[OCR] Triggering OCR for event:', eventId);
                      
                      const response = await fetch(`${baseUrl}/api/analytics/screenshots/${eventId}/process-ocr`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                      }
                      
                      const result = await response.json();
                      console.log('[OCR] Manual processing result:', result);
                      
                      if (result.success) {
                        console.log('[OCR] Success! Tags:', result.ocrTags);
                        // Update the screenshot data immediately for instant feedback
                        const updatedScreenshot = {
                          ...currentScreenshot,
                          ocrText: result.ocrText || '',
                          ocrTags: result.ocrTags || [],
                          ocrProcessed: true
                        };
                        
                        // Update local state immediately to show tags right away
                        const updatedList = [...effectiveScreenshots];
                        const screenshotIndex = updatedList.findIndex(s => s.id === currentScreenshot.id);
                        if (screenshotIndex >= 0) {
                          updatedList[screenshotIndex] = updatedScreenshot;
                          setUpdatedScreenshots(updatedList);
                          console.log('[OCR] ✅ Updated local state with tags:', result.ocrTags);
                        }
                        
                        // Also refresh from API to ensure consistency
                        if (onRefresh) {
                          setTimeout(() => {
                            console.log('[OCR] Refreshing from API...');
                            onRefresh();
                          }, 1000);
                        }
                      } else if (result.success && result.message === 'No text found in image') {
                        alert('No text could be extracted from this screenshot.');
                        // Still refresh to update the processed status
                        if (onRefresh) {
                          setTimeout(() => onRefresh(), 500);
                        }
                      } else {
                        console.warn('[OCR] Unexpected result:', result);
                        if (onRefresh) {
                          setTimeout(() => onRefresh(), 1000);
                        }
                      }
                    } catch (error) {
                      console.error('[OCR] Failed to process:', error);
                      alert(`Failed to process OCR: ${error.message}\n\nCheck the browser console for more details.`);
                    } finally {
                      setProcessingOCR(prev => {
                        const next = new Set(prev);
                        next.delete(currentScreenshot.id);
                        return next;
                      });
                    }
                  };
                  
                  return (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                          <Tag size={18} className="text-cyan-600 dark:text-cyan-400" />
                          <span>Tags</span>
                          {tags.length > 0 && (
                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                              ({tags.length})
                            </span>
                          )}
                        </div>
                        {(needsOCR || tags.length === 0) && (
                          <button
                            onClick={handleProcessOCR}
                            disabled={isProcessing}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-lg transition-colors"
                          >
                            <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                            {isProcessing ? 'Processing...' : 'Process OCR'}
                          </button>
                        )}
                      </div>
                      {tags.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 min-h-[40px]">
                            {tags.map((tag, tagIdx) => (
                              <span
                                key={tagIdx}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded-full border border-cyan-200 dark:border-cyan-800 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors cursor-default"
                                title={`Tag ${tagIdx + 1} of ${tags.length}: ${tag}`}
                              >
                                <Tag size={12} className="flex-shrink-0" />
                                <span className="whitespace-nowrap">{tag}</span>
                              </span>
                            ))}
                          </div>
                          {currentScreenshot.ocrText && (
                            <details className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                              <summary className="cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                                View extracted text ({currentScreenshot.ocrText.length} chars)
                              </summary>
                              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs max-h-32 overflow-auto">
                                {currentScreenshot.ocrText.substring(0, 500)}
                                {currentScreenshot.ocrText.length > 500 && '...'}
                              </div>
                            </details>
                          )}
                        </div>
                      ) : needsOCR && !isProcessing ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400 italic py-2">
                          No tags yet. Click "Process OCR" to extract text and tags from this screenshot.
                        </div>
                      ) : isProcessing ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400 italic flex items-center gap-2 py-2">
                          <RefreshCw size={14} className="animate-spin" />
                          Processing OCR... This may take 10-30 seconds.
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 dark:text-slate-400 italic py-2">
                          No text found in this screenshot.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              
              {/* Navigation */}
              <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setIdx(i => (i - 1 + filteredScreenshots.length) % filteredScreenshots.length)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  disabled={filteredScreenshots.length <= 1}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                
                <div className="flex gap-1">
                  {filteredScreenshots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === idx ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
                
                <button 
                  onClick={() => setIdx(i => (i + 1) % filteredScreenshots.length)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  disabled={filteredScreenshots.length <= 1}
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


