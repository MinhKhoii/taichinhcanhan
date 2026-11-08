import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  X,
  RotateCw,
  Upload,
  Loader2,
  Sparkles,
  AlertCircle,
  FileImage,
  RefreshCw,
} from 'lucide-react';
import { useModalEscape } from '../../hooks/useModalEscape';

interface ReceiptCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Data: string, mimeType: string) => Promise<void> | void;
  isScanning?: boolean;
}

export const ReceiptCameraModal: React.FC<ReceiptCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  isScanning = false,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCameraError, setHasCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks cleanly
  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      setStream(null);
    }
  }, [stream]);

  // Start camera
  const startCamera = useCallback(async () => {
    setIsLoadingCamera(true);
    setHasCameraError(null);
    stopTracks();

    // Check mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraError('Trình duyệt hoặc thiết bị này không hỗ trợ mở camera trực tiếp.');
      setIsLoadingCamera(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
      setIsLoadingCamera(false);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      // Try fallback with simple constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
        setIsLoadingCamera(false);
      } catch (fallbackErr: any) {
        let msg = 'Không thể truy cập camera.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Bạn đã từ chối quyền truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Thiết bị không có camera hoặc camera đang bận bởi ứng dụng khác.';
        }
        setHasCameraError(msg);
        setIsLoadingCamera(false);
      }
    }
  }, [facingMode, stopTracks]);

  // Toggle front/back camera
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPreview(null);
      startCamera();
    } else {
      stopTracks();
      setCapturedPreview(null);
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, facingMode]);

  useModalEscape(() => {
    if (!isScanning) {
      stopTracks();
      onClose();
    }
  }, isOpen);

  // Take photo from video stream
  const handleTakePhoto = async () => {
    if (!videoRef.current || isScanning) return;
    const video = videoRef.current;

    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([40]);
      }
    } catch {}

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedPreview(dataUrl);

    const base64 = dataUrl.split(',')[1];
    await onCapture(base64, 'image/jpeg');
  };

  // Upload photo from device
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const res = reader.result as string;
      setCapturedPreview(res);
      const commaIdx = res.indexOf(',');
      const base64 = commaIdx >= 0 ? res.slice(commaIdx + 1) : res;
      await onCapture(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    if (!stream) {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Chụp & Quét Hóa Đơn AI</span>
                <span className="text-3xs uppercase font-extrabold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                  Gemini
                </span>
              </h3>
              <p className="text-3xs text-slate-400">
                Chụp trực tiếp hoặc tải ảnh bill từ thiết bị
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopTracks();
              onClose();
            }}
            disabled={isScanning}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer disabled:opacity-50"
            title="Đóng (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Preview Area */}
        <div className="relative flex-1 bg-black min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              capturedPreview ? 'hidden' : 'block'
            }`}
          />

          {/* Captured Preview Image */}
          {capturedPreview && (
            <img
              src={capturedPreview}
              alt="Hóa đơn vừa chụp"
              className="w-full h-full object-contain bg-black"
            />
          )}

          {/* Viewfinder Target Box overlay (only when camera is live and not captured) */}
          {!capturedPreview && !hasCameraError && !isLoadingCamera && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              <div className="relative w-full max-w-xs h-72 rounded-2xl border-2 border-dashed border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

                {/* Guide Text */}
                <div className="bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-full text-3xs font-semibold text-white/90 border border-white/10 text-center">
                  Căn hóa đơn hoặc màn hình chuyển khoản vào đây
                </div>
              </div>
            </div>
          )}

          {/* Camera Loading Overlay */}
          {isLoadingCamera && !hasCameraError && !capturedPreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-xs font-semibold text-slate-300">Đang khởi động camera...</p>
            </div>
          )}

          {/* Camera Error / Permission Fallback Overlay */}
          {hasCameraError && !capturedPreview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-white">Không thể mở camera</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{hasCameraError}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn ảnh từ máy</span>
                </button>
              </div>
            </div>
          )}

          {/* AI Scanning / Processing Overlay */}
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs text-white p-6 space-y-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-white">AI đang đọc & phân tích hóa đơn...</h4>
                <p className="text-3xs text-slate-300">
                  Tự động trích xuất số tiền, ngày giao dịch và phân loại chi tiêu
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-slate-900 border-t border-white/10 shrink-0 flex items-center justify-between gap-3">
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title="Tải ảnh hóa đơn có sẵn từ điện thoại/máy tính"
          >
            <FileImage className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Tải ảnh từ máy</span>
            <span className="sm:hidden">Tải ảnh</span>
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Shutter Button (Capture) or Retake Button */}
          {!capturedPreview ? (
            <button
              type="button"
              onClick={handleTakePhoto}
              disabled={isScanning || isLoadingCamera || !!hasCameraError}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white text-slate-900 flex items-center justify-center border-4 border-blue-500 shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:hover:scale-100"
              title="Chụp ảnh hóa đơn ngay"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-slate-900/10 flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetake}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-2xl bg-white/20 hover:bg-white/25 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className="w-4 h-4" />
              <span>Chụp lại</span>
            </button>
          )}

          {/* Switch Camera Button (Front/Back) */}
          <button
            type="button"
            onClick={toggleCameraFacing}
            disabled={isScanning || !!hasCameraError || !!capturedPreview}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 shrink-0"
            title="Đổi camera trước/sau"
          >
            <RotateCw className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Đổi camera</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

