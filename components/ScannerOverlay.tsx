import React from 'react';

interface ScannerOverlayProps {
  active: boolean;
}

const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ active }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 z-[500] pointer-events-none overflow-hidden flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#06b6d4] scan-line"></div>
      
      <div className="text-cyan-400 font-mono text-xl animate-pulse flex flex-col items-center gap-2">
        <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>ANALISANDO DADOS DO TERRENO...</span>
        <span className="text-xs text-cyan-200">Processando Imagens de Satélite e Modelos de Elevação</span>
      </div>
      
      <div className="absolute inset-0 border-4 border-cyan-500/30 m-4 rounded-lg">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-500"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-500"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-500"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-500"></div>
      </div>
    </div>
  );
};

export default ScannerOverlay;