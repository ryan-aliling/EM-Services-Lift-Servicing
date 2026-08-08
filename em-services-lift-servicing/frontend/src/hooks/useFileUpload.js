import { useCallback, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Shared Cloudinary signed-upload flow: ask the backend for a short-lived signature
// (it never hands out CLOUDINARY_API_SECRET itself), then upload the file directly to
// Cloudinary so file bytes never pass through our server. `folder` is optional and just
// organizes uploads by feature in the Cloudinary dashboard (e.g. "rectifications") - every
// caller's uploadFile(file) signature keeps working unchanged if it's omitted.
export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadFile = useCallback(async (file, folder) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const signRes = await fetch(`${API_BASE_URL}/api/uploads/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folder ? { folder } : {}),
      });

      if (!signRes.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = await signRes.json();

      // Every field appended here must match exactly what the backend signed (see
      // paramsToSign in routes/uploads.js) - Cloudinary recomputes the signature from
      // whatever arrives with the upload and rejects it on any mismatch.
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      if (signedFolder) formData.append('folder', signedFolder);

      const fileUrl = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        // "auto" resource type lets Cloudinary handle images and any other file type
        // (e.g. a PDF report) without extra per-type upload config.
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText).secure_url);
            } catch {
              reject(new Error('Unexpected response from Cloudinary'));
            }
          } else {
            reject(new Error('Upload to Cloudinary failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload to Cloudinary failed'));
        xhr.send(formData);
      });

      return fileUrl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadFile, uploading, progress, error };
}
