import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Eraser, Loader2, RefreshCcw, Palette, Sliders, Sun, Plus, Paintbrush, Undo2, Redo2, Sparkles, Wand2, Eye, Image as ImageIcon } from 'lucide-react';

const API_URL = 'http://localhost:8001';

const PRESET_COLORS = [
  { name: 'Transparent', value: '#ffffff00' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Gray', value: '#64748b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
];

function App() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBgRemoved, setIsBgRemoved] = useState(false);
  
  const [bgColor, setBgColor] = useState('#ffffff00');
  const [smoothness, setSmoothness] = useState(15);
  const [addShadow, setAddShadow] = useState(false);
  
  // Brush Settings - Default to 'none'
  const [brushSize, setBrushSize] = useState(20);
  const [brushMode, setBrushMode] = useState<'erase' | 'restore' | 'magic' | 'none'>('none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // History Settings
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const maskContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const brushPreviewRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    if (newHistory.length > 21) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    restoreFromHistory(history[prevIndex]);
    setHistoryIndex(prevIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    restoreFromHistory(history[nextIndex]);
    setHistoryIndex(nextIndex);
  };

  const restoreFromHistory = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      if (!canvas || !ctx) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const updateBrushPreview = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const preview = brushPreviewRef.current;
    if (!canvas || !preview || brushMode === 'none') {
      if (preview) preview.style.display = 'none';
      return;
    }

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Only show circle if we are inside the canvas area
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      preview.style.display = 'none';
      return;
    }

    const scaleX = rect.width / canvas.width;
    const displaySize = brushSize * scaleX;
    preview.style.position = 'fixed';
    preview.style.width = `${displaySize}px`;
    preview.style.height = `${displaySize}px`;
    preview.style.left = `${clientX - displaySize / 2}px`;
    preview.style.top = `${clientY - displaySize / 2}px`;
    preview.style.display = 'block';
    
    if (brushMode === 'magic') {
      preview.style.borderColor = '#ef4444';
      preview.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
    } else {
      preview.style.borderColor = 'white';
      preview.style.backgroundColor = 'transparent';
    }
  };

  const hideBrushPreview = () => {
    if (brushPreviewRef.current) brushPreviewRef.current.style.display = 'none';
  };

  const loadImageToCanvas = (url: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;
      if (!canvas || !maskCanvas) {
        setTimeout(() => loadImageToCanvas(url), 100);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx || !mCtx) return;

      contextRef.current = ctx;
      maskContextRef.current = mCtx;

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      saveToHistory();
    };
    img.src = url;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      setIsBgRemoved(false);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        const img = new Image();
        img.onload = () => { 
          originalImageRef.current = img;
          loadImageToCanvas(reader.result as string);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const processWithAI = async () => {
    if (!canvasRef.current) return;
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const currentBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!currentBlob) {
      setIsProcessing(false);
      return;
    }
    
    const formData = new FormData();
    formData.append('file', currentBlob, 'image.png');
    formData.append('bg_color', ''); 
    formData.append('smoothness', smoothness.toString());
    formData.append('add_shadow', addShadow.toString());
    
    console.log(`Attempting to reach backend at: ${API_URL}/remove-bg`);
    
    try {
      const response = await fetch(`${API_URL}/remove-bg`, { 
        method: 'POST', 
        body: formData,
        // Adding mode explicitly
        mode: 'cors'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      loadImageToCanvas(url);
      setIsBgRemoved(true);
    } catch (error) {
      console.error('Fetch error:', error);
      alert(`Connection Error!\n\nDetails: ${error instanceof Error ? error.message : String(error)}\n\nPlease ensure your backend is running at ${API_URL}`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!originalFile || !isBgRemoved) return;
    const timer = setTimeout(() => { processWithAI(); }, 500);
    return () => clearTimeout(timer);
  }, [smoothness, addShadow]);

  const applyMagicRemover = async () => {
    if (!canvasRef.current || !maskCanvasRef.current || !originalFile) return;
    setIsProcessing(true);
    const canvas = canvasRef.current;
    const currentImageBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    const tempMaskCanvas = document.createElement('canvas');
    tempMaskCanvas.width = canvas.width;
    tempMaskCanvas.height = canvas.height;
    const tempCtx = tempMaskCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.fillStyle = 'black';
      tempCtx.fillRect(0, 0, tempMaskCanvas.width, tempMaskCanvas.height);
      tempCtx.shadowBlur = 2;
      tempCtx.shadowColor = 'white';
      tempCtx.filter = 'contrast(200%) brightness(200%)';
      tempCtx.drawImage(maskCanvasRef.current, 0, 0);
    }
    const maskBlob = await new Promise<Blob | null>(resolve => tempMaskCanvas.toBlob(resolve, 'image/png'));
    if (!currentImageBlob || !maskBlob) { setIsProcessing(false); return; }
    const formData = new FormData();
    formData.append('image', currentImageBlob);
    formData.append('mask', maskBlob);
    try {
      const response = await fetch(`${API_URL}/inpaint`, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to inpaint');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      loadImageToCanvas(url);
      if (maskContextRef.current) { maskContextRef.current.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height); }
    } catch (error) {
      console.error(error);
      alert('Magic Remover Error: Please ensure your backend is running.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => { 
    if (brushMode === 'none') return;
    setIsDrawing(true); 
    draw(e); 
  };
  const stopDrawing = () => { if (isDrawing && brushMode !== 'magic') { saveToHistory(); } setIsDrawing(false); if (contextRef.current) contextRef.current.beginPath(); if (maskContextRef.current) maskContextRef.current.beginPath(); };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current || !originalImageRef.current || !maskContextRef.current || brushMode === 'none') return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get the actual computed border width from the element
    const style = window.getComputedStyle(canvas);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    
    const innerWidth = rect.width - (parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth));
    const innerHeight = rect.height - (parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth));
    
    const scaleX = canvas.width / innerWidth;
    const scaleY = canvas.height / innerHeight;
    
    let clientX, clientY;
    if ('touches' in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } else { clientX = e.clientX; clientY = e.clientY; }
    
    // Precise coordinate relative to the INNER canvas (inside any border)
    const x = (clientX - rect.left - borderLeft) * scaleX;
    const y = (clientY - rect.top - borderTop) * scaleY;

    if (brushMode === 'magic') {
      const mCtx = maskContextRef.current;
      mCtx.lineWidth = brushSize;
      mCtx.lineCap = 'round'; mCtx.lineJoin = 'round'; mCtx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      mCtx.lineTo(x, y); mCtx.stroke(); mCtx.beginPath(); mCtx.moveTo(x, y);
    } else {
      const ctx = contextRef.current;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (brushMode === 'erase') { ctx.globalCompositeOperation = 'destination-out'; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y); } 
      else if (brushMode === 'restore') {
        ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.beginPath(); ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(originalImageRef.current, 0, 0); ctx.restore();
      }
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width; tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    if (isBgRemoved && bgColor !== '#ffffff00') { tempCtx.fillStyle = bgColor; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); } 
    else if (!isBgRemoved) { tempCtx.fillStyle = '#ffffff'; tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height); }
    tempCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a'); link.download = `mybg-editor-${new Date().getTime()}.png`; link.href = tempCanvas.toDataURL('image/png'); link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-[1800px] mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-black text-indigo-600 mb-2 tracking-tighter">MyBG Remover Pro</h1>
          <p className="text-slate-500 text-lg font-semibold uppercase tracking-widest">Advanced Visual Studio</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 items-start">
          
          {/* LEFT COLUMN: Manual Precision Tools */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <h2 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-slate-400 border-b pb-4 border-slate-50">
                <Paintbrush className="w-4 h-4 text-indigo-500" /> Manual Controls
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <button onClick={() => setBrushMode('magic')} className={`w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all ${brushMode === 'magic' ? 'bg-red-500 shadow-xl shadow-red-100 text-white scale-[1.02]' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                    <Sparkles className="w-4 h-4" /> Magic Remover
                  </button>
                  
                  {isBgRemoved && (
                    <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl">
                      <button onClick={() => setBrushMode('erase')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${brushMode === 'erase' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Eraser className="w-3.5 h-3.5" /> Erase
                      </button>
                      <button onClick={() => setBrushMode('restore')} className={`flex-1 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${brushMode === 'restore' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                        <RefreshCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    </div>
                  )}

                  {brushMode === 'magic' && (
                    <button onClick={applyMagicRemover} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 animate-pulse shadow-lg shadow-red-200">
                      <Wand2 className="w-4 h-4" /> Apply Magic Fill
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end"><label className="text-xs font-black text-slate-400 uppercase tracking-widest">Brush Size</label><span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{brushSize}px</span></div>
                  <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <button onMouseDown={() => setIsComparing(true)} onMouseUp={() => setIsComparing(false)} onMouseLeave={() => setIsComparing(false)} onTouchStart={() => setIsComparing(true)} onTouchEnd={() => setIsComparing(false)} className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isComparing ? 'bg-indigo-600 text-white scale-95' : 'bg-slate-100 text-slate-400 hover:bg-slate-100'}`}>
                    <Eye className="w-4 h-4" /> Compare
                  </button>
                  <div className="flex gap-2">
                    <button onClick={undo} disabled={historyIndex <= 0} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-100 transition-all disabled:opacity-30">Undo</button>
                    <button onClick={redo} disabled={historyIndex >= history.length - 1} className="flex-1 py-3 bg-slate-50 text-slate-400 rounded-xl font-black text-xs hover:bg-slate-100 transition-all disabled:opacity-30">Redo</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: The Canvas Workspace */}
          <div className="lg:col-span-4">
            <div 
              className="rounded-[40px] shadow-2xl border border-white overflow-hidden relative min-h-[700px] flex items-center justify-center transition-all duration-500 bg-white group"
              style={{ 
                backgroundColor: isBgRemoved && bgColor === '#ffffff00' ? '#ffffff' : (isBgRemoved ? bgColor : '#ffffff'),
                backgroundImage: isBgRemoved && bgColor === '#ffffff00' ? 'radial-gradient(#e5e7eb 1px, transparent 1px)' : 'none',
                backgroundSize: '32px 32px'
              }}
            >
              {!previewUrl ? (
                <div className="text-center p-20 max-w-md bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                  <div className="w-32 h-32 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-indigo-200 rotate-3 transition-transform group-hover:rotate-0"><Upload className="w-12 h-12 text-white" /></div>
                  <h3 className="text-3xl font-black mb-4 text-slate-800 tracking-tighter">Your Masterpiece Starts Here</h3>
                  <p className="text-slate-400 leading-relaxed font-medium">Upload a photo to unlock professional manual cleaning and AI background magic.</p>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center p-10 min-h-[700px]">
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-xl z-30 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <div className="relative">
                        <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <Sparkles className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                      </div>
                      <p className="mt-10 font-black text-slate-900 text-3xl tracking-tighter">AI is crafting your image...</p>
                    </div>
                  )}
                  
                  {isComparing && (
                    <div className="absolute inset-0 z-40 bg-white flex items-center justify-center p-10 animate-in fade-in zoom-in-95 duration-200">
                      <div className="relative w-full h-full flex items-center justify-center">
                        <img src={previewUrl} className="max-w-full max-h-[85vh] shadow-2xl rounded-3xl object-contain border-8 border-white" alt="Original" />
                        <div className="absolute top-8 left-8 bg-black text-white px-6 py-3 rounded-full font-black text-sm tracking-[0.2em] shadow-2xl uppercase">Original Vision</div>
                      </div>
                    </div>
                  )}

                  <div ref={brushPreviewRef} className="pointer-events-none absolute border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] rounded-full z-50 hidden transition-colors duration-200" style={{ touchAction: 'none' }} />
                  <div className="relative group flex items-center justify-center w-full h-full">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={(e) => { updateBrushPreview(e); startDrawing(e); }}
                      onMouseMove={(e) => { updateBrushPreview(e); draw(e); }}
                      onMouseUp={stopDrawing}
                      onMouseEnter={updateBrushPreview}
                      onMouseLeave={() => { stopDrawing(); hideBrushPreview(); }}
                      onTouchStart={(e) => { updateBrushPreview(e); startDrawing(e); }}
                      onTouchMove={(e) => { updateBrushPreview(e); draw(e); }}
                      onTouchEnd={() => { stopDrawing(); hideBrushPreview(); }}
                      className="max-w-full max-h-[85vh] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] rounded-3xl transition-all duration-300 cursor-none object-contain border-[12px] border-white"
                      style={{ touchAction: 'none' }}
                    />
                    <canvas ref={maskCanvasRef} className="absolute pointer-events-none max-w-full max-h-[85vh] rounded-3xl opacity-60 object-contain border-[12px] border-transparent" style={{ touchAction: 'none' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: AI & Final Finish */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-fit space-y-6">
              <h2 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-slate-400 border-b pb-4 border-slate-50">
                <ImageIcon className="w-4 h-4 text-indigo-500" /> AI Finishing
              </h2>
              
              <div className="space-y-6">
                <label className="block bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] p-6 cursor-pointer hover:border-indigo-400 hover:bg-white transition-all text-center group">
                  <Upload className="w-8 h-8 mx-auto mb-3 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">New Project</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>

                <button onClick={processWithAI} disabled={!originalFile || isProcessing} className={`w-full py-5 rounded-[24px] font-black text-sm tracking-tighter flex items-center justify-center gap-3 transition-all shadow-xl ${isBgRemoved ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-600' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}>
                  <RefreshCcw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} /> Remove Background
                </button>

                {isBgRemoved && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 p-6 bg-slate-50 rounded-[32px] border border-indigo-50">
                    <div className="space-y-4">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Backgrounds</label>
                      <div className="grid grid-cols-4 gap-3">
                        {PRESET_COLORS.map((color) => (
                          <button key={color.value} onClick={() => setBgColor(color.value)} className={`w-full aspect-square rounded-xl border-2 transition-all ${bgColor === color.value ? 'border-indigo-600 scale-110 shadow-lg ring-4 ring-white' : 'border-white hover:border-indigo-200'}`} style={{ backgroundColor: color.value === '#ffffff00' ? '#f8fafc' : color.value, backgroundImage: color.value === '#ffffff00' ? 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0), linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0)' : 'none', backgroundSize: '6px 6px' }} />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                      <div>
                        <div className="flex justify-between mb-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Edge Smoothness</label><span className="text-xs font-mono font-black text-indigo-600 bg-white px-2 py-0.5 rounded shadow-sm">{smoothness}</span></div>
                        <input type="range" min="0" max="40" value={smoothness} onChange={(e) => setSmoothness(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer select-none group">
                        <div className={`w-10 h-6 rounded-full transition-colors relative ${addShadow ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                          <input type="checkbox" checked={addShadow} onChange={(e) => setAddShadow(e.target.checked)} className="hidden" />
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${addShadow ? 'left-5' : 'left-1'}`} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600">AI Shadow</span>
                      </label>
                    </div>
                  </div>
                )}

                <button onClick={downloadImage} disabled={!originalFile} className="w-full bg-slate-900 text-white py-6 rounded-[28px] font-black text-xl tracking-tighter flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl hover:translate-y-[-2px] active:translate-y-[1px] disabled:opacity-30">
                  <Download className="w-7 h-7" /> Export Image
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
