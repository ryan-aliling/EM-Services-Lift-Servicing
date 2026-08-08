// @vitest-environment jsdom
// Component tests for the Rectification create/edit dialog (Ryan). See test-cases.md.
//
// defectApi.fetchDefects (used by the embedded DefectSelect) and the shared
// useFileUpload hook (used by PhotoUploader + the signature upload step) are mocked so
// these tests never hit the network/S3. notistack is mocked too since RectificationForm
// calls useSnackbar() directly and a real SnackbarProvider isn't needed for these
// assertions. jsdom doesn't implement <canvas> rendering without the `canvas` npm
// package, so drawing-then-enabling the Submit button is covered manually instead (see
// test-cases.md #12) - these tests focus on the states that don't require it.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import RectificationForm from '../../src/features/rectifications/RectificationForm';

vi.mock('../../src/api/defectApi', () => ({
  fetchDefects: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../src/hooks/useFileUpload', () => ({
  useFileUpload: () => ({ uploadFile: vi.fn(), uploading: false, progress: 0, error: null }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: vi.fn() }),
}));

// jsdom doesn't implement canvas rendering without the `canvas` npm package - it logs a
// noisy "not implemented" console error every time SignaturePad calls getContext('2d')
// otherwise. SignaturePad already treats a null context as "unsupported here" and
// degrades gracefully (see its own comment), so stubbing this out just keeps test
// output clean, the same way Elijah's DefectFormDialog test mocks fetchLifts.
HTMLCanvasElement.prototype.getContext = () => null;

afterEach(cleanup);

const draftWithPhoto = {
  _id: 'r1',
  defectId: 'defect1',
  rectifiedBy: 'John Tan',
  liftCompanyName: 'Acme Lift Co',
  dateRectified: '2026-08-01',
  proofPhotos: ['https://bucket.s3.amazonaws.com/photo-1.jpg'],
  signatureUrl: '',
  remarks: '',
  status: 'Draft',
};

const draftWithSignature = {
  ...draftWithPhoto,
  signatureUrl: 'https://bucket.s3.amazonaws.com/signature-1.png',
};

describe('RectificationForm — create mode', () => {
  test('titles itself "New Rectification" and shows the Draft/Submit button pair', () => {
    render(<RectificationForm open rectification={null} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'New Rectification' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).toBeNull();
  });

  test('blocks "Save as Draft" and shows inline errors when required fields are empty', async () => {
    const onSubmit = vi.fn();
    render(<RectificationForm open rectification={null} onClose={vi.fn()} onSubmit={onSubmit} />);

    screen.getByRole('button', { name: 'Save as Draft' }).click();

    expect(await screen.findByText('Defect is required')).toBeTruthy();
    expect(screen.getByText('Rectified By is required')).toBeTruthy();
    expect(screen.getByText('Date Rectified is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('Submit is disabled with no photos and no signature', () => {
    render(<RectificationForm open rectification={null} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
  });

  test('shows the signature pad (not a "Redraw Signature" button) when there is no signature yet', () => {
    render(<RectificationForm open rectification={null} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Signature drawing area' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Redraw Signature' })).toBeNull();
  });
});

describe('RectificationForm — edit mode, Draft', () => {
  test('pre-fills the existing values instead of starting from a blank form', () => {
    render(<RectificationForm open rectification={draftWithPhoto} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue('John Tan')).toBeTruthy();
    expect(screen.getByDisplayValue('Acme Lift Co')).toBeTruthy();
  });

  test('locks the Defect picker once the record exists', () => {
    render(<RectificationForm open rectification={draftWithPhoto} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Defect')).toHaveProperty('disabled', true);
  });

  test('Submit stays disabled with a photo but no signature', () => {
    render(<RectificationForm open rectification={draftWithPhoto} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveProperty('disabled', true);
  });

  test('shows every uploaded photo in the gallery', () => {
    const twoPhotos = { ...draftWithPhoto, proofPhotos: ['https://x/photo-1.jpg', 'https://x/photo-2.jpg'] };
    render(<RectificationForm open rectification={twoPhotos} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByAltText('Proof photo 1')).toBeTruthy();
    expect(screen.getByAltText('Proof photo 2')).toBeTruthy();
  });

  test('shows the existing signature as a static image with a "Redraw Signature" option', () => {
    render(<RectificationForm open rectification={draftWithSignature} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByAltText('Signature')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Redraw Signature' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Signature drawing area' })).toBeNull();
  });
});

describe('RectificationForm — edit mode, Submitted', () => {
  const submitted = { ...draftWithSignature, status: 'Submitted' };

  test('offers one "Save Changes" button instead of the Draft/Submit pair, with files still editable', () => {
    render(<RectificationForm open rectification={submitted} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save as Draft' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    expect(screen.getByRole('button', { name: /Add Photo/ })).toBeTruthy();
  });
});

describe('RectificationForm — edit mode, Endorsed', () => {
  const endorsed = { ...draftWithSignature, status: 'Endorsed', endorsedBy: 'EM Staff', endorsedDate: '2026-08-05' };

  test('disables photo and signature editing, offering only "Save Changes"', () => {
    render(<RectificationForm open rectification={endorsed} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add Photo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Redraw Signature' })).toBeNull();
    expect(screen.getByAltText('Signature')).toBeTruthy();
  });
});
