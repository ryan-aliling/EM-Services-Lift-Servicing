// Client-side photo compression, purely in the browser (Canvas API) - no new dependency,
// same "keep it simple" posture as SignaturePad.jsx choosing hand-rolled canvas code over
// pulling in a library. Downscales to a max dimension and re-encodes as JPEG before the
// file ever reaches useFileUpload/Cloudinary, per the brief's storage/bandwidth concern
// ("no photos on minor issue... platform will get slower due to loading of photo").
//
// Deliberately opt-in (see useFileUpload's `compress` option) rather than automatic for
// every image passed to the shared upload hook - an e-signature PNG goes through that same
// hook and should never be re-encoded as lossy JPEG.
const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.75;

export async function compressImage(file, { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY } = {}) {
  // Not a raster photo (e.g. a PDF, or an SVG that would just be re-rasterized and
  // bloated), or the browser doesn't support the APIs this needs - upload as-is rather
  // than block the user on a photo we can't safely compress.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || typeof createImageBitmap !== 'function') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

    // Compression failed, or didn't actually help (e.g. a small icon-sized photo, or one
    // already compressed tighter than we'd re-encode it) - the original is the better
    // upload in either case.
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch {
    // Anything unexpected (e.g. a HEIC file the browser can't decode) - never let
    // compression itself be the reason an upload fails.
    return file;
  }
}
