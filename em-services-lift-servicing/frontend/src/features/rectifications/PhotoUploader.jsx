import { useRef } from 'react';
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useFileUpload } from '../../hooks/useFileUpload';

/**
 * Multiple-file photo picker for rectification proof photos. Each selected file goes
 * through the shared useFileUpload hook (sign -> upload to Cloudinary) one at a time - reusing
 * the exact same upload path the brief calls for, rather than a separate one for this
 * feature. Files upload sequentially (not in parallel) so the single uploading/progress
 * pair the hook exposes always reflects the file currently in flight.
 */
export default function PhotoUploader({ photos, onChange, disabled, onError }) {
  const { uploadFile, uploading, progress } = useFileUpload();
  const inputRef = useRef(null);

  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // allow re-selecting the same file(s) later
    // Accumulate locally rather than reading the `photos` prop fresh each iteration - the
    // prop doesn't update synchronously while this loop awaits each upload, so appending
    // to it directly would silently drop every file except the last one whenever 2+ files
    // are selected at once (each onChange([...photos, url]) would overwrite the previous
    // iteration's addition instead of building on it).
    let uploaded = photos;
    for (const file of files) {
      try {
        const url = await uploadFile(file, 'rectifications', { compress: true });
        uploaded = [...uploaded, url];
        onChange(uploaded);
      } catch (err) {
        onError?.(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
  }

  function handleRemove(index) {
    onChange(photos.filter((_, i) => i !== index));
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mb: 1.5 }}>
        {photos.map((url, index) => (
          <Box key={url + index} sx={{ position: 'relative', width: 88, height: 88 }}>
            <Box
              component="img"
              src={url}
              alt={`Proof photo ${index + 1}`}
              sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }}
            />
            {!disabled && (
              <IconButton
                size="small"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => handleRemove(index)}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'background.paper' },
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </Box>
        ))}
      </Stack>

      {!disabled && (
        <>
          <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={<AddPhotoAlternateOutlinedIcon />}
            disabled={uploading}
          >
            {uploading ? `Uploading… ${progress}%` : 'Add Photo(s)'}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFilesSelected}
            />
          </Button>
          {uploading && <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, borderRadius: 1 }} />}
        </>
      )}

      {photos.length === 0 && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: disabled ? 0 : 1 }}>
          {disabled ? 'No proof photos.' : 'At least 1 photo is required before this record can be submitted.'}
        </Typography>
      )}
    </Box>
  );
}
