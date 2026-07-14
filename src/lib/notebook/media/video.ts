import type { NotebookSupportedAssetMimeType } from '../persistence/contracts';

export const NOTEBOOK_VIDEO_WARNING_BYTES = 500 * 1024 * 1024;
export const NOTEBOOK_WEBVTT_MAX_BYTES = 10 * 1024 * 1024;

export type NotebookVideoMimeType = Extract<
  NotebookSupportedAssetMimeType,
  'video/mp4' | 'video/webm'
>;

export type NotebookVideoWarning = 'large-video-file' | '4k-video';

export type NotebookVideoInspection = {
  mimeType: NotebookVideoMimeType;
  byteLength: number;
  width: number;
  height: number;
  durationSeconds: number | null;
  warnings: NotebookVideoWarning[];
};

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

export function inspectNotebookVideoHeader(
  header: Uint8Array,
  byteLength: number,
  declaredMimeType?: string,
): Pick<NotebookVideoInspection, 'mimeType' | 'byteLength' | 'warnings'> {
  const mimeType: NotebookVideoMimeType = header.byteLength >= 12 && ascii(header, 4, 4) === 'ftyp'
    ? 'video/mp4'
    : header.byteLength >= 4
      && header[0] === 0x1a
      && header[1] === 0x45
      && header[2] === 0xdf
      && header[3] === 0xa3
      ? 'video/webm'
      : (() => {
          throw new Error('The selected file is not a supported MP4 or WebM video.');
        })();
  if (declaredMimeType && declaredMimeType !== mimeType) {
    throw new Error('The video content does not match its declared media type.');
  }
  return {
    mimeType,
    byteLength,
    warnings: byteLength > NOTEBOOK_VIDEO_WARNING_BYTES ? ['large-video-file'] : [],
  };
}

async function decodeNotebookVideo(blob: Blob, mimeType: NotebookVideoMimeType) {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Video decoding is unavailable in the current runtime.');
  }
  const video = document.createElement('video');
  if (!video.canPlayType(mimeType)) {
    throw new Error('This runtime does not support the video codec or container.');
  }
  const url = URL.createObjectURL(blob);
  try {
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;
    const metadata = await new Promise<{
      width: number;
      height: number;
      durationSeconds: number | null;
    }>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Video metadata decoding timed out.'));
      }, 15_000);
      const finish = () => window.clearTimeout(timeout);
      video.onloadedmetadata = () => {
        finish();
        if (!video.videoWidth || !video.videoHeight) {
          reject(new Error('The video has no decodable visual track.'));
          return;
        }
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          durationSeconds: Number.isFinite(video.duration) && video.duration >= 0
            ? video.duration
            : null,
        });
      };
      video.onerror = () => {
        finish();
        reject(new Error('This runtime could not decode the video.'));
      };
      video.load();
    });
    return metadata;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function validateNotebookVideo(
  blob: Blob,
  declaredMimeType?: string,
): Promise<NotebookVideoInspection> {
  const header = new Uint8Array(await blob.slice(0, 64).arrayBuffer());
  const inspected = inspectNotebookVideoHeader(header, blob.size, declaredMimeType);
  const decoded = await decodeNotebookVideo(blob, inspected.mimeType);
  const warnings = [...inspected.warnings];
  if (decoded.width > 3840 || decoded.height > 2160) warnings.push('4k-video');
  return { ...inspected, ...decoded, warnings };
}

export function validateNotebookWebVtt(bytes: Uint8Array) {
  if (bytes.byteLength > NOTEBOOK_WEBVTT_MAX_BYTES) {
    throw new Error('Notebook WebVTT exceeds the 10 MiB safety limit.');
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Notebook WebVTT must be valid UTF-8.');
  }
  if (!text.replace(/^\uFEFF/, '').startsWith('WEBVTT')) {
    throw new Error('Notebook WebVTT header is invalid.');
  }
  if (text.includes('\0')) {
    throw new Error('Notebook WebVTT contains invalid control data.');
  }
  return text;
}

export function notebookVideoWarningMessage(warning: NotebookVideoWarning) {
  return warning === 'large-video-file'
    ? 'This video is larger than 500 MiB.'
    : 'This video is larger than 4K resolution.';
}
