
import React, { useState, useEffect } from 'react';
import { Satellite, Navigation, Loader2, MapPin, Target, Pentagon, Trash2, Maximize, Radio } from 'lucide-react';
import MapViewer from './components/MapViewer';
import ScannerOverlay from './components/ScannerOverlay';
import ResultsPanel from './components/ResultsPanel';
import { geocodeLocation, analyzeTerrain } from './services/geminiService';
import { Coordinate, AppState, AnalysisResult } from './types';

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState<Coordinate>({ lat: -23.5505, lng: -46.6333 });
  const [zoom, setZoom] = useState(13);
  const [markerPos, setMarkerPos] = useState<Coordinate | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentLocationName, setCurrentLocationName] = useState<string>('São Paulo, Brasil');
  
  // Estados para Polígono
  const [polygonCoords, setPolygonCoords] = useState<Coordinate[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  useEffect(() => {
    // Configurado para durar exatamente 10 segundos (100ms * 100 = 10000ms)
    const timer = setInterval(() => {
      setSplashProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          // Pequeno delay para suavizar a saída
          setTimeout(() => setShowSplash(false), 800);
          return 100;
        }
        return prev + 1;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Cálculo de área (Fórmula de Shoelace para m²)
  useEffect(() => {
    if (polygonCoords.length < 3) {
      setCalculatedArea(0);
      return;
    }
    
    const radius = 6378137; // Raio da Terra em metros
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

    const cleanNumbers = query.replace(/[^\d.,-]/g, ' ').trim();
    const numberMatches = cleanNumbers.match(/-?\d+(\.\d+)?/g);
    const letterCount = (query.match(/[a-zA-Z]/g) || []).length;
    const isLikelyCoordinate = numberMatches && numberMatches.length === 2 && letterCount < 4;

    if (isLikelyCoordinate) {
        const lat = parseFloat(numberMatches[0]);
        const lng = parseFloat(numberMatches[1]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            const coords = { lat, lng };
            setCenter(coords);
            setMarkerPos(coords);
            setZoom(16);
            setCurrentLocationName(`Busca: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setAppState(AppState.IDLE);
            return;
        }
    }

    try {
      const result = await geocodeLocation(query);
      if (result && result.coords && !isNaN(result.coords.lat) && !isNaN(result.coords.lng)) {
        setCenter(result.coords);
        setMarkerPos(result.coords);
        setCurrentLocationName(result.name);
        setZoom(16);
        setAppState(AppState.IDLE);
      } else {
        setAppState(AppState.IDLE);
      }
    } catch (err) {
      setAppState(AppState.IDLE);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setAppState(AppState.SEARCHING);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!isNaN(lat) && !isNaN(lng)) {
          const coords = { lat, lng };
          setCenter(coords);
          setMarkerPos(coords);
          setZoom(17);
          setCurrentLocationName("Área GPS Atual");
        }
        setAppState(AppState.IDLE);
      },
      () => setAppState(AppState.IDLE),
      { enableHighAccuracy: true }
    );
  };

  const startTacticAnalysis = async () => {
    const targetPos = markerPos || center;
    setAppState(AppState.ANALYZING);
    
    try {
      const res = await analyzeTerrain(currentLocationName, targetPos, polygonCoords.length >= 3 ? polygonCoords : undefined);
      
      if (res && res.optimizedCoords && !isNaN(res.optimizedCoords.lat) && !isNaN(res.optimizedCoords.lng)) {
        setMarkerPos(res.optimizedCoords);
        setCenter(res.optimizedCoords);
        setZoom(19); 
        setCurrentLocationName(polygonCoords.length >= 3 ? "PONTO IDEAL DENTRO DA ÁREA" : "PONTO IDEAL DE INSTALAÇÃO");
      }
      setAnalysisResult(res);
      setAppState(AppState.RESULT);
    } catch (err) {
      setAppState(AppState.IDLE);
    }
  };

  const clearPolygon = () => {
    setPolygonCoords([]);
    setIsDrawingMode(false);
  };

  const formatArea = (m2: number) => {
    if (m2 >= 1000000) return `${(m2 / 1000000).toFixed(2)} km²`;
    if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
    return `${m2.toFixed(0)} m²`;
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col">
      {/* Splash Screen - Colocada por cima do mapa com z-index alto */}
      {showSplash && (
        <div className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${splashProgress === 100 ? 'opacity-0' : 'opacity-100'}`}>
          {/* Elementos de Fundo Decorativos */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-cyan-500 rounded-full animate-spin-slow"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-cyan-400 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
          </div>

          {/* Antena Animada Principal */}
          <div className="relative flex flex-col items-center z-10">
            <div className="relative mb-12">
              {/* Ondas de sinal subindo da antena */}
              <div className="absolute top-0 left-1/2 w-40 h-40 bg-cyan-500/20 rounded-full animate-ping-slow"></div>
              <div className="absolute top-4 left-1/2 w-32 h-32 bg-cyan-400/30 rounded-full animate-ping-slow" style={{ animationDelay: '0.6s' }}></div>
              <div className="absolute top-8 left-1/2 w-24 h-24 bg-cyan-300/40 rounded-full animate-ping-slow" style={{ animationDelay: '1.2s' }}></div>
              
              {/* Base da Antena */}
              <div className="relative z-20 p-8 bg-slate-900 rounded-full border border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.4)] animate-antenna-sway">
                <Radio className="w-20 h-20 text-cyan-400 drop-shadow-[0_0_8px_cyan]" />
              </div>
              
              {/* Partículas de dados flutuantes */}
              <div className="absolute -top-10 -right-12 w-3 h-3 bg-white rounded-full animate-float-particle-1"></div>
              <div className="absolute top-24 -left-16 w-2 h-2 bg-cyan-400 rounded-full animate-float-particle-2"></div>
              <div className="absolute -bottom-6 -right-10 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-float-particle-3"></div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-white tracking-[0.4em] drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">GEOSCOUT</h1>
              <p className="text-xs text-cyan-500 font-mono tracking-[0.2em] uppercase opacity-80">Sincronizando Satélites GNSS</p>
            </div>

            <div className="mt-12 w-64 flex flex-col items-center gap-3">
               <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 shadow-[0_0_10px_cyan]" 
                    style={{ width: `${splashProgress}%` }}
                  ></div>
               </div>
               <div className="flex justify-between w-full text-[10px] font-mono text-cyan-700 uppercase tracking-tighter">
                  <span>Datalink: Ativo</span>
                  <span>{splashProgress}% Concluído</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Header / Search - Fica invisível enquanto carrega, mas permite que o mapa carregue por baixo */}
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
            <button type="button" onClick={handleUseCurrentLocation} className="p-2 text-slate-400 hover:text-cyan-400">
              <Navigation className="w-5 h-5" />
            </button>
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 rounded-lg text-xs font-bold transition-all" disabled={appState === AppState.SEARCHING}>
              {appState === AppState.SEARCHING ? <Loader2 className="w-4 h-4 animate-spin" /> : "BUSCAR"}
            </button>
          </form>

          {/* Ferramentas de Polígono */}
          <div className="pointer-events-auto flex gap-2 justify-center">
            <button 
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition-all ${isDrawingMode ? 'bg-cyan-500 text-white border-cyan-400 animate-pulse' : 'bg-slate-900/80 text-cyan-400 border-slate-700 hover:border-cyan-500'}`}
            >
              <Pentagon className="w-4 h-4" />
              {isDrawingMode ? 'CLIQUE NO MAPA PARA DESENHAR' : 'DESENHAR ÁREA'}
            </button>
            {polygonCoords.length > 0 && (
              <button 
                onClick={clearPolygon}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-red-900/80 text-red-200 border border-red-700 hover:bg-red-800 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                LIMPAR ÁREA
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info de Área Flutuante */}
      {polygonCoords.length >= 3 && !showSplash && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[900] bg-cyan-900/80 backdrop-blur-md border border-cyan-500/50 px-4 py-2 rounded-lg flex items-center gap-3 shadow-2xl animate-slide-up">
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
        onMarkerDragEnd={setMarkerPos}
        isScanning={appState === AppState.ANALYZING}
        polygonPoints={polygonCoords}
        onMapClick={(coords) => {
          if (isDrawingMode) {
            setPolygonCoords(prev => [...prev, coords]);
          }
        }}
      />

      <ScannerOverlay active={appState === AppState.ANALYZING} />
      
      {appState === AppState.RESULT && (
        <ResultsPanel result={analysisResult} onClose={() => setAppState(AppState.IDLE)} />
      )}

      {(markerPos || polygonCoords.length >= 3) && appState === AppState.IDLE && !isDrawingMode && !showSplash && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up">
          <button 
            onClick={startTacticAnalysis}
            className="flex flex-col items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-full font-bold shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-sm"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {polygonCoords.length >= 3 ? "Localizar Ponto na Área" : "Localizar Ponto Ideal"}
            </div>
            {polygonCoords.length >= 3 && <span className="text-[9px] opacity-70">A IA buscará o melhor local dentro do polígono</span>}
          </button>
        </div>
      )}

      {/* Footer Barra de Status */}
      {!showSplash && (
        <div className="absolute bottom-0 w-full bg-slate-900/95 border-t border-slate-800 p-2 flex justify-between items-center z-[1000] text-[10px] text-slate-400 font-mono px-4">
          <div className="flex gap-4">
            <span>LAT: <span className="text-cyan-400">{(markerPos?.lat ?? center?.lat ?? 0).toFixed(6)}</span></span>
            <span>LNG: <span className="text-cyan-400">{(markerPos?.lng ?? center?.lng ?? 0).toFixed(6)}</span></span>
          </div>
          <div className="flex items-center gap-2">
             <span className={`w-2 h-2 rounded-full ${appState === AppState.RESULT ? 'bg-cyan-500 shadow-[0_0_5px_cyan]' : 'bg-slate-500'} animate-pulse`}></span>
             <span className="truncate max-w-[200px] uppercase">{currentLocationName}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
