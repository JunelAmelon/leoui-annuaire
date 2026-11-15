'use client';

/**
 * Aperçu à l'écran de la carte de table : rend les MÊMES opérations de dessin que le PDF
 * (`buildCardLayout`), en pourcentages et en unités `cqw` → toujours à l'échelle, quelle que soit la largeur.
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { GuestbookCardDesign } from '../domain/customization';
import { effectiveCardImage } from '../domain/customization';
import { buildCardLayout, cardPalette, CARD_H, CARD_W, type CardFont, type CardOp } from '../domain/card-layout';

const FAMILY: Record<CardFont, { family: string; weight?: number; style?: string }> = {
  script: { family: 'LOScript' },
  serif: { family: 'LOSerif' },
  serifItalic: { family: 'LOSerif', style: 'italic' },
  sans: { family: 'LOSans' },
  sansMedium: { family: 'LOSans', weight: 500 },
  numeral: { family: 'LONumeral' },
};

const FONT_CSS = `
@font-face{font-family:LOScript;src:url(/fonts/pdf/MrsSaintDelafield-Regular.ttf)}
@font-face{font-family:LOSerif;src:url(/fonts/pdf/CormorantGaramond-Regular.ttf)}
@font-face{font-family:LOSerif;font-style:italic;src:url(/fonts/pdf/CormorantGaramond-Italic.ttf)}
@font-face{font-family:LOSans;font-weight:400;src:url(/fonts/pdf/Jost-Regular.ttf)}
@font-face{font-family:LOSans;font-weight:500;src:url(/fonts/pdf/Jost-Medium.ttf)}
@font-face{font-family:LONumeral;src:url(/fonts/pdf/BodoniModa-Regular.ttf)}
`;

const pctX = (mm: number) => `${(mm / CARD_W) * 100}%`;
const pctY = (mm: number) => `${(mm / CARD_H) * 100}%`;
const cqw = (mm: number) => `${(mm / CARD_W) * 100}cqw`;

export function TableCardPreview({
  design, publicUrl, className = '',
}: {
  design: GuestbookCardDesign;
  publicUrl: string;
  className?: string;
}) {
  const pal = cardPalette(design);
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(publicUrl, { width: 400, margin: 0, errorCorrectionLevel: 'M', color: { dark: pal.ink, light: pal.paper } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [publicUrl, pal.ink, pal.paper]);

  const color = { ink: pal.ink, muted: pal.muted, hair: pal.hair };
  const ops = buildCardLayout(design);

  const render = (op: CardOp, i: number) => {
    if (op.t === 'qr')
      return qr ? <img key={i} src={qr} alt="" style={{ position: 'absolute', left: pctX(op.x), top: pctY(op.y), width: pctX(op.size) }} /> : null;
    if (op.t === 'image')
      return (
        <img key={i} src={effectiveCardImage(design)} alt=""
          style={{ position: 'absolute', left: pctX(op.x), top: pctY(op.y), width: pctX(op.w), height: pctY(op.h), objectFit: 'cover', filter: design.image_grayscale ? 'grayscale(1)' : undefined }} />
      );
    if (op.t !== 'text') return null;
    const f = FAMILY[op.font];
    const size = op.size * 0.3528; // pt → mm
    const base: React.CSSProperties = {
      position: 'absolute',
      fontFamily: `${f.family}, serif`,
      fontWeight: f.weight,
      fontStyle: f.style,
      fontSize: cqw(size),
      color: color[op.color],
      letterSpacing: op.spacing ? cqw(op.spacing) : undefined,
      whiteSpace: op.maxWidth ? 'normal' : 'nowrap',
      width: op.maxWidth ? pctX(op.maxWidth) : undefined,
      lineHeight: op.maxWidth ? cqw(op.lineHeight ?? size * 1.2) : 1,
      textAlign: op.align ?? 'left',
    };
    if (op.maxWidth) {
      // paragraphe : la 1re ligne a sa ligne de base à y
      const left = op.align === 'center' ? op.x - op.maxWidth / 2 : op.align === 'right' ? op.x - op.maxWidth : op.x;
      return <div key={i} style={{ ...base, left: pctX(left), top: pctY(op.y - (op.lineHeight ?? size * 1.2) * 0.78) }}>{op.text}</div>;
    }
    const align = op.align ?? 'left';
    const pos: React.CSSProperties =
      align === 'right' ? { right: pctX(CARD_W - op.x) } : align === 'center' ? { left: pctX(op.x), transform: 'translate(-50%,-80%)' } : { left: pctX(op.x) };
    return <div key={i} style={{ ...base, ...pos, top: pctY(op.y), transform: pos.transform ?? 'translateY(-80%)' }}>{op.text}</div>;
  };

  return (
    <div className={`rounded-lg overflow-hidden shadow-sm border border-stone-200 ${className}`}>
      <style>{FONT_CSS}</style>
      <div style={{ containerType: 'inline-size', position: 'relative', width: '100%', aspectRatio: `${CARD_W} / ${CARD_H}`, background: pal.paper }}>
        <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          {ops.map((op, i) => {
            if (op.t === 'line')
              return <line key={i} x1={op.x1} y1={op.y1} x2={op.x2} y2={op.y2} stroke={color[op.color]} strokeWidth={op.w} strokeDasharray={op.dash ? '1.6 1.6' : undefined} />;
            if (op.t === 'curve')
              return <path key={i} d={`M${op.p[0]} C${op.p[1]} ${op.p[2]} ${op.p[3]}`.replace(/,/g, ' ')} fill="none" stroke={color[op.color]} strokeWidth={op.w} />;
            return null;
          })}
        </svg>
        {ops.map(render)}
      </div>
    </div>
  );
}
