import { useEffect, useRef, useState } from 'react';
import { Avatar, type Look } from './Avatar';
import { Sheet } from './Sheet';
import type { Region } from '../../domain/types';
import { toast } from '../toast';

export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, location.origin).href;
}

async function svgToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '480');
  clone.setAttribute('height', '960');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('image'));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Share card: original avatar, one specific achievement, the app name. No personal data. */
export async function renderCard(svg: SVGSVGElement, achievement: string): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0d1015';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ff7a1a';
  ctx.fillRect(0, 0, W, 14);
  const img = await svgToImage(svg);
  ctx.drawImage(img, (W - 440) / 2, 120, 440, 880);
  const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#a3abb9';
  ctx.font = `700 34px ${font}`;
  ctx.textAlign = 'center';
  ctx.fillText('PICK THREE', W / 2, 84);
  ctx.fillStyle = '#f2f4f7';
  ctx.font = `800 58px ${font}`;
  wrap(ctx, achievement, W - 140).slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, 1080 + i * 70));
  ctx.fillStyle = '#6f7888';
  ctx.font = `500 30px ${font}`;
  ctx.fillText('Pick three. Get stronger.', W / 2, H - 50);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
}

interface Props {
  look: Look;
  achievement: string;
  regions: Region[];
  onClose: () => void;
}

export function ShareSheet({ look, achievement, regions, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const url = appUrl();
  const paint = Object.fromEntries(regions.map((r) => [r, { color: '#FF7A1A', pattern: 'solid' as const }]));

  useEffect(() => {
    const svg = wrapRef.current?.querySelector('svg');
    if (!svg) return;
    let u: string | null = null;
    renderCard(svg, achievement)
      .then((b) => {
        setBlob(b);
        u = URL.createObjectURL(b);
        setHref(u);
      })
      .catch(() => setErr('The image could not be created on this device. You can still copy the link.'));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [achievement]);

  const file = blob ? new File([blob], 'pick-three.png', { type: 'image/png' }) : null;
  const canNative = !!(file && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }));

  return (
    <Sheet title="Share this milestone" onClose={onClose} testId="share-sheet">
      <div className="stack">
        <div ref={wrapRef} className="card" style={{ textAlign: 'center' }}>
          <div className="avatar-wrap sm">
            <Avatar view="front" look={look} paint={paint} label="Share card avatar" />
          </div>
          <div style={{ fontWeight: 800, marginTop: 8 }}>{achievement}</div>
          <div className="tiny faint">Pick Three</div>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          The image includes your avatar, this achievement and the app name. Nothing else.
        </p>
        {err ? <p className="small" style={{ color: 'var(--danger)' }}>{err}</p> : null}
        {canNative ? (
          <button
            className="btn primary block"
            onClick={async () => {
              try {
                await navigator.share({ files: [file!], title: 'Pick Three', text: achievement, url });
              } catch {
                /* cancelled */
              }
            }}
          >
            Share
          </button>
        ) : null}
        {href ? (
          <a className={`btn block${canNative ? '' : ' primary'}`} href={href} download="pick-three.png" data-testid="download-image">
            Download image
          </a>
        ) : null}
        <button
          className="btn block"
          data-testid="copy-link"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast({ text: 'Link copied' });
            } catch {
              toast({ text: url, ms: 6000 });
            }
          }}
        >
          Copy link
        </button>
        <button className="btn ghost block" onClick={onClose}>
          Not now
        </button>
      </div>
    </Sheet>
  );
}
