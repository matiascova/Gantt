import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ProjectPlan } from '../types';
import { getShareableUrl, createShortLink } from '../utils/shareUtils';
import { COUNTRIES } from '../utils/holidayUtils';
import {
  Share2,
  Copy,
  Check,
  Globe2,
  Calendar,
  Layers,
  X,
  Download,
  Upload,
  Sparkles,
  Link,
  Users,
  ShieldCheck,
  Smartphone,
  QrCode,
  Send,
  Loader2,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProjectPlan;
  onImportPlan?: (importedPlan: ProjectPlan) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  plan,
  onImportPlan,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isGeneratingShort, setIsGeneratingShort] = useState(false);
  const [activeUrlType, setActiveUrlType] = useState<'compact' | 'short'>('compact');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);

  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Generate URLs and QR code when modal opens
  useEffect(() => {
    if (isOpen) {
      const url = getShareableUrl(plan);
      setShareUrl(url);
      setShortUrl(null);
      setActiveUrlType('compact');
      setCopied(false);
      setImportError(null);
      setImportSuccess(false);

      // Generate QR code for mobile scanning
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#00387A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      })
        .then((dataUri) => {
          setQrDataUrl(dataUri);
        })
        .catch((err) => {
          console.error('Failed to generate QR code:', err);
        });
    }
  }, [isOpen, plan]);

  if (!isOpen) return null;

  const currentDisplayUrl = activeUrlType === 'short' && shortUrl ? shortUrl : shareUrl;

  const handleCopyLink = async (textToCopy?: string) => {
    const text = textToCopy || currentDisplayUrl;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0070F2', '#36D399', '#38BDF8'],
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error copying URL:', err);
    }
  };

  const handleGenerateShortUrl = async () => {
    if (shortUrl) {
      setActiveUrlType('short');
      return;
    }

    setIsGeneratingShort(true);
    try {
      const result = await createShortLink(shareUrl);
      if (result) {
        setShortUrl(result);
        setActiveUrlType('short');
        // Update QR code to use the short link (makes QR even simpler to scan!)
        QRCode.toDataURL(result, {
          width: 320,
          margin: 2,
          color: {
            dark: '#00387A',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'M',
        }).then((dataUri) => {
          setQrDataUrl(dataUri);
        });

        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.5 },
        });
      }
    } catch (e) {
      console.warn('Error generating short link:', e);
    } finally {
      setIsGeneratingShort(false);
    }
  };

  // Native Mobile Share or WhatsApp
  const handleNativeShare = async () => {
    const title = plan.settings.title || 'Cronograma de Proyecto';
    const text = `📅 Te comparto el cronograma de "${title}" (${plan.stages.length} etapas):`;
    const urlToShare = currentDisplayUrl;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: urlToShare,
        });
        return;
      } catch (err) {
        // User cancelled or not supported, fallback to WhatsApp
      }
    }

    // Direct WhatsApp Web / Mobile redirect
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${urlToShare}`)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', qrDataUrl);
    const fileName = `${plan.settings.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_qr_cronograma.png`;
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    const fileName = `${plan.settings.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_cronograma.json`;
    downloadAnchor.setAttribute('download', fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.stages) && parsed.settings) {
          if (onImportPlan) {
            onImportPlan(parsed);
            setImportSuccess(true);
            setImportError(null);
            setTimeout(() => {
              onClose();
            }, 1000);
          }
        } else {
          setImportError('El archivo no contiene un formato de cronograma válido.');
        }
      } catch (err) {
        setImportError('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const country = COUNTRIES.find((c) => c.code === plan.settings.calendar?.country) || COUNTRIES[0];

  return (
    <div
      id="share-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="share-modal-content"
        className="bg-white dark:bg-[#0F1E2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0B1521] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-[#0070F2] flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                  Compartir Planificación
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  <span>Optimizado para Celulares</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enlace ultracompacto para ver en cualquier dispositivo móvil o computadora
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-share-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Project Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {plan.settings.title || 'Cronograma de Proyecto'}
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {plan.stages.length} etapas
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-[#0070F2]" />
                <span>Inicio: {plan.settings.startDate}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>{country.flag}</span>
                <span>{country.name}</span>
              </span>
            </div>
          </div>

          {/* Format Selector Pills (Compact URL vs Shortened URL) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-[#0070F2]" />
              <span>Enlace para Compartir</span>
            </label>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                id="btn-tab-compact-url"
                onClick={() => setActiveUrlType('compact')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  activeUrlType === 'compact'
                    ? 'bg-white dark:bg-slate-800 text-[#0070F2] shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Ultra-Compacto
              </button>

              <button
                type="button"
                id="btn-tab-short-url"
                onClick={handleGenerateShortUrl}
                disabled={isGeneratingShort}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-all ${
                  activeUrlType === 'short'
                    ? 'bg-white dark:bg-slate-800 text-[#0070F2] shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isGeneratingShort ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#0070F2]" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-500" />
                )}
                <span>{shortUrl ? 'Link Corto (TinyURL)' : 'Acortar Link'}</span>
              </button>
            </div>
          </div>

          {/* Share Link Input with Copy Button */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  readOnly
                  id="shareable-url-input"
                  value={currentDisplayUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full pl-3 pr-8 py-2.5 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 font-mono select-all focus:outline-none focus:ring-2 focus:ring-[#0070F2]"
                />
              </div>

              <button
                type="button"
                id="btn-copy-share-link"
                onClick={() => handleCopyLink()}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all flex-shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0070F2] hover:bg-[#005FB8] text-white hover:shadow-md'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Helper status text */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>
                  {activeUrlType === 'short' && shortUrl
                    ? 'Enlace corto generado (~28 caracteres)'
                    : 'Esquema ultracompacto compatible con mensajería y WhatsApp'}
                </span>
              </span>
              <span>{currentDisplayUrl.length} caracteres</span>
            </div>
          </div>

          {/* Action Buttons: WhatsApp / Mobile Share & QR Code Toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              id="btn-whatsapp-mobile-share"
              onClick={handleNativeShare}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar por WhatsApp / Celular</span>
            </button>

            <button
              type="button"
              id="btn-toggle-qr-code"
              onClick={() => setShowQrCode(!showQrCode)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <QrCode className="w-4 h-4 text-[#0070F2]" />
              <span>{showQrCode ? 'Ocultar Código QR' : 'Escanear con Cámara QR'}</span>
            </button>
          </div>

          {/* Interactive QR Code Section for Camera Scanning */}
          {showQrCode && qrDataUrl && (
            <div
              id="qr-code-expanded-panel"
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="text-center">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#0070F2]" />
                  <span>Apunta la cámara de tu celular</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Abre instantáneamente el cronograma sin necesidad de escribir el enlace
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 inline-block">
                <img
                  src={qrDataUrl}
                  alt="Código QR del Cronograma"
                  className="w-48 h-48 object-contain"
                />
              </div>

              <button
                type="button"
                id="btn-download-qr-image"
                onClick={handleDownloadQR}
                className="text-xs text-[#0070F2] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Descargar imagen QR (PNG)</span>
              </button>
            </div>
          )}

          {/* Benefits Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <div className="font-bold text-[#0070F2] dark:text-blue-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Acceso universal y colaborativo</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              Al abrir el enlace en un celular o tablet, los destinatarios verán la visualización adaptada y podrán guardarla con 1 clic en su propio navegador con el botón <strong>"Guardar en Mis Proyectos"</strong>.
            </p>
          </div>

          {/* Backup & JSON Options */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-download-json-backup"
                onClick={handleDownloadJSON}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Descargar archivo .json con todos los datos"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exportar Archivo JSON</span>
              </button>

              <label
                htmlFor="import-json-file"
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Importar un archivo de cronograma previamente guardado"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Importar JSON</span>
                <input
                  type="file"
                  id="import-json-file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {importSuccess && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>¡Cronograma importado con éxito!</span>
              </span>
            )}

            {importError && (
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                {importError}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1521] flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
