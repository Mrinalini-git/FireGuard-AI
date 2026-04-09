/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Flame, 
  Wind, 
  AlertTriangle, 
  History, 
  Settings, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2,
  Maximize2,
  Activity,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeFootage, FireDetectionReport } from './services/geminiService';

// Recipe 3: Hardware / Specialist Tool Vibe
const COLORS = {
  bg: '#0A0A0B',
  card: '#151619',
  accent: '#FF4444',
  warning: '#F27D26',
  safe: '#00FF00',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E9299',
  line: 'rgba(255, 255, 255, 0.1)',
};

interface ScanHistoryItem extends FireDetectionReport {
  timestamp: string;
  id: string;
  thumbnail: string;
}

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [currentReport, setCurrentReport] = useState<FireDetectionReport | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera access denied", err);
      setError("Camera access denied. Please enable permissions.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const performScan = async () => {
    if (isScanning) return;
    const frame = captureFrame();
    if (!frame) return;

    setIsScanning(true);
    try {
      const report = await analyzeFootage(frame);
      setCurrentReport(report);
      
      const historyItem: ScanHistoryItem = {
        ...report,
        id: crypto.randomUUID(),
        timestamp: new Date().toLocaleTimeString(),
        thumbnail: frame
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 20));
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-scan logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoScan) {
      interval = setInterval(performScan, 15000); // Scan every 15s
    }
    return () => clearInterval(interval);
  }, [autoScan, isScanning]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return COLORS.accent;
      case 'medium': return COLORS.warning;
      case 'low': return '#FFD700';
      default: return COLORS.safe;
    }
  };

  return (
    <div className="min-h-screen font-mono text-white p-4 md:p-8 flex flex-col gap-6" style={{ backgroundColor: COLORS.bg }}>
      {/* Header */}
      <header className="flex justify-between items-center border-b pb-4" style={{ borderColor: COLORS.line }}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter uppercase">FireGuard AI</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">CCTV Vision Extension v2.4.0</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">{currentTime}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">System Status: <span className="text-green-500">Online</span></div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Feed & Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Main Viewport */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl group">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover opacity-80"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20" 
              style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
            />
            
            {/* Scanning Animation */}
            <AnimatePresence>
              {isScanning && (
                <motion.div 
                  initial={{ top: 0 }}
                  animate={{ top: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] z-10"
                />
              )}
            </AnimatePresence>

            {/* Corner Markers */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/30" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/30" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/30" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/30" />

            {/* Feed Info */}
            <div className="absolute top-6 left-12 flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/50">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                REC
              </div>
              <div>CAM-01 / MAIN_ENTRY</div>
              <div>720P / 30FPS</div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-6">
                <div className="max-w-xs">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-sm font-bold mb-4">{error}</p>
                  <button 
                    onClick={startCamera}
                    className="px-4 py-2 bg-white text-black text-xs font-bold uppercase rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={performScan}
              disabled={isScanning}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group disabled:opacity-50"
            >
              {isScanning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 group-hover:text-yellow-400 transition-colors" />}
              <span className="text-[10px] uppercase font-bold tracking-widest">Manual Scan</span>
            </button>
            <button 
              onClick={() => setAutoScan(!autoScan)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all ${autoScan ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
            >
              <Activity className={`w-6 h-6 ${autoScan ? 'text-green-500' : ''}`} />
              <span className="text-[10px] uppercase font-bold tracking-widest">{autoScan ? 'Auto-Scan ON' : 'Auto-Scan OFF'}</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <Maximize2 className="w-6 h-6" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Fullscreen</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <Settings className="w-6 h-6" />
              <span className="text-[10px] uppercase font-bold tracking-widest">Config</span>
            </button>
          </div>
        </div>

        {/* Right Column: Alerts & History */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-hidden">
          {/* Current Alert Panel */}
          <div className={`p-6 rounded-2xl border transition-all duration-500 ${currentReport?.isFireDetected || currentReport?.isSmokeDetected ? 'border-red-500 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/10 bg-white/5'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest opacity-50">Active Detection</h2>
              {currentReport ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/10">
                    Conf: {(currentReport.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ) : (
                <span className="text-[10px] uppercase font-bold text-gray-500">Standby</span>
              )}
            </div>

            {currentReport ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${currentReport.isFireDetected ? 'bg-red-500 text-white' : 'bg-white/10 text-white/30'}`}>
                    <Flame className="w-8 h-8" />
                  </div>
                  <div className={`p-3 rounded-xl ${currentReport.isSmokeDetected ? 'bg-orange-500 text-white' : 'bg-white/10 text-white/30'}`}>
                    <Wind className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase text-gray-500 mb-1">Status</div>
                    <div className={`text-sm font-bold uppercase ${currentReport.isFireDetected || currentReport.isSmokeDetected ? 'text-red-500' : 'text-green-500'}`}>
                      {currentReport.isFireDetected ? 'FIRE DETECTED' : currentReport.isSmokeDetected ? 'SMOKE DETECTED' : 'CLEAR'}
                    </div>
                  </div>
                </div>

                {(currentReport.isFireDetected || currentReport.isSmokeDetected) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-3">
                      <div>
                        <div className="text-[10px] uppercase text-gray-500 mb-1">Source</div>
                        <div className="text-xs font-bold">{currentReport.source}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-500 mb-1">Location</div>
                        <div className="text-xs font-bold">{currentReport.location}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-gray-500 mb-1">Severity</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full transition-all duration-1000" 
                              style={{ 
                                width: currentReport.severity === 'high' ? '100%' : currentReport.severity === 'medium' ? '60%' : '30%',
                                backgroundColor: getSeverityColor(currentReport.severity)
                              }} 
                            />
                          </div>
                          <span className="text-[10px] font-bold uppercase" style={{ color: getSeverityColor(currentReport.severity) }}>
                            {currentReport.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] leading-relaxed text-gray-400 italic">
                      "{currentReport.reasoning}"
                    </div>
                  </motion.div>
                )}
                
                {!currentReport.isFireDetected && !currentReport.isSmokeDetected && (
                  <div className="flex flex-col items-center justify-center py-8 text-center opacity-50">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Environment Secure</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-20">
                <Camera className="w-12 h-12 mb-4" />
                <p className="text-xs font-bold uppercase tracking-widest">Awaiting Scan</p>
              </div>
            )}
          </div>

          {/* History Log */}
          <div className="flex-1 flex flex-col min-h-0 bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest">Recent Events</h2>
              </div>
              <span className="text-[10px] font-bold text-gray-500">{history.length} LOGS</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[10px] uppercase text-gray-600 tracking-widest">
                  No events recorded
                </div>
              ) : (
                history.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-black/40 border border-white/5 hover:border-white/20 transition-colors cursor-pointer"
                    onClick={() => setCurrentReport(item)}
                  >
                    <div className="w-12 h-12 rounded bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={item.thumbnail} alt="Scan" className="w-full h-full object-cover opacity-60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-bold uppercase ${item.isFireDetected || item.isSmokeDetected ? 'text-red-500' : 'text-green-500'}`}>
                          {item.isFireDetected ? 'Fire' : item.isSmokeDetected ? 'Smoke' : 'Clear'}
                        </span>
                        <span className="text-[8px] text-gray-600">{item.timestamp}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate uppercase tracking-tighter">
                        {item.isFireDetected || item.isSmokeDetected ? item.source : 'Routine Scan'}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em] text-gray-600 border-t pt-4" style={{ borderColor: COLORS.line }}>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            AI_CORE: ACTIVE
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            NETWORK: ENCRYPTED
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            STORAGE: LOCAL
          </div>
        </div>
        <div>SECURE_TERMINAL_01 // {new Date().toLocaleDateString()}</div>
      </footer>
    </div>
  );
}

