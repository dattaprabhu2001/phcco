import { useEffect, useCallback } from 'react';
import { useScrollLock } from '../../lib/hooks.js';
import Icon from './Icon.jsx';

/**
 * Full-screen photo viewer for the album pages.
 *
 * `index` being null means closed, which keeps the caller's state to a single
 * value rather than an open flag plus an index that can disagree with it.
 */
export default function Lightbox({ photos, index, onClose, onGo }) {
  const open = index != null;
  useScrollLock(open);

  const onKey = useCallback(
    (e) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onGo((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onGo((index - 1 + photos.length) % photos.length);
    },
    [open, index, photos.length, onClose, onGo]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  if (!open) return null;
  const photo = photos[index];

  return (
    <div className="lightbox is-open" role="dialog" aria-modal="true"
         aria-label={photo?.caption || 'Photo'} onClick={onClose}>
      <button className="lb-close" type="button" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>

      {photos.length > 1 && (
        <button className="lb-nav lb-prev" type="button" aria-label="Previous photo"
                onClick={(e) => { e.stopPropagation(); onGo((index - 1 + photos.length) % photos.length); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}

      {/* Clicking the figure's padding closes, same as the backdrop; the image
          itself does not, so a mis-click on the photo is not punished. */}
      <figure className="lb-figure">
        <img src={photo.full || photo.thumb} alt={photo.caption || ''}
             onClick={(e) => e.stopPropagation()} />
        <figcaption onClick={(e) => e.stopPropagation()}>
          <span className="cap">{photo.caption || ''}</span>
          <span className="pos">{index + 1} / {photos.length}</span>
        </figcaption>
      </figure>

      {photos.length > 1 && (
        <button className="lb-nav lb-next" type="button" aria-label="Next photo"
                onClick={(e) => { e.stopPropagation(); onGo((index + 1) % photos.length); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
