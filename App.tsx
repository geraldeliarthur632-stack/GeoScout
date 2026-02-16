import React, { useState, useEffect, useCallback } from 'react';
import { Navigation, Loader2, MapPin, Target, Pentagon, Trash2, Maximize, Radio, Copy, Check } from 'lucide-react';
import MapViewer from './components/MapViewer';
import ScannerOverlay from './components/ScannerOverlay';
import ResultsPanel from './components/ResultsPanel';
import { geocodeLocation, analyzeTerrain } from './services/geminiService';
import { Coordinate, AppState, AnalysisResult } from './types';

const validateCoords = (coords: any): Coordinate | null => {
  if (!coords) return null;
  const lat = typeof coords.lat === 'string' ? parseFloat(coords.lat) : coords.lat;
  const lng = typeof coords.lng === 'string' ? parseFloat(coords.lng) : coords.lng;
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }
  return null;
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState<Coordinate>({ lat: -23.5505, lng: -46.6333 });
  const [zoom, setZoom] = useState(13);
  const [markerPos, setMarkerPos] = useState<Coordinate | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>('São Paulo, Brasil');
  const [footerCopied, setFooterCopied] = useState(false);
  
  const [polygonCoords, setPolygonCoords] = useState<Coordinate[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSplashProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setShowSplash(false), 800);
          return 100;
        }
        return prev + 1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (polygonCoords.length < 3) {
      setCalculatedArea(0);
      return;
    }
    const radius = 6378137;
    const toRad = (value: number) => (value * Math.PI) / 180;
    let area = 0;
    for (let i = 0; i < polygonCoords.length; i++) {
      const p1 = polygonCoords[i];
      const p2 = polygonCoords[(i + 1) % polygonCoords.length];
      area += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
    }
    const finalArea = Math.abs((area * radius * radius) / 2);
    setCalculatedArea(finalArea);
  }, [polygonCoords]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setAppState(AppState.SEARCHING);
    const result = await geocodeLocation(query);
    const valid = validateCoords(result?.coords);
    if (valid) {
      setCenter(valid);
      setMarkerPos(valid);
      setCurrentLocationName(result?.name || query);
      setZoom(16);
    }
    setAppState(AppState.IDLE);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setAppState(AppState.SEARCHING);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const valid = validateCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (valid) {
          setCenter(valid);
          setUserLocation(valid);
          setZoom(17);
          setCurrentLocationName("Minha Localização");
        }
        setAppState(AppState.IDLE);
      },
      () => setAppState(AppState.IDLE),
      { enableHighAccuracy: true }
    );
  };

  const startTacticAnalysis = async () => {
    const targetPos = markerPos || userLocation || center;
    const validTarget = validateCoords(targetPos);
    if (!validTarget) return;

    setAppState(AppState.ANALYZING);
    try {
      const res = await analyzeTerrain(currentLocationName, validTarget, polygonCoords.length >= 2 ? polygonCoords : undefined);
      const validOpt = validateCoords(res?.optimizedCoords);
      if (validOpt) {
        setMarkerPos(validOpt);
        setCenter(validOpt);
        setZoom(19); 
        setCurrentLocationName(polygonCoords.length >= 2 ? "PONTO IDEAL NA SELEÇÃO" : "PONTO IDEAL DE INSTALAÇÃO");
      }
      setAnalysisResult(res);
      setAppState(AppState.RESULT);
    } catch (err) {
      setAppState(AppState.IDLE);
    }
  };

  const startNavigation = (dest: Coordinate) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  const clearPolygon = () => {
    setPolygonCoords([]);
    setIsDrawingMode(false);
  };

  const onMapClick = useCallback((coords: Coordinate) => {
    const valid = validateCoords(coords);
    if (isDrawingMode && valid) {
      setPolygonCoords(prev => [...prev, valid]);
    }
  }, [isDrawingMode]);

  const onMarkerDragEnd = useCallback((newCoords: Coordinate) => {
    const valid = validateCoords(newCoords);
    if (valid) {
      setMarkerPos(valid);
    }
  }, []);

  const copyFooterCoords = () => {
    if (!markerPos) return;
    const text = `${markerPos.lat.toFixed(7)}, ${markerPos.lng.toFixed(7)}`;
    navigator.clipboard.writeText(text);
    setFooterCopied(true);
    setTimeout(() => setFooterCopied(false), 2000);
  };

  const formatArea = (m2: number) => {
    if (m2 >= 1000000) return `${(m2 / 1000000).toFixed(2)} km²`;
    if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
    return `${m2.toFixed(0)} m²`;
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col">
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${splashProgress === 100 ? 'opacity-0' : 'opacity-100'}`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-cyan-500 rounded-full animate-spin-slow"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-400 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
          </div>
          <div className="relative flex flex-col items-center z-10">
            <div className="relative mb-12">
              <div className="absolute top-0 left-1/2 w-40 h-40 bg-cyan-500/20 rounded-full animate-ping-slow"></div>
              <div className="relative z-20 p-8 bg-slate-900 rounded-full border border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-antenna-sway">
                <Radio className="w-20 h-20 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-white tracking-[0.4em] drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">GEOSCOUT</h1>
              <p className="text-xs text-cyan-500 font-mono tracking-[0.2em] uppercase opacity-80">Sincronizando Satélites GNSS</p>
            </div>
            <div className="mt-12 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 shadow-[0_0_10px_cyan]" style={{ width: `${splashProgress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute top-0 left-0 w-full z-[1000] p-4 flex flex-col items-center pointer-events-none transition-opacity duration-500 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-full max-w-lg flex flex-col gap-2">
          <form onSubmit={handleSearch} className="pointer-events-auto flex gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-700 shadow-2xl backdrop-blur-md">
            <MapPin className="w-5 h-5 ml-2 text-cyan-500 self-center" />
            <input 
              type="text" 
              placeholder="Local ou Coordenadas..." 
              className="flex-1 bg-transparent text-white px-2 py-2 text-sm outline-none font-mono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 rounded-lg text-xs font-bold transition-all" disabled={appState === AppState.SEARCHING}>
              {appState === AppState.SEARCHING ? <Loader2 className="w-4 h-4 animate-spin" /> : "BUSCAR"}
            </button>
          </form>

          <div className="pointer-events-auto flex gap-2 justify-center flex-wrap">
            <button 
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900/80 text-white border border-slate-700 hover:border-cyan-500 hover:text-cyan-400 transition-all active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              LOCALIZAÇÃO ATUAL
            </button>
            
            <button 
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${isDrawingMode ? 'bg-cyan-500 text-white border-cyan-400 animate-pulse' : 'bg-slate-900/80 text-cyan-400 border-slate-700 hover:border-cyan-500'}`}
            >
              <Pentagon className="w-3.5 h-3.5" />
              {isDrawingMode ? (polygonCoords.length >= 2 ? 'ANALISAR SELEÇÃO' : 'CLIQUE NO MAPA') : 'DESENHAR ÁREA'}
            </button>
            
            {polygonCoords.length > 0 && (
              <button onClick={clearPolygon} className="flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-900/80 text-red-200 border border-red-700 hover:bg-red-800 transition-all active:scale-95">
                <Trash2 className="w-3.5 h-3.5" />
                LIMPAR
              </button>
            )}
          </div>
        </div>
      </div>

      {polygonCoords.length >= 3 && !showSplash && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[900] bg-cyan-900/80 backdrop-blur-md border border-cyan-500/50 px-4 py-2 rounded-lg flex items-center gap-3 shadow-2xl animate-slide-up">
          <Maximize className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-200/70 uppercase font-bold leading-none">Área Total</span>
            <span className="text-xl font-black text-white font-mono leading-tight">{formatArea(calculatedArea)}</span>
          </div>
        </div>
      )}

      <MapViewer 
        center={center} 
        zoom={zoom} 
        markerPosition={markerPos}
        userPosition={userLocation}
        onMarkerDragEnd={onMarkerDragEnd}
        isScanning={appState === AppState.ANALYZING}
        polygonPoints={polygonCoords}
        onMapClick={onMapClick}
        onStartNavigation={startNavigation}
      />

      <ScannerOverlay active={appState === AppState.ANALYZING} />
      {appState === AppState.RESULT && <ResultsPanel result={analysisResult} onClose={() => setAppState(AppState.IDLE)} />}

      {(polygonCoords.length >= 2 || markerPos) && appState === AppState.IDLE && !showSplash && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
          <button 
            onClick={startTacticAnalysis}
            className="flex flex-col items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-full font-bold shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-sm"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {polygonCoords.length >= 2 ? `Processar Seleção (${polygonCoords.length} pts)` : "Refinar Ponto da Base"}
            </div>
          </button>
        </div>
      )}

      {!showSplash && (
        <div className="absolute bottom-0 w-full bg-slate-900/95 border-t border-slate-800 p-2 flex justify-between items-center z-[1000] text-[10px] text-slate-400 font-mono px-4">
          <button 
            onClick={copyFooterCoords}
            disabled={!markerPos}
            className={`flex gap-4 items-center group transition-colors ${markerPos ? 'cursor-pointer hover:text-white' : 'opacity-50'}`}
          >
            <div className="flex gap-4">
              <span>BASE LAT: <span className="text-cyan-400 group-hover:text-cyan-300">{markerPos ? markerPos.lat.toFixed(7) : "---.------"}</span></span>
              <span>BASE LNG: <span className="text-cyan-400 group-hover:text-cyan-300">{markerPos ? markerPos.lng.toFixed(7) : "---.------"}</span></span>
            </div>
            {markerPos && (
              <div className="flex items-center gap-1 border-l border-slate-700 pl-4 h-4">
                {footerCopied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-500 group-hover:text-cyan-400" />
                )}
                <span className={footerCopied ? 'text-emerald-400' : 'text-slate-600'}>
                  {footerCopied ? 'COPIADO' : 'COPIAR'}
                </span>
              </div>
            )}
          </button>
          
          <div className="flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${appState === AppState.RESULT ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : (markerPos ? 'bg-cyan-500 shadow-[0_0_5px_cyan]' : 'bg-slate-500')} animate-pulse`}></span>
             <span className="truncate max-w-[150px] sm:max-w-[250px] uppercase font-bold tracking-tighter">
               {markerPos ? currentLocationName : "AGUARDANDO PONTO DA BASE"}
             </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
