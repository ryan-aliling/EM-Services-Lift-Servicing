// Resizes + re-encodes an image entirely in the browser before it's
// attached to a defect, so photo evidence stays small (per the brief's
// "limit to ~100KB per photo" guidance) without needing any image
// processing library on the backend. Returns a base64 data URL so it
// can be stored directly in the in-memory backend with no file uploads
// or disk storage required.
export function compressImage(file, maxDimension = 700, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;

    img.onload = () => {
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.round(height * (maxDimension / width));
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.round(width * (maxDimension / height));
        height = maxDimension;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}
