import React from 'react';
import { Box, Typography, Select, MenuItem, TextField, Stack, Button, ButtonGroup } from '@mui/material';

export default function ChecklistEditor({ checklist, onChange, readOnly }) {
  const update = (index, field, value) => {
    const next = checklist.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    onChange(next);
  };

  const setAll = (result) => {
    onChange(checklist.map((c) => ({ ...c, result })));
  };

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      {!readOnly && (
        <ButtonGroup size="small" sx={{ mb: 1.5 }}>
          <Button onClick={() => setAll('Pass')}>All Pass</Button>
          <Button onClick={() => setAll('Fail')}>All Fail</Button>
        </ButtonGroup>
      )}
      <Stack spacing={1} sx={{ maxHeight: 220, overflowY: 'auto' }}>
        {checklist.map((c, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">{c.item}</Typography>
            <Select
              size="small"
              value={c.result}
              disabled={readOnly}
              onChange={(e) => update(i, 'result', e.target.value)}
            >
              <MenuItem value="Pass">Pass</MenuItem>
              <MenuItem value="Fail">Fail</MenuItem>
              <MenuItem value="N/A">N/A</MenuItem>
            </Select>
            <TextField
              size="small"
              placeholder="Remarks"
              value={c.remarks || ''}
              disabled={readOnly}
              onChange={(e) => update(i, 'remarks', e.target.value)}
            />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
