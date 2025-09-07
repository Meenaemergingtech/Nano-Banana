import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import RestoredImageView from './components/RestoredImageView';
import { editPhoto } from './services/geminiService';
import { fileToBase64, dataURLtoFile } from './utils/fileUtils';
import { AppState, ProcessState, Point } from './types';
import SparklesIcon from './components/icons/SparklesIcon';
import XCircleIcon from './components/icons/XCircleIcon';
import TrashIcon from './components/icons/TrashIcon';
import ImageFrameIcon from './components/icons/ImageFrameIcon';
import SelectionIcon from './components/icons/SelectionIcon';
import ArrowLeftCircleIcon from './components/icons/ArrowLeftCircleIcon';
import UploadIcon from './components/icons/UploadIcon';
import HistorySlider from './components/HistorySlider';


const cropSelectionToDataURL = async (imageSrc: string, points: Point[]): Promise<string | null> => {
    return new Promise((resolve) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = imageSrc;
        image.onload = () => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            points.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
            const bboxWidth = maxX - minX;
            const bboxHeight = maxY - minY;

            if (bboxWidth <= 0 || bboxHeight <= 0) {
                resolve(null);
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = bboxWidth;
            canvas.height = bboxHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }

            ctx.beginPath();
            ctx.moveTo(points[0].x - minX, points[0].y - minY);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x - minX, points[i].y - minY);
            }
            ctx.closePath();
            ctx.clip();
            
            ctx.drawImage(image, minX, minY, bboxWidth, bboxHeight, 0, 0, bboxWidth, bboxHeight);
            
            resolve(canvas.toDataURL('image/png'));
        };
        image.onerror = () => resolve(null);
    });
};

interface HistoryItem {
    file: File;
    preview: string;
}

