import React, { useState, useEffect, useRef } from 'react';
import { Save, ZoomIn, ZoomOut, Move, Crop, RotateCw, RotateCcw, Check, X } from 'lucide-react';

interface LogoEditorProps {
  imageUrl: string | null;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export const LogoEditor: React.FC<LogoEditorProps> = ({ imageUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  
  // Canvas dimensions
  const canvasWidth = 400;
  const canvasHeight = 200;
  
  // Load image when URL changes
  useEffect(() => {
    if (!imageUrl) return;
    
    setIsLoading(true);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      
      // Calculate initial scale to fit the image within the canvas
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      const initialScale = Math.min(scaleX, scaleY, 1); // Don't scale up small images
      
      setScale(initialScale);
      
      // Center the image
      const scaledWidth = img.width * initialScale;
      const scaledHeight = img.height * initialScale;
      setPosition({
        x: (canvasWidth - scaledWidth) / 2,
        y: (canvasHeight - scaledHeight) / 2
      });
      
      setIsLoading(false);
      drawImage();
    };
    
    img.onerror = () => {
      setIsLoading(false);
      console.error('Error loading image');
    };
    
    img.src = imageUrl;
  }, [imageUrl]);
  
  // Draw the image on the canvas
  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context state
    ctx.save();
    
    // Translate to the center of the image
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const centerX = position.x + scaledWidth / 2;
    const centerY = position.y + scaledHeight / 2;
    
    // Apply transformations
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
    
    // Draw the image
    ctx.drawImage(
      img,
      position.x,
      position.y,
      scaledWidth,
      scaledHeight
    );
    
    // Restore context state
    ctx.restore();
  };
  
  // Update canvas when parameters change
  useEffect(() => {
    if (!isLoading) {
      drawImage();
    }
  }, [scale, position, rotation, isLoading]);
  
  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isLoading) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || isLoading) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    setPosition({
      x: position.x + deltaX,
      y: position.y + deltaY
    });
    
    setDragStart({ x, y });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle zoom in/out
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.1));
  };
  
  // Handle rotation
  const handleRotateClockwise = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  const handleRotateCounterClockwise = () => {
    setRotation(prev => (prev - 90 + 360) % 360);
  };
  
  // Handle save
  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get the data URL from the canvas
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Logo Editor</h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="mb-4">
        <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-gray-100">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className={`w-full cursor-${isDragging ? 'grabbing' : 'grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scale: {Math.round(scale * 100)}%
          </label>
          <div className="flex items-center">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-gray-100 rounded-l-md hover:bg-gray-200"
              disabled={scale <= 0.1}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="10"
              max="300"
              value={scale * 100}
              onChange={(e) => setScale(Number(e.target.value) / 100)}
              className="flex-1 mx-2"
            />
            <button
              onClick={handleZoomIn}
              className="p-2 bg-gray-100 rounded-r-md hover:bg-gray-200"
              disabled={scale >= 3}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rotation: {rotation}°
          </label>
          <div className="flex items-center">
            <button
              onClick={handleRotateCounterClockwise}
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200 mr-2"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotateClockwise}
              className="p-2 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          <Move className="w-4 h-4 inline mr-1" />
          Drag to position the logo
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};
