import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional id used by tests. */
  testId?: string;
}

/** Accessible bottom sheet: Escape and backdrop close it, focus is trapped and restored. */
export function Sheet({ title, onClose, children, testId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const focusables = () => [...el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, [tabindex]:not([tabindex="-1"])')];
    (focusables()[1] ?? focusables()[0] ?? el).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      if (prev && document.contains(prev)) prev.focus();
    };
  }, []);

  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1} data-testid={testId}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={headingId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
