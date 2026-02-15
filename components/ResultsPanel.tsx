
import React from 'react';
import { AnalysisResult } from '../types';
import { CheckCircle2, Info, Radio, Compass, Copy } from 'lucide-react';

interface ResultsPanelProps {
  result: AnalysisResult | null;
  onClose: () => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ result, onClose }) => {
  if (!result) return null;

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-400 border-green-500';
    if (score >= 4) return 'text-yellow-400 border-yellow-500';
    return 'text-red-400 border-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 7) return 'bg-green-500';
    if (score >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const fullCoords = `${result.optimizedCoords.lat.toFixed(7)}, ${result.optimizedCoords.lng.toFixed(7)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullCoords);
    // Poderia adicionar um feedback visual aqui se necessário
  };

  return (
    <div className="absolute bottom-6 right-6 w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-6 shadow-2xl z-[600] text-slate-100 animate-slide-up">
        <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
                <Radio className="w-5 h-5" />
                Análise da Estação Base
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
                ✕
            </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
            <div className={`relative w-20 h-20 rounded-full border-4 flex items-center justify-center ${getScoreColor(result.suitabilityScore)}`}>
                <span className="text-3xl font-black">{result.suitabilityScore}</span>
                <span className="absolute -bottom-2 text-[10px] bg-slate-900 px-2 text-slate-400 uppercase font-bold">Nota</span>
            </div>
            <div className="flex-1">
                <h3 className="font-semibold text-white">Índice de Adequação</h3>
                <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                        className={`h-full ${getScoreBg(result.suitabilityScore)} transition-all duration-1000`} 
                        style={{ width: `${(result.suitabilityScore / 10) * 100}%` }}
                    ></div>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 font-mono uppercase">Escala: 1-3 Crítico | 4-6 Médio | 7-10 Ideal</div>
            </div>
        </div>

        <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2">
            {/* Coordenada Completa */}
            <div className="bg-cyan-900/20 p-4 rounded-lg border border-cyan-800/50">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                      <Compass className="w-4 h-4" />
                      <h4 className="font-bold text-xs uppercase tracking-wider">Coordenada de Instalação</h4>
                  </div>
                  <button 
                    onClick={copyToClipboard}
                    className="text-cyan-500 hover:text-cyan-300 transition-colors p-1"
                    title="Copiar Coordenada"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-black/40 p-3 rounded border border-slate-700 text-center">
                    <div className="text-cyan-300 font-mono text-base tracking-tight select-all">
                      {fullCoords}
                    </div>
                </div>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-2 text-cyan-300">
                    <Info className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">Recomendação da IA</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {typeof result.suggestion === 'string' ? result.suggestion : 'Nenhuma sugestão disponível.'}
                </p>
            </div>

            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-2 text-blue-300">
                    <CheckCircle2 className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">Justificativa</h4>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {typeof result.rationale === 'string' ? result.rationale : 'Análise técnica concluída.'}
                </p>
            </div>
        </div>
    </div>
  );
};

export default ResultsPanel;
