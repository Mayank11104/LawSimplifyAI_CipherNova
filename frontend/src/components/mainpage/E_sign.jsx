import React, { useState, useRef, useEffect } from 'react';
import { Upload, Edit3, Save, X, Move, RotateCcw, Download, FileText } from 'lucide-react';

const ESignatureComponent = () => {
  const canvasRef = useRef(null);
  const documentRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureMode, setSignatureMode] = useState('draw'); // 'draw' or 'upload'
  const [signatures, setSignatures] = useState([]);
  const [activeSignature, setActiveSignature] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const [documentSigned, setDocumentSigned] = useState(false);
  const [isFullscreenSignature, setIsFullscreenSignature] = useState(false);
  const fullscreenCanvasRef = useRef(null);

  // Sample document content
  const [documentContent] = useState({
    title: "Service Agreement Contract",
    content: `
      This Service Agreement ("Agreement") is entered into on [DATE] between [COMPANY NAME] 
      ("Service Provider") and [CLIENT NAME] ("Client").
      
      1. SERVICES
      The Service Provider agrees to provide the following services:
      - Web development and design services
      - Technical consultation and support
      - Project management and delivery
      
      2. COMPENSATION
      The total compensation for the services shall be $5,000 payable in two installments:
      - 50% upon signing this agreement
      - 50% upon project completion
      
      3. TIMELINE
      The project shall commence on [START DATE] and be completed by [END DATE].
      
      4. SIGNATURES
      By signing below, both parties agree to the terms and conditions outlined in this agreement.
    `
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const fullscreenCanvas = fullscreenCanvasRef.current;
    
    // Setup regular canvas
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Clear canvas to ensure transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set drawing properties
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3; // Increased thickness
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over'; // Ensures proper transparency
    }

    // Setup fullscreen canvas
    if (fullscreenCanvas) {
      const rect = fullscreenCanvas.getBoundingClientRect();
      fullscreenCanvas.width = rect.width * window.devicePixelRatio;
      fullscreenCanvas.height = rect.height * window.devicePixelRatio;
      fullscreenCanvas.style.width = rect.width + 'px';
      fullscreenCanvas.style.height = rect.height + 'px';
      
      const ctx = fullscreenCanvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Clear canvas to ensure transparent background
      ctx.clearRect(0, 0, fullscreenCanvas.width, fullscreenCanvas.height);
      
      // Set drawing properties
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4; // Even thicker for fullscreen
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'source-over';
    }
  }, [isFullscreenSignature]);

  const startDrawing = (e) => {
    if (signatureMode !== 'draw') return;
    
    const canvas = isFullscreenSignature ? fullscreenCanvasRef.current : canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    setIsDrawing(true);
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || signatureMode !== 'draw') return;
    
    e.preventDefault();
    const canvas = isFullscreenSignature ? fullscreenCanvasRef.current : canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = isFullscreenSignature ? fullscreenCanvasRef.current : canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const openFullscreenSignature = () => {
    setIsFullscreenSignature(true);
  };

  const closeFullscreenSignature = () => {
    setIsFullscreenSignature(false);
  };

  const saveFullscreenSignature = () => {
    const canvas = fullscreenCanvasRef.current;
    
    if (isCanvasEmpty(canvas)) {
      alert('Please draw a signature first');
      return;
    }

    // Create a new canvas with transparent background for the signature
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Copy the signature with transparent background
    tempCtx.drawImage(canvas, 0, 0);
    
    // Convert to PNG with transparency
    const signatureData = tempCanvas.toDataURL('image/png');

    const newSignature = {
      id: Date.now(),
      type: 'drawn',
      data: signatureData,
      x: 50,
      y: 300,
      width: 200,
      height: 80
    };

    setSignatures([...signatures, newSignature]);
    
    // Clear both canvases
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const smallCtx = canvasRef.current.getContext('2d');
    smallCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    setIsFullscreenSignature(false);
    alert('Signature saved! Click on the document to position it.');
  };

  const saveDrawnSignature = () => {
    const canvas = canvasRef.current;
    
    if (isCanvasEmpty(canvas)) {
      alert('Please draw a signature first');
      return;
    }

    // Create a new canvas with transparent background for the signature
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Copy the signature with transparent background
    tempCtx.drawImage(canvas, 0, 0);
    
    // Convert to PNG with transparency
    const signatureData = tempCanvas.toDataURL('image/png');

    const newSignature = {
      id: Date.now(),
      type: 'drawn',
      data: signatureData,
      x: 50,
      y: 300,
      width: 200,
      height: 80
    };

    setSignatures([...signatures, newSignature]);
    clearSignature();
    alert('Signature saved! Click on the document to position it.');
  };

  const isCanvasEmpty = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.every(pixel => pixel === 0);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      alert('Please upload a PNG or JPG image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to process the uploaded image and ensure transparency
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set canvas size to image dimensions
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        
        // Draw image on transparent canvas
        tempCtx.drawImage(img, 0, 0);
        
        // Convert to PNG with transparency preserved
        const processedImageData = tempCanvas.toDataURL('image/png');

        const newSignature = {
          id: Date.now(),
          type: 'uploaded',
          data: processedImageData,
          x: 50,
          y: 300,
          width: Math.min(200, img.width),
          height: Math.min(80, img.height * (Math.min(200, img.width) / img.width))
        };

        setSignatures([...signatures, newSignature]);
        setUploadedSignature(processedImageData);
        alert('Signature uploaded! Click on the document to position it.');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentClick = (e) => {
    if (signatures.length === 0) return;
    
    const rect = documentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const latestSignature = signatures[signatures.length - 1];
    const updatedSignatures = signatures.map(sig => 
      sig.id === latestSignature.id ? { ...sig, x: x - 100, y: y - 40 } : sig
    );
    
    setSignatures(updatedSignatures);
  };

  const startDrag = (e, signature) => {
    e.stopPropagation();
    
    const rect = documentRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    // Check if clicking on resize handles
    const handleSize = 8;
    const sigRight = signature.x + signature.width;
    const sigBottom = signature.y + signature.height;
    const sigCenterX = signature.x + signature.width / 2;
    const sigCenterY = signature.y + signature.height / 2;
    
    // Corner handles
    if (x >= sigRight - handleSize && x <= sigRight + handleSize && 
        y >= sigBottom - handleSize && y <= sigBottom + handleSize) {
      setIsResizing(true);
      setResizeHandle('se');
      setActiveSignature(signature.id);
      return;
    }
    
    if (x >= signature.x - handleSize && x <= signature.x + handleSize && 
        y >= sigBottom - handleSize && y <= sigBottom + handleSize) {
      setIsResizing(true);
      setResizeHandle('sw');
      setActiveSignature(signature.id);
      return;
    }
    
    if (x >= sigRight - handleSize && x <= sigRight + handleSize && 
        y >= signature.y - handleSize && y <= signature.y + handleSize) {
      setIsResizing(true);
      setResizeHandle('ne');
      setActiveSignature(signature.id);
      return;
    }
    
    if (x >= signature.x - handleSize && x <= signature.x + handleSize && 
        y >= signature.y - handleSize && y <= signature.y + handleSize) {
      setIsResizing(true);
      setResizeHandle('nw');
      setActiveSignature(signature.id);
      return;
    }
    
    // Edge handles
    // Top edge
    if (x >= sigCenterX - handleSize && x <= sigCenterX + handleSize && 
        y >= signature.y - handleSize && y <= signature.y + handleSize) {
      setIsResizing(true);
      setResizeHandle('n');
      setActiveSignature(signature.id);
      return;
    }
    
    // Bottom edge
    if (x >= sigCenterX - handleSize && x <= sigCenterX + handleSize && 
        y >= sigBottom - handleSize && y <= sigBottom + handleSize) {
      setIsResizing(true);
      setResizeHandle('s');
      setActiveSignature(signature.id);
      return;
    }
    
    // Left edge
    if (x >= signature.x - handleSize && x <= signature.x + handleSize && 
        y >= sigCenterY - handleSize && y <= sigCenterY + handleSize) {
      setIsResizing(true);
      setResizeHandle('w');
      setActiveSignature(signature.id);
      return;
    }
    
    // Right edge
    if (x >= sigRight - handleSize && x <= sigRight + handleSize && 
        y >= sigCenterY - handleSize && y <= sigCenterY + handleSize) {
      setIsResizing(true);
      setResizeHandle('e');
      setActiveSignature(signature.id);
      return;
    }
    
    // Regular drag
    setActiveSignature(signature.id);
    setIsDragging(true);
    
    setDragOffset({
      x: x - signature.x,
      y: y - signature.y
    });
  };

  const handleDrag = (e) => {
    if (!activeSignature) return;
    
    e.preventDefault();
    const rect = documentRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    if (isResizing) {
      const updatedSignatures = signatures.map(sig => {
        if (sig.id === activeSignature) {
          const newSig = { ...sig };
          
          if (resizeHandle === 'se') {
            // Bottom-right: resize width and height
            newSig.width = Math.max(50, x - sig.x);
            newSig.height = Math.max(25, y - sig.y);
          } else if (resizeHandle === 'sw') {
            // Bottom-left: resize width (left side) and height
            const newWidth = Math.max(50, sig.x + sig.width - x);
            newSig.x = x;
            newSig.width = newWidth;
            newSig.height = Math.max(25, y - sig.y);
          } else if (resizeHandle === 'ne') {
            // Top-right: resize width and height (top side)
            const newHeight = Math.max(25, sig.y + sig.height - y);
            newSig.y = y;
            newSig.width = Math.max(50, x - sig.x);
            newSig.height = newHeight;
          } else if (resizeHandle === 'nw') {
            // Top-left: resize both position and size
            const newWidth = Math.max(50, sig.x + sig.width - x);
            const newHeight = Math.max(25, sig.y + sig.height - y);
            newSig.x = x;
            newSig.y = y;
            newSig.width = newWidth;
            newSig.height = newHeight;
          } else if (resizeHandle === 'n') {
            // Top edge: resize height from top
            const newHeight = Math.max(25, sig.y + sig.height - y);
            newSig.y = y;
            newSig.height = newHeight;
          } else if (resizeHandle === 's') {
            // Bottom edge: resize height from bottom
            newSig.height = Math.max(25, y - sig.y);
          } else if (resizeHandle === 'w') {
            // Left edge: resize width from left
            const newWidth = Math.max(50, sig.x + sig.width - x);
            newSig.x = x;
            newSig.width = newWidth;
          } else if (resizeHandle === 'e') {
            // Right edge: resize width from right
            newSig.width = Math.max(50, x - sig.x);
          }
          
          return newSig;
        }
        return sig;
      });
      
      setSignatures(updatedSignatures);
    } else if (isDragging) {
      const updatedSignatures = signatures.map(sig =>
        sig.id === activeSignature ? { ...sig, x: x - dragOffset.x, y: y - dragOffset.y } : sig
      );
      
      setSignatures(updatedSignatures);
    }
  };

  const stopDrag = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setActiveSignature(null);
  };

  const removeSignature = (signatureId) => {
    setSignatures(signatures.filter(sig => sig.id !== signatureId));
  };

  const finalizeDocument = () => {
    if (signatures.length === 0) {
      alert('Please add at least one signature before finalizing');
      return;
    }
    
    setDocumentSigned(true);
    alert('Document signed successfully! In a real implementation, this would be sent to your backend for secure storage.');
  };

  const downloadDocument = () => {
    // In a real implementation, this would generate a PDF with embedded signatures
    alert('Document download initiated. In production, this would generate a PDF with embedded signatures.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6" />
                E-Signature Integration
              </h1>
              <p className="text-gray-600 mt-1">Draw or upload signatures directly on your documents</p>
            </div>
            {documentSigned && (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium">Document Signed</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Signature Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Signature Options</h2>
              
              {/* Mode Selection */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSignatureMode('draw')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    signatureMode === 'draw'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-4 h-4 mx-auto mb-1" />
                  Draw
                </button>
                <button
                  onClick={() => setSignatureMode('upload')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    signatureMode === 'upload'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Upload className="w-4 h-4 mx-auto mb-1" />
                  Upload
                </button>
              </div>

              {/* Draw Signature */}
              {signatureMode === 'draw' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Draw your signature below:</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-32 bg-white border rounded cursor-crosshair touch-none"
                      onClick={openFullscreenSignature}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={clearSignature}
                        className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition-colors flex items-center justify-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Clear
                      </button>
                      <button
                        onClick={saveDrawnSignature}
                        className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">Click canvas for fullscreen mode</p>
                  </div>
                </div>
              )}

              {/* Upload Signature */}
              {signatureMode === 'upload' && (
                <div>
                  <p className="text-sm text-gray-600 mb-3">Upload your signature image:</p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="w-full py-3 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      Choose File
                    </button>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              )}

              {/* Signature List */}
              {signatures.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-md font-medium mb-3">Added Signatures ({signatures.length})</h3>
                  <div className="space-y-2">
                    {signatures.map((signature) => (
                      <div key={signature.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">
                          {signature.type === 'drawn' ? 'Hand-drawn' : 'Uploaded'} Signature
                        </span>
                        <button
                          onClick={() => removeSignature(signature.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={finalizeDocument}
                  disabled={signatures.length === 0 || documentSigned}
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {documentSigned ? 'Document Signed' : 'Finalize Document'}
                </button>
                
                {documentSigned && (
                  <button
                    onClick={downloadDocument}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Signed Document
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Document Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-medium text-gray-900">Document Preview</h3>
                <p className="text-sm text-gray-600">Click to position signatures</p>
              </div>
              
              <div
                ref={documentRef}
                className="relative p-8 min-h-96 cursor-crosshair"
                onClick={handleDocumentClick}
                onMouseMove={handleDrag}
                onMouseUp={stopDrag}
                onMouseLeave={stopDrag}
                onTouchMove={handleDrag}
                onTouchEnd={stopDrag}
              >
                {/* Document Content */}
                <div className="prose max-w-none">
                  <h1 className="text-xl font-bold mb-4">{documentContent.title}</h1>
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {documentContent.content}
                  </div>
                  
                  {/* Signature Lines */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <div className="border-b-2 border-gray-300 pb-2 mb-2">
                        <span className="text-xs text-gray-500">Client Signature</span>
                      </div>
                      <p className="text-xs text-gray-400">Date: _____________</p>
                    </div>
                    <div>
                      <div className="border-b-2 border-gray-300 pb-2 mb-2">
                        <span className="text-xs text-gray-500">Service Provider Signature</span>
                      </div>
                      <p className="text-xs text-gray-400">Date: _____________</p>
                    </div>
                  </div>
                </div>

                {/* Placed Signatures */}
                {signatures.map((signature) => (
                  <div
                    key={signature.id}
                    className="absolute group"
                    style={{
                      left: signature.x,
                      top: signature.y,
                      width: signature.width,
                      height: signature.height,
                      cursor: isDragging && activeSignature === signature.id ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={(e) => startDrag(e, signature)}
                    onTouchStart={(e) => startDrag(e, signature)}
                  >
                    <img
                      src={signature.data}
                      alt="Signature"
                      className="w-full h-full object-contain border-2 border-blue-300 border-dashed group-hover:border-blue-500"
                      style={{ 
                        backgroundColor: 'transparent',
                        mixBlendMode: 'multiply' // Ensures signature blends naturally with document
                      }}
                      draggable={false}
                    />
                    
                    {/* Resize Handles */}
                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Corner handles */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize" />
                      
                      {/* Edge handles */}
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-n-resize" />
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-s-resize" />
                      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-w-resize" />
                      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-e-resize" />
                    </div>
                    
                    {/* Delete button */}
                    <div className="absolute -top-6 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSignature(signature.id);
                        }}
                        className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    
                    {/* Instruction text */}
                    <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow whitespace-nowrap">
                        <Move className="w-3 h-3" />
                        Drag to move • Blue dots to resize from any side
                      </div>
                    </div>
                  </div>
                ))}

                {/* Watermark when signed - REMOVED */}
                {documentSigned && (
                  <div className="absolute top-4 right-4 pointer-events-none">
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-300">
                      Document Signed
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Signature Modal */}
        {isFullscreenSignature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Blurred Background Overlay */}
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={closeFullscreenSignature}
            ></div>
            
            {/* Modal Content */}
            <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 m-4 w-full max-w-4xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Draw Your Signature</h2>
                <button
                  onClick={closeFullscreenSignature}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col">
                <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 mb-4">
                  <canvas
                    ref={fullscreenCanvasRef}
                    className="w-full h-full bg-white rounded-lg cursor-crosshair touch-none shadow-sm"
                    style={{ minHeight: '400px' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={clearSignature}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2 font-medium"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Clear
                  </button>
                  <button
                    onClick={closeFullscreenSignature}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 font-medium"
                  >
                    <X className="w-5 h-5" />
                    Cancel
                  </button>
                  <button
                    onClick={saveFullscreenSignature}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    Done
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 text-center mt-3">
                Draw your signature above, then click "Done" to save it to the document
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ESignatureComponent;