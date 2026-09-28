export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const reach = (s: number, rb: number, by: number) => Math.sqrt(Math.max((s + rb) ** 2 - (s - by) ** 2, 1));

export interface GeometryData {
    W: number; H: number; R: number; D: number; RB: number; S: number; CY: number; slots: number[]; span: number;
}

export function buildTroughPath(bx: number, by: number, rb: number, sL: number, sR: number, G: GeometryData) {
  const { W, H, R } = G;
  const wing = (s: number, side: number) => {
    const L = s + rb;
    const half = reach(s, rb, by);
    const sx = bx + side * half;
    return { sx, s, tx: sx + ((bx - sx) / L) * s, ty: s + ((by - s) / L) * s };
  };
  const A = wing(sL, -1), B = wing(sR, +1);
  const a0 = Math.atan2(A.ty - by, A.tx - bx);
  const a1 = Math.atan2(B.ty - by, B.tx - bx);
  let sweep = ((a0 - a1) * 180) / Math.PI;
  while (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  const n = (v: number) => v.toFixed(2);

  return (
    `M0 ${n(R)}` +
    `A${n(R)} ${n(R)} 0 0 1 ${n(R)} 0` +
    `L${n(clamp(A.sx, R, W - R))} 0` +
    `A${n(sL)} ${n(sL)} 0 0 1 ${n(A.tx)} ${n(A.ty)}` +
    `A${n(rb)} ${n(rb)} 0 ${large} 0 ${n(B.tx)} ${n(B.ty)}` +
    `A${n(sR)} ${n(sR)} 0 0 1 ${n(clamp(B.sx, R, W - R))} 0` +
    `L${n(W - R)} 0` +
    `A${n(R)} ${n(R)} 0 0 1 ${n(W)} ${n(R)}` +
    `L${n(W)} ${n(H - R)}` +
    `A${n(R)} ${n(R)} 0 0 1 ${n(W - R)} ${n(H)}` +
    `L${n(R)} ${n(H)}` +
    `A${n(R)} ${n(R)} 0 0 1 0 ${n(H - R)}` +
    `Z`
  );
}
