export type NotebookDocxRasterizedAsset = {
  readonly height: number;
  readonly png: Uint8Array;
  readonly width: number;
};

export type NotebookDocxRasterizer = (blob: Blob) => Promise<NotebookDocxRasterizedAsset>;

function decodeImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The publication image could not be decoded.'));
    };
    image.src = url;
  });
}

function canvasPng(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('The publication image could not be rasterized.'));
        return;
      }
      void blob.arrayBuffer().then((bytes) => resolve(new Uint8Array(bytes)), reject);
    }, 'image/png');
  });
}

export const browserNotebookDocxRasterizer: NotebookDocxRasterizer = async (blob) => {
  const image = await decodeImage(blob);
  const width = Math.max(1, image.naturalWidth || image.width);
  const height = Math.max(1, image.naturalHeight || image.height);
  const scale = Math.min(1, 2_048 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image rasterization is unavailable in this browser.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { height, png: await canvasPng(canvas), width };
};

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function notebookEquationFallbackSvg(latex: string) {
  const display = latex.replace(/\s+/gu, ' ').trim() || 'Equation';
  const width = Math.min(1_600, Math.max(280, display.length * 11 + 32));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="54" viewBox="0 0 ${width} 54"><rect width="100%" height="100%" fill="white"/><text x="16" y="35" fill="#111" font-family="Cambria Math, STIX Two Math, serif" font-size="20">${escapeXml(display)}</text></svg>`;
  return new TextEncoder().encode(svg);
}
