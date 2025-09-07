import React, { useRef, useCallback, useState, MouseEvent, useEffect } from 'react';
import ImageIcon from './icons/ImageIcon';
import XCircleIcon from './icons/XCircleIcon';
import ScissorsIcon from './icons/ScissorsIcon';
import ZoomInIcon from './icons/ZoomInIcon';
import ZoomOutIcon from './icons/ZoomOutIcon';
import ExpandIcon from './icons/ExpandIcon';
import { Point } from '../types';
import PolygonIcon from './icons/PolygonIcon';
import SquareIcon from './icons/SquareIcon';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  preview: string | null;
  points: Point[];
  onSelectionChange: (points: Point[]) => void;
  onClearSelection: () => void;
  onSetSource: () => void;
  zoom: number;
  pan: Point;
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: Point) => void;
}

const ZOOM_SPEED = 1.2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

type SelectionMode = 'polygon' | 'rectangle';

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUpload, 
  preview, 
  points, 
  onSelectionChange, 
  onClearSelection, 
  onSetSource,
  zoom,
  pan,
  onZoomChange,
  onPanChange
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageDimensions, setImageDimensions] = useState({width: 0, height: 0});
  const [isClosed, setIsClosed] = useState(false);

  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const panStarted = useRef(false);

  const [selectionMode, setSelectionMode] = useState<SelectionMode>('polygon');
  const [isDrawingRect, setIsDrawingRect] = useState(false);
  const [rectStartPoint, setRectStartPoint] = useState<Point | null>(null);
  const [rectEndPoint, setRectEndPoint] = useState<Point | null>(null);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            setIsSpacePressed(true);
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

        if (e.code === 'Space') {
            e.preventDefault();
            setIsSpacePressed(false);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getPointOnImage = useCallback((clientX: number, clientY: number): Point | null => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!img || !container || !preview) return null;

    const containerRect = container.getBoundingClientRect();
    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;

    const unzoomedX = (mouseX - pan.x) / zoom;
    const unzoomedY = (mouseY - pan.y) / zoom;

    const { naturalWidth, naturalHeight } = img;
    const { clientWidth, clientHeight } = container;
    const ratio = Math.min(clientWidth / naturalWidth, clientHeight / naturalHeight);
    const displayedWidth = naturalWidth * ratio;
    const displayedHeight = naturalHeight * ratio;
    const offsetX = (clientWidth - displayedWidth) / 2;
    const offsetY = (clientHeight - displayedHeight) / 2;

    const pointOnImageX = unzoomedX - offsetX;
    const pointOnImageY = unzoomedY - offsetY;

    const naturalX = pointOnImageX * (naturalWidth / displayedWidth);
    const naturalY = pointOnImageY * (naturalHeight / displayedHeight);

    if (naturalX >= 0 && naturalX <= naturalWidth && naturalY >= 0 && naturalY <= naturalHeight) {
      return { x: naturalX, y: naturalY };
    }
    return null;
  }, [preview, zoom, pan]);

  const resetSelection = useCallback(() => {
      onClearSelection();
      setIsClosed(false);
      setIsDrawingRect(false);
      setRectStartPoint(null);
      setRectEndPoint(null);
  }, [onClearSelection]);

  const switchMode = (mode: SelectionMode) => {
    if (mode === selectionMode) return;
    resetSelection();
    setSelectionMode(mode);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      resetSelection();
      onImageUpload(event.target.files[0]);
    }
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    containerRef.current?.classList.add('border-indigo-500', 'bg-gray-700');
  }, []);
  
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    containerRef.current?.classList.remove('border-indigo-500', 'bg-gray-700');
  }, []);
  
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    containerRef.current?.classList.remove('border-indigo-500', 'bg-gray-700');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      resetSelection();
      onImageUpload(event.dataTransfer.files[0]);
    }
  }, [onImageUpload, resetSelection]);

  const handlePointClick = (e: MouseEvent) => {
      e.stopPropagation();
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageDimensions({
        width: e.currentTarget.naturalWidth,
        height: e.currentTarget.naturalHeight
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 1 / ZOOM_SPEED : ZOOM_SPEED;
    const newZoom = Math.max(MIN_ZOOM, Math.min(zoom * delta, MAX_ZOOM));
    
    const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
    
    onZoomChange(newZoom);
    onPanChange({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpacePressed && e.button === 0) {
      e.preventDefault();
      setIsPanning(true);
      panStarted.current = true;
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }
    
    if (selectionMode === 'rectangle' && e.button === 0 && !isClosed && preview) {
      const point = getPointOnImage(e.clientX, e.clientY);
      if (point) {
        setIsDrawingRect(true);
        setRectStartPoint(point);
        setRectEndPoint(point);
      }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      e.preventDefault();
      onPanChange({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
      return;
    }

    if (isDrawingRect && e.buttons === 1) {
      const point = getPointOnImage(e.clientX, e.clientY);
      if (point) {
        setRectEndPoint(point);
      }
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawingRect && rectStartPoint && rectEndPoint) {
      setIsDrawingRect(false);
      const p1 = rectStartPoint;
      const p2 = { x: rectEndPoint.x, y: rectStartPoint.y };
      const p3 = rectEndPoint;
      const p4 = { x: rectStartPoint.x, y: rectEndPoint.y };
      onSelectionChange([p1, p2, p3, p4]);
      setIsClosed(true);
    }

    setTimeout(() => { panStarted.current = false; }, 0);
  };
  
  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (panStarted.current || isClosed || e.button !== 0 || isDrawingRect) return;

    if (e.detail > 1) {
        return;
    }
    
    if (!preview) {
      // If no image is loaded, a click on this container should trigger the file input.
      // This is simpler and more robust than the previous implementation that relied on
      // checking the click target, which failed when the label filled the container.
      inputRef.current?.click();
      return;
    }

    if (selectionMode === 'polygon') {
      const point = getPointOnImage(e.clientX, e.clientY);
      if(point) {
        onSelectionChange([...points, point]);
      }
    }
  };

  const handleDoubleClick = () => {
    if (selectionMode === 'polygon' && points.length > 2 && !isClosed) {
        setIsClosed(true);
    }
  };

  const handleResetView = () => {
    onZoomChange(1);
    onPanChange({ x: 0, y: 0 });
  };

  const getCursor = () => {
    if (!preview) return 'cursor-pointer';
    if (isSpacePressed) return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (isClosed) return 'cursor-default';
    return 'cursor-crosshair';
  };

  const instructionText = () => {
    if (isClosed) return 'Selection complete.';
    if (selectionMode === 'polygon') {
      if (points.length > 0) return 'Click to add points. Double-click to close.';
      return 'Click to start selection.';
    }
    if (selectionMode === 'rectangle') {
      return 'Click and drag to select an area.';
    }
    return 'Hold [Space] to pan. Scroll to zoom.';
  };

  return (
    <div className="w-full max-w-md">
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onWheel={preview ? handleWheel : undefined}
        onMouseDown={preview ? handleMouseDown : undefined}
        onMouseMove={preview ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleContainerClick}
        onDoubleClick={preview ? handleDoubleClick : undefined}
        className={`w-full aspect-square bg-gray-800 rounded-xl shadow-inner border-2 border-dashed border-gray-600 p-4 transition-colors duration-300 flex items-center justify-center relative overflow-hidden ${getCursor()}`}
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp"
          className="hidden"
          id="image-upload"
          aria-label="Upload image"
        />

        {preview ? (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
            }}
          >
            <div className="w-full h-full relative" role="img" aria-label="Image canvas for selection">
              <img ref={imageRef} src={preview} alt="Original preview" onLoad={handleImageLoad} className="w-full h-full object-contain" />
              <svg 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none" 
                  viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                  preserveAspectRatio="xMidYMid meet"
              >
                  <polygon
                      points={points.map(p => `${p.x},${p.y}`).join(' ')}
                      fill={isClosed ? "rgba(79, 70, 229, 0.4)" : "none"}
                      stroke="rgb(129 140 248)"
                      strokeWidth={2 / zoom}
                      strokeDasharray={isClosed ? "none" : `${6 / zoom}`}
                      style={{ vectorEffect: 'non-scaling-stroke' }}
                  />
                  {isDrawingRect && rectStartPoint && rectEndPoint && (
                    <rect
                        x={Math.min(rectStartPoint.x, rectEndPoint.x)}
                        y={Math.min(rectStartPoint.y, rectEndPoint.y)}
                        width={Math.abs(rectStartPoint.x - rectEndPoint.x)}
                        height={Math.abs(rectStartPoint.y - rectEndPoint.y)}
                        fill="rgba(79, 70, 229, 0.2)"
                        stroke="rgb(129 140 248)"
                        strokeWidth={2 / zoom}
                        strokeDasharray={`${6 / zoom}`}
                        style={{ vectorEffect: 'non-scaling-stroke' }}
                    />
                  )}
                  {selectionMode === 'polygon' && !isClosed && points.map((p, index) => (
                      <circle
                          key={index}
                          cx={p.x}
                          cy={p.y}
                          r={8 / zoom}
                          fill={index === 0 ? 'rgb(129 140 248)' : 'white'}
                          stroke="black"
                          strokeWidth={2 / zoom}
                          onClick={handlePointClick}
                          className="pointer-events-auto"
                          style={{ vectorEffect: 'non-scaling-stroke', cursor: 'default' }}
                      />
                  ))}
              </svg>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 cursor-pointer rounded-lg">
            <div className="text-center">
              <ImageIcon className="mx-auto h-16 w-16 text-gray-500" />
              <p className="mt-2 font-semibold text-indigo-400">Click to upload or drag & drop</p>
              <p className="text-sm text-gray-500">PNG, JPG, or WEBP</p>
            </div>
          </div>
        )}

        {preview && (
           <>
            <div className="absolute top-4 left-4 z-10 flex gap-1 bg-gray-900/60 p-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
                <button 
                    onClick={() => switchMode('polygon')} 
                    className={`p-2 rounded-md transition-colors ${selectionMode === 'polygon' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700/80'}`} 
                    aria-label="Free-form selection"
                    title="Free-form selection"
                >
                    <PolygonIcon className="w-5 h-5" />
                </button>
                 <button 
                    onClick={() => switchMode('rectangle')} 
                    className={`p-2 rounded-md transition-colors ${selectionMode === 'rectangle' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700/80'}`} 
                    aria-label="Rectangle selection"
                    title="Rectangle selection"
                >
                    <SquareIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-gray-900/60 p-1.5 rounded-lg backdrop-blur-sm border border-gray-700">
                <button onClick={() => onZoomChange(Math.min(zoom * ZOOM_SPEED, MAX_ZOOM))} className="p-2 text-gray-300 hover:bg-gray-700/80 rounded-md transition-colors" aria-label="Zoom in" title="Zoom in">
                    <ZoomInIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onZoomChange(Math.max(zoom / ZOOM_SPEED, MIN_ZOOM))} className="p-2 text-gray-300 hover:bg-gray-700/80 rounded-md transition-colors" aria-label="Zoom out" title="Zoom out">
                    <ZoomOutIcon className="w-5 h-5" />
                </button>
                <button onClick={handleResetView} className="p-2 text-gray-300 hover:bg-gray-700/80 rounded-md transition-colors" aria-label="Reset view" title="Fit to screen">
                    <ExpandIcon className="w-5 h-5" />
                </button>
            </div>
          </>
        )}
      </div>

       {preview && (
        <div className="w-full mt-4 flex justify-between items-center min-h-[40px]">
          <p className="text-sm text-gray-400">
              {instructionText()}
          </p>
          <div className="flex items-center gap-2">
              {isClosed && (
                  <button
                      onClick={onSetSource}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors"
                      aria-label="Copy selection as source"
                      title="Use the selected area as a source patch for cloning"
                  >
                      <ScissorsIcon className="w-4 h-4" />
                      Use as Source
                  </button>
              )}
              {points.length > 0 && (
                <button 
                  onClick={resetSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-red-800/50 text-gray-300 hover:text-red-300 rounded-md transition-colors"
                  aria-label="Clear selection"
                  title="Clear the current selection"
                >
                  <XCircleIcon className="w-4 h-4" />
                  Clear
                </button>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
