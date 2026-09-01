import React, { useState } from 'react';
import { ProjectPlan, ComputedStage, TimelineBounds } from '../types';
import { TimelineView } from './TimelineView';
import {
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import confetti from 'canvas-confetti';

interface PresenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProjectPlan;
  computedStages: ComputedStage[];
  bounds: TimelineBounds;
}

export const PresenterModal: React.FC<PresenterModalProps> = ({
  isOpen,
  onClose,
  plan,
  computedStages,
  bounds,
}) => {
  const [copied, setCopied] = useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!containerRef.current) return;
    try {
      const blob = await toBlob(containerRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });
      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 },
        });
        setTimeout(() => setCopied(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col p-4 md:p-8 overflow-y-auto animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 text-white">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Modo Presentación en Vivo
          </div>
          <span className="text-sm font-bold text-slate-200">
            {plan.settings.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar Diapositiva
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Cerrar modo presentación (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Centered Slide Content Container */}
      <div className="flex-1 flex items-center justify-center py-2">
        <div className="w-full max-w-6xl">
          <TimelineView
            plan={plan}
            computedStages={computedStages}
            bounds={bounds}
            isPresentationMode={true}
            timelineContainerRef={containerRef}
          />
        </div>
      </div>
    </div>
  );
};
