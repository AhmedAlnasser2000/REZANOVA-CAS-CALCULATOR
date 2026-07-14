export function downloadNotebookPackage(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: 'application/vnd.calcwiz.notebook+zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.replace(/[\\/:*?"<>|]+/g, '-');
  link.click();
  URL.revokeObjectURL(url);
}
