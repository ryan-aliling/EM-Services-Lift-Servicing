import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

// Internal pixel resolution of the canvas - kept fixed and independent of its
// displayed CSS size (width: 100%) so drawing coordinates can be scaled consistently
// regardless of the container's actual on-screen width.
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;

/**
 * Minimal canvas-based e-signature capture using pointer events - deliberately not
 * pulling in react-signature-canvas as a new dependency (per the brief, either is fine).
 * Exposes isEmpty()/clear()/toBlob() via ref so RectificationForm can convert the drawn
 * signature to a PNG blob at submit time and push it through the same useFileUpload
 * upload path as photos.
 */
const SignaturePad = forwardRef(function SignaturePad({ disabled, onChange }, ref) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);

  function getContext() {
    const canvas = canvasRef.current;
    // jsdom (used in component tests) doesn't implement canvas rendering unless the
    // `canvas` npm package is installed, so getContext('2d') can come back null there -
    // every caller below guards against that instead of crashing.
    return canvas ? canvas.getContext('2d') : null;
  }

  function fillWhite() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(() => {
    const ctx = getContext();
    if (!ctx) return;
    fillWhite();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointFromEvent(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || canvas.width);
    const scaleY = canvas.height / (rect.height || canvas.height);
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handlePointerDown(e) {
    if (disabled) return;
    const ctx = getContext();
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e) {
    if (disabled || !drawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = pointFromEvent(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStrokeRef.current = true;
  }

  function handlePointerUp() {
    if (drawingRef.current && hasStrokeRef.current) onChange?.(true);
    drawingRef.current = false;
  }

  function handleClear() {
    fillWhite();
    hasStrokeRef.current = false;
    onChange?.(false);
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasStrokeRef.current,
    clear: handleClear,
    toBlob: () =>
      new Promise((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas || !canvas.toBlob) {
          reject(new Error('Signature capture is not supported in this browser'));
          return;
        }
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to capture signature'))),
          'image/png'
        );
      }),
  }));

  return (
    <Box>
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#fff',
          opacity: disabled ? 0.6 : 1,
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          role="img"
          aria-label="Signature drawing area"
          style={{ width: '100%', height: 200, display: 'block', cursor: disabled ? 'default' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Sign above using mouse, stylus, or touch
        </Typography>
        <Button size="small" disabled={disabled} onClick={handleClear}>
          Clear
        </Button>
      </Stack>
    </Box>
  );
});

export default SignaturePad;