function App() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [selectionPoints, setSelectionPoints] = useState<Point[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [applyScope, setApplyScope] = useState<'selection' | 'image'>('image');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const referenceInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (selectionPoints.length > 2) {
        setApplyScope('selection');
    } else {
        setApplyScope('image');
    }
  }, [selectionPoints.length]);

  const handleImageUpload = (file: File) => {
    handleClearAll();
    setOriginalImage(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      setOriginalImagePreview(preview);
      setHistory([{ file, preview }]);
      setHistoryIndex(0);
    };
    reader.readAsDataURL(file);
  };

  const handleClearAll = () => {
    setOriginalImage(null);
    setOriginalImagePreview(null);
    setRestoredImage(null);
    setError(null);
    setAppState(AppState.IDLE);
    setSelectionPoints([]);
    setSourceImage(null);
    setReferenceImage(null);
    setReferenceImagePreview(null);
    setPrompt('');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHistory([]);
    setHistoryIndex(-1);
  };

  const handleSelectionChange = (points: Point[]) => {
    setSelectionPoints(points);
  };

  const handleClearSelection = () => {
    setSelectionPoints([]);
  };

  const handleSetSource = useCallback(async () => {
    if (selectionPoints.length < 3 || !originalImagePreview) return;

    const sourceDataUrl = await cropSelectionToDataURL(originalImagePreview, selectionPoints);
    setSourceImage(sourceDataUrl);
    handleClearSelection(); 
  }, [selectionPoints, originalImagePreview]);

  const handleReferenceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setReferenceImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferenceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  const handleClearReferenceImage = () => {
      setReferenceImage(null);
      setReferenceImagePreview(null);
  };

  const generateMask = useCallback(async (): Promise<string | null> => {
    if (selectionPoints.length < 3 || !originalImagePreview) return null;
  
    return new Promise((resolve) => {
      const image = new Image();
      image.src = originalImagePreview;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
  
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
  
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(selectionPoints[0].x, selectionPoints[0].y);
        for (let i = 1; i < selectionPoints.length; i++) {
          ctx.lineTo(selectionPoints[i].x, selectionPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
  
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      image.onerror = () => resolve(null);
    });
  }, [selectionPoints, originalImagePreview]);

  const handleApplyEdit = useCallback(async () => {
    if (!originalImage) {
      setError('Please upload an image first.');
      return;
    }
     if (applyScope === 'selection' && selectionPoints.length > 0 && selectionPoints.length < 3) {
      setError('A selection must have at least 3 points to form a path.');
      return;
    }
    if (!prompt) {
        setError('Please enter a prompt to describe the edit.');
        return;
    }

    setError(null);
    setRestoredImage(null);
    setAppState(AppState.PROCESSING);

    try {
      const { base64Data, mimeType } = await fileToBase64(originalImage);
      const maskBase64Data = applyScope === 'selection' && selectionPoints.length > 0 ? await generateMask() : null;
      const sourceBase64Data = sourceImage ? sourceImage.split(',')[1] : null;

      let referenceImageData: { base64Data: string; mimeType: string; } | null = null;
      if (referenceImage) {
        referenceImageData = await fileToBase64(referenceImage);
      }

      const restoredImageData = await editPhoto(
        base64Data, 
        mimeType, 
        prompt, 
        maskBase64Data, 
        sourceBase64Data,
        referenceImageData
      );
      
      if (restoredImageData) {
        setRestoredImage(`data:image/png;base64,${restoredImageData}`);
        setAppState(AppState.SUCCESS);
      } else {
        throw new Error("The AI model did not return an image. Please try again.");
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to apply edit. ${errorMessage}`);
      setAppState(AppState.ERROR);
    }
  }, [originalImage, selectionPoints, prompt, generateMask, sourceImage, applyScope, referenceImage]);

  const handleUseResultAsOriginal = useCallback(async () => {
    if (!restoredImage) return;

    const newOriginalFile = await dataURLtoFile(restoredImage, `edited-${Date.now()}.png`);
    const newPreview = restoredImage;
    const newHistoryItem = { file: newOriginalFile, preview: newPreview };

    const updatedHistory = history.slice(0, historyIndex + 1);
    setHistory([...updatedHistory, newHistoryItem]);
    const newIndex = updatedHistory.length;
    setHistoryIndex(newIndex);
    
    setOriginalImage(newOriginalFile);
    setOriginalImagePreview(newPreview);

    setRestoredImage(null);
    setError(null);
    setAppState(AppState.IDLE);
    setSelectionPoints([]);
    setSourceImage(null);
    setPrompt('');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    
  }, [restoredImage, history, historyIndex]);

  const handleSelectHistory = (index: number) => {
    if (index < 0 || index >= history.length) return;
    
    const historyItem = history[index];
    setHistoryIndex(index);

    setOriginalImage(historyItem.file);
    setOriginalImagePreview(historyItem.preview);

    setRestoredImage(null);
    setError(null);
    setAppState(AppState.IDLE);
    setSelectionPoints([]);
    setSourceImage(null);
    setPrompt('');
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  
  const handleDeleteHistory = (indexToDelete: number) => {
    const newHistory = history.filter((_, i) => i !== indexToDelete);

    if (newHistory.length === 0) {
        handleClearAll();
        return;
    }

    let newHistoryIndex = historyIndex;
    let shouldUpdateMainImage = false;

    if (indexToDelete === historyIndex) {
        newHistoryIndex = Math.max(0, indexToDelete - 1);
        shouldUpdateMainImage = true;
    } else if (indexToDelete < historyIndex) {
        newHistoryIndex = historyIndex - 1;
    } 

    setHistory(newHistory);
    setHistoryIndex(newHistoryIndex);

    if (shouldUpdateMainImage) {
        const newActiveItem = newHistory[newHistoryIndex];
        setOriginalImage(newActiveItem.file);
        setOriginalImagePreview(newActiveItem.preview);
        setRestoredImage(null);
        setError(null);
        setAppState(AppState.IDLE);
        setSelectionPoints([]);
        setSourceImage(null);
        setPrompt('');
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }
};

  const getProcessState = (): ProcessState => {
    switch (appState) {
      case AppState.PROCESSING:
        return ProcessState.LOADING;
      case AppState.SUCCESS:
        return ProcessState.SUCCESS;
      case AppState.ERROR:
        return ProcessState.ERROR;
      default:
        return ProcessState.IDLE;
    }
  };

  const isButtonDisabled = !originalImage || appState === AppState.PROCESSING || !prompt;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col font-sans">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col">
        <div className="max-w-7xl mx-auto w-full">
          <p className="text-center text-lg text-gray-400 mb-8">
            Select a part of your photo, describe an edit, and let our AI work its magic.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-8 items-start">
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-200">1. Upload & Select</h2>
              <ImageUploader 
                onImageUpload={handleImageUpload} 
                preview={originalImagePreview}
                points={selectionPoints}
                onSelectionChange={handleSelectionChange}
                onClearSelection={handleClearSelection}
                onSetSource={handleSetSource}
                zoom={zoom}
                pan={pan}
                onZoomChange={setZoom}
                onPanChange={setPan}
              />
               {originalImage && (
                <div className="w-full max-w-md mt-4 flex flex-col gap-4">
                   {sourceImage && (
                    <div>
                      <label className="block text-lg font-bold text-gray-200 mb-2">Source Patch</label>
                      <div className="relative w-24 h-24 bg-gray-800 border-2 border-gray-600 rounded-lg p-1">
                        <img src={sourceImage} alt="Source patch" className="w-full h-full object-contain" />
                        <button
                          onClick={() => setSourceImage(null)}
                          className="absolute -top-2 -right-2 bg-gray-700 rounded-full p-1 text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
                          aria-label="Clear source patch"
                          title="Clear source patch"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="prompt" className="block text-xl font-bold text-gray-200">2. Describe Your Edit</label>
                        <div className="flex items-center gap-1 bg-gray-800 p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => setApplyScope('image')}
                                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
                                    applyScope === 'image' ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-700'
                                }`}
                                title="Apply to whole image"
                            >
                                <ImageFrameIcon className="w-4 h-4" />
                                <span>Image</span>
                            </button>
                            <button
                                onClick={() => setApplyScope('selection')}
                                className={`flex items-center gap-2 px-3 py-1 text-sm rounded-md transition-colors ${
                                    applyScope === 'selection' ? 'bg-indigo-600 text-white' : 'bg-transparent text-gray-400 hover:bg-gray-700'
                                } ${selectionPoints.length < 3 ? 'opacity-50' : ''}`}
                                title="Apply to selection"
                            >
                                <SelectionIcon className="w-4 h-4" />
                                <span>Selection</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <textarea
                          id="prompt"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={
                              applyScope === 'selection'
                              ? "e.g., 'make the sky a vibrant sunset'"
                              : "e.g., 'apply a vintage film look'"
                          }
                          className="flex-grow h-24 p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          aria-label="Edit prompt"
                        />
                         <div className="flex-shrink-0">
                            <input
                                type="file"
                                ref={referenceInputRef}
                                onChange={handleReferenceFileChange}
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                id="reference-upload"
                                aria-label="Upload reference image"
                            />
                            {referenceImagePreview ? (
                                <div className="relative w-24 h-24 bg-gray-800 border-2 border-gray-600 rounded-lg p-1">
                                    <img src={referenceImagePreview} alt="Reference" className="w-full h-full object-contain" />
                                    <button
                                      onClick={handleClearReferenceImage}
                                      className="absolute -top-2 -right-2 bg-gray-700 rounded-full p-1 text-gray-300 hover:bg-red-600 hover:text-white transition-colors"
                                      aria-label="Clear reference image"
                                      title="Clear reference image"
                                    >
                                      <XCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <label htmlFor="reference-upload" title="Upload a reference image for style or content" className="flex flex-col items-center justify-center w-24 h-24 bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer p-2 text-center">
                                    <UploadIcon className="w-6 h-6 mb-1" />
                                    <span className="text-xs font-semibold">Add Reference</span>
                                </label>
                            )}
                        </div>
                    </div>
                  </div>
                  <div className="flex items-stretch gap-4">
                    <button
                      onClick={handleApplyEdit}
                      disabled={isButtonDisabled}
                      className="flex-grow inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                      aria-live="polite"
                    >
                      <SparklesIcon />
                      {appState === AppState.PROCESSING ? 'Applying Edit...' : 'Apply Edit'}
                    </button>
                    {originalImage &&
                        <button
                            onClick={handleClearAll}
                            className="inline-flex items-center justify-center p-4 bg-gray-700 text-gray-300 rounded-lg shadow-lg hover:bg-red-700 hover:text-white transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                            aria-label="Clear everything and start over"
                            title="Clear everything and start over"
                        >
                            <TrashIcon className="w-6 h-6" />
                        </button>
                    }
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center">
              {restoredImage && appState === AppState.SUCCESS && (
                <button 
                  onClick={handleUseResultAsOriginal}
                  className="p-3 text-gray-400 bg-gray-800 rounded-full border-2 border-gray-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 transition-all duration-300 transform hover:scale-110 shadow-lg"
                  title="Use this image as the new original"
                >
                    <ArrowLeftCircleIcon className="w-8 h-8" />
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl font-bold text-gray-200">Result</h2>
              <RestoredImageView 
                state={getProcessState()}
                imageUrl={restoredImage}
                error={error}
              />
            </div>
          </div>
           <HistorySlider 
              history={history}
              currentIndex={historyIndex}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
           />
        </div>
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm mt-auto">
        <p>Powered by Gemini AI. &copy; 2024 Drill Down Photo Enhancer.</p>
      </footer>
    </div>
  );
}

export default App;