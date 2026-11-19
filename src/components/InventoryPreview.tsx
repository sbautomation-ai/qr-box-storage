import { Archive, Box, MapPin, QrCode, Search } from 'lucide-react'
import './inventory-preview.css'

export function InventoryPreview() {
  return (
    <figure className="inventory-preview">
      <div className="preview-frame">
        <div className="preview-bar">
          <span><Archive size={17} /> Your storage boxes</span>
          <span className="preview-dots" aria-hidden="true"><i /><i /><i /></span>
        </div>
        <div className="preview-body">
          <div className="preview-search"><Search size={16} /> spare batteries</div>
          <div className="preview-result">
            <div className="preview-box"><Box aria-hidden="true" strokeWidth={1.1} size={42} /></div>
            <div><strong>Small fixes &amp; tools</strong><span><MapPin size={13} /> Garage · Left shelf</span></div>
          </div>
          <div className="preview-line"><span>Spare batteries</span><strong>× 8</strong></div>
          <div className="preview-line"><span>Hex key set</span><strong>× 1</strong></div>
        </div>
      </div>
      <div className="preview-label" aria-hidden="true">
        <QrCode size={44} strokeWidth={1.8} /><span><strong>Small fixes</strong><small>Scan this box</small></span>
      </div>
      <figcaption>Example inventory</figcaption>
    </figure>
  )
}
