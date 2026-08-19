import React, { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

export const QrScannerModal: React.FC<{ open: boolean; onClose: () => void; onCode: (value: string) => void }> = ({ open, onClose, onCode }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open || !videoRef.current) return
    let scanner: any
    let cancelled = false
    void import('qr-scanner').then(({ default: QrScanner }) => {
      if (cancelled || !videoRef.current) return
      scanner = new QrScanner(videoRef.current, result => { onCode(typeof result === 'string' ? result : result.data); scanner?.stop(); onClose() }, { preferredCamera: 'environment', returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true })
      return scanner.start()
    }).catch(reason => setError(reason?.message || 'Não foi possível abrir a câmera. Digite o código manualmente.'))
    return () => { cancelled = true; scanner?.destroy() }
  }, [onClose, onCode, open])
  if (!open) return null
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="Ler QR Code">
    <section className="w-full max-w-md rounded-3xl bg-white p-4 text-[#56132f]"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-black"><Camera className="h-5 w-5"/>Ler QR Code</h2><button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5"/></button></div><video ref={videoRef} playsInline muted className="mt-4 aspect-square w-full rounded-2xl bg-black object-cover"/>{error && <p role="alert" className="mt-3 rounded-xl bg-rose-100 p-3 text-xs font-bold text-rose-700">{error}</p>}<p className="mt-3 text-xs text-[#805269]">A imagem é processada somente neste aparelho e nunca é enviada ao servidor.</p></section>
  </div>
}
