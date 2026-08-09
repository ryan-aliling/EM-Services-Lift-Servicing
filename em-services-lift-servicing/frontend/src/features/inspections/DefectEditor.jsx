import React, { useState } from 'react';
import {
  Box, Stack, Paper, TextField, Select, MenuItem, IconButton, Button, Typography, Avatar,
  Dialog, Tooltip, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useFileUpload } from '../../hooks/useFileUpload';
import StatusChip from '../../components/StatusChip';
import { DEFECT_SEVERITY_COLORS } from '../../theme/statusColors';

export default function DefectEditor({ defects, onChange, readOnly, disabled, disabledReason }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const { uploadFile, uploading, progress } = useFileUpload();
  const locked = readOnly || disabled;

  const update = (index, field, value) => {
    onChange(defects.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const remove = (index) => {
    onChange(defects.filter((_, i) => i !== index));
  };

  const removePhoto = (index) => {
    update(index, 'photoUrl', '');
  };

  const add = () => {
    onChange([...defects, { description: '', severity: 'Minor', photoUrl: '', status: 'Open' }]);
  };

  // Uses the app's shared Cloudinary signed-upload flow (same as Rectifications'
  // PhotoUploader.jsx) instead of the base64-in-Mongo approach this used to use - keeps
  // API responses small and gives every defect photo a real, permanent URL instead of a
  // multi-hundred-KB data URI embedded in every inspection document returned by the API.
  const handlePhoto = async (index, file) => {
    if (!file) return;
    setUploadError('');
    setUploadingIndex(index);
    try {
      const url = await uploadFile(file, 'inspections', { compress: true });
      update(index, 'photoUrl', url);
    } catch (err) {
      setUploadError(`Failed to upload ${file.name}: ${err.message}`);
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <Box>
      {disabled && !readOnly && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {disabledReason || 'Mark a checklist item as "Fail" before logging a defect.'}
        </Typography>
      )}
      {uploadError && (
        <Typography variant="body2" color="error" sx={{ mb: 1 }}>{uploadError}</Typography>
      )}
      <Stack spacing={1.5}>
        {defects.length === 0 && (
          <Typography variant="body2" color="text.secondary">No defects logged.</Typography>
        )}
        {defects.map((d, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1.5, position: 'relative', bgcolor: 'action.hover' }}>
            {!readOnly && (
              <Tooltip title="Remove this defect entry">
                <IconButton size="small" sx={{ position: 'absolute', top: 4, right: 4 }} onClick={() => remove(i)}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                label="Description"
                placeholder="e.g., Door safety edge misaligned"
                value={d.description}
                disabled={locked}
                required={!locked}
                onChange={(e) => update(i, 'description', e.target.value)}
              />
              <Select
                size="small"
                sx={{ minWidth: 130 }}
                value={d.severity}
                disabled={locked}
                onChange={(e) => update(i, 'severity', e.target.value)}
              >
                <MenuItem value="Minor">Minor</MenuItem>
                <MenuItem value="Major">Major</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              {!locked && (
                <Button size="small" variant="outlined" component="label" disabled={uploading}>
                  {uploadingIndex === i ? `Uploading… ${progress}%` : 'Upload Photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    disabled={uploading}
                    onChange={(e) => handlePhoto(i, e.target.files[0])}
                  />
                </Button>
              )}
              {d.photoUrl && (
                <Box sx={{ position: 'relative', width: 48, height: 48, m: '4px' }}>
                  <Tooltip title="Click to view full size">
                    <Avatar
                      variant="rounded"
                      src={d.photoUrl}
                      sx={{ width: 48, height: 48, cursor: 'pointer' }}
                      onClick={() => setPreviewUrl(d.photoUrl)}
                    />
                  </Tooltip>
                  {!locked && (
                    <Tooltip title="Remove photo">
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper',
                          p: 0.3, boxShadow: 1, border: 1, borderColor: 'divider',
                          '&:hover': { bgcolor: 'error.main', color: 'white' }
                        }}
                        onClick={() => removePhoto(i)}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}
              {d.status && <StatusChip value={d.severity} colorMap={DEFECT_SEVERITY_COLORS} />}
            </Stack>
            {uploadingIndex === i && (
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1, borderRadius: 1 }} />
            )}
          </Paper>
        ))}
      </Stack>

      {!locked && (
        <Button startIcon={<AddIcon />} onClick={add} sx={{ mt: 1.5 }} variant="text">
          Add Defect
        </Button>
      )}

      <Dialog open={Boolean(previewUrl)} onClose={() => setPreviewUrl(null)} maxWidth="md">
        {previewUrl && (
          <Box sx={{ position: 'relative', bgcolor: 'black', display: 'flex', justifyContent: 'center' }}>
            <IconButton
              size="small"
              onClick={() => setPreviewUrl(null)}
              sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.85)' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <img src={previewUrl} alt="Defect photo" style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
