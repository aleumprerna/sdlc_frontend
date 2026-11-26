import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function DocumentActions({ title, isPdf, onOpen, onDownload, onNewVersion, uploading, reading }) {
  const [position, setPosition] = useState(null);
  const button = useRef(null);
  const actions = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!position) return;

    const close = () => setPosition(null);
    function closeOutside(event) {
      if (!button.current?.contains(event.target) && !actions.current?.contains(event.target)) close();
    }
    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      close();
      button.current?.focus();
    }

    actions.current?.querySelector('button:enabled')?.focus({ preventScroll: true });
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position]);

  function toggle() {
    if (position) {
      setPosition(null);
      return;
    }
    const rect = button.current.getBoundingClientRect();
    const alignAbove = window.innerHeight - rect.bottom < 150;
    setPosition({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(alignAbove ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
  }

  function select(action) {
    setPosition(null);
    button.current?.focus();
    action();
  }

  return (
    <>
      <button ref={button} type="button" className="document-actions-toggle" aria-label={`Actions for ${title}`}
        aria-expanded={Boolean(position)} aria-controls={position ? id : undefined} onClick={toggle}>…</button>
      {position && createPortal(
        <div ref={actions} id={id} className="document-actions-panel" style={position}>
          {isPdf && <button type="button" disabled={reading} onClick={() => select(onOpen)}>Open original PDF</button>}
          <button type="button" disabled={reading} onClick={() => select(onDownload)}>Download original</button>
          <button type="button" disabled={uploading} onClick={() => select(onNewVersion)}>Upload new version</button>
        </div>,
        document.body,
      )}
    </>
  );
}
