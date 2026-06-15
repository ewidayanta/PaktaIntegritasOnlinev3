import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraCaptureProps {
  onCapture: (image: string) => void;
  savedImage?: string | null;
  key?: string;
}

export default function CameraCapture({ onCapture, savedImage }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [useUploadMode, setUseUploadMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!savedImage && !useUploadMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [savedImage, useUploadMode]);

  const startCamera = async (isRetry = false) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Browser Anda tidak mendukung akses kamera secara langsung, atau sedang dalam mode tidak aman. Silakan gunakan mode Unggah File.');
      setUseUploadMode(true);
      return;
    }

    setIsReady(false);
    setError(null);
    
    try {
      console.log(`Starting camera attempt (isRetry: ${isRetry})...`);
      
      const constraints: MediaStreamConstraints = {
        video: isRetry ? true : { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 }
        },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      // We use a small delay to ensure the video element exists in the DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(e => {
               console.warn('Play error:', e);
               // Handle auto-play restriction by letting user click capture which calls play if needed
            });
            setIsReady(true);
            setError(null);
          };
        }
      }, 150);

    } catch (err: any) {
      console.error('Camera access error:', err);
      
      if (!isRetry && (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError')) {
        console.log('Overconstrained, retrying with simple constraints...');
        startCamera(true);
      } else if (!isRetry) {
        startCamera(true);
      } else {
        let msg = 'Gagal mengakses kamera.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Izin kamera ditolak. Silakan berikan izin di pengaturan browser Anda atau gunakan mode Unggah File Selfie.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Kamera tidak ditemukan di perangkat Anda.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Kamera sedang digunakan oleh aplikasi lain.';
        }
        setError(`${msg} (Error: ${err.name})`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File yang diunggah harus berupa gambar (PNG/JPG/JPEG).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onCapture(event.target.result as string);
        stopCamera();
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Gagal membaca file gambar.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <div className="relative aspect-square bg-slate-900 rounded-3xl overflow-hidden border-4 border-white shadow-2xl shadow-slate-200">
        <AnimatePresence mode="wait">
          {savedImage ? (
            <motion.img
              key="captured"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              src={savedImage}
              alt="Selfie Preview"
              className="w-full h-full object-cover"
            />
          ) : useUploadMode ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors ${
                isDragging ? 'bg-kemenkeu-navy/20 border-4 border-dashed border-kemenkeu-gold text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
              }`}
            >
              <Upload className="w-12 h-12 text-kemenkeu-gold mb-3 animate-bounce" />
              <p className="font-bold text-sm mb-1 text-white">Unggah Foto Selfie</p>
              <p className="text-xs text-slate-400 mb-4 px-4 leading-relaxed">
                Tarik & letakkan file gambar di sini, atau klik untuk memilih file dari perangkat Anda
              </p>
              <span className="inline-block bg-kemenkeu-navy/80 border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white rounded-lg shadow-md hover:bg-kemenkeu-navy">
                Pilih File Gambar
              </span>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </motion.div>
          ) : (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full relative"
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              
              {/* Selfie Frame Guide */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 <div className="w-[80%] h-[80%] border-2 border-white/30 border-dashed rounded-full" />
              </div>
              
              {!isReady && !error && (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-slate-900/50 backdrop-blur-sm">
                  <RefreshCw className="w-8 h-8 animate-spin text-kemenkeu-gold" />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-4 right-4 z-10">
          <div className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest backdrop-blur-md border ${savedImage ? 'bg-green-500/20 text-green-200 border-green-500/30' : 'bg-kemenkeu-navy/40 text-white border-white/20'}`}>
            {savedImage ? 'Verified' : useUploadMode ? 'Upload Mode' : 'Live Feed'}
          </div>
        </div>

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-red-950/95 p-6 text-center space-y-4 z-20">
            <AlertCircle className="w-10 h-10 text-red-400 animate-pulse" />
            <div className="space-y-1">
              <p className="font-bold text-sm">Akses Kamera Gagal</p>
              <p className="text-[10px] leading-relaxed opacity-90">{error}</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[240px] justify-center pt-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  setUseUploadMode(false);
                  startCamera();
                }}
                className="px-3 py-2 bg-white text-slate-900 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors shadow-lg"
              >
                Coba Kamera Lagi
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  setUseUploadMode(true);
                }}
                className="px-3 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-colors shadow-lg"
              >
                Gunakan Unggah File
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex flex-col items-center gap-3">
        <div className="flex justify-center gap-3 px-1 w-full">
          {!savedImage ? (
            useUploadMode ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-6 py-4 bg-kemenkeu-navy text-white rounded-xl font-bold transition-all hover:bg-slate-800 shadow-lg w-full justify-center"
                id="btn-upload"
              >
                <Upload className="w-5 h-5 text-kemenkeu-gold" />
                Pilih File Gambar
              </button>
            ) : (
              <button
                onClick={capturePhoto}
                disabled={!isReady}
                className="flex items-center gap-2 px-6 py-4 bg-kemenkeu-navy text-white rounded-xl font-bold transition-all hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg w-full justify-center"
                id="btn-capture"
              >
                <Camera className="w-5 h-5 text-kemenkeu-gold" />
                Ambil Selfie
              </button>
            )
          ) : (
            <button
              onClick={() => {
                onCapture('');
                if (!useUploadMode) {
                  setTimeout(startCamera, 100);
                }
              }}
              className="flex items-center gap-2 px-6 py-4 bg-white text-slate-900 border border-slate-200 rounded-xl font-bold transition-all hover:bg-slate-50 shadow-sm w-full justify-center"
              id="btn-retake"
            >
              <RefreshCw className="w-5 h-5 text-kemenkeu-navy" />
              Ulang Foto / Unggah Ulang
            </button>
          )}
        </div>

        {/* Mode Toggle Button */}
        {!savedImage && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setUseUploadMode(prev => !prev);
            }}
            className="text-[10px] text-kemenkeu-navy hover:text-slate-700 font-bold uppercase tracking-wider underline transition-colors"
          >
            {useUploadMode ? 'Gunakan Kamera Perangkat' : 'Gunakan Unggah File Gambar (Tolak Kamera)'}
          </button>
        )}
      </div>

      {!savedImage && !useUploadMode && isReady && (
        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Posisikan wajah di tengah area kamera
        </p>
      )}
    </div>
  );
}
