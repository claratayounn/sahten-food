'use client'

export function PaymentProofLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  if (!src) return null
  return <div className="proof-lightbox" role="dialog" aria-modal="true" onClick={onClose}><button type="button" onClick={onClose}>Close</button><img src={src} alt="Full payment proof" onClick={(event) => event.stopPropagation()} /></div>
}
