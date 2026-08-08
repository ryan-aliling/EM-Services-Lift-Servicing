// @vitest-environment jsdom
// Component tests for the Log/Edit Defect dialog (Elijah). See test-cases.md.
//
// LiftSelect (embedded in the dialog) fetches lifts on mount. It already degrades to
// an empty picker if that call fails (see LiftSelect.jsx's own .catch), but a real
// axios call would still hit the network and log noisy jsdom XHR errors — mocked
// here purely to keep test output clean; nothing below asserts on lift options.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DefectFormDialog from '../../src/features/defects/DefectFormDialog';

vi.mock('../../src/api/liftApi', () => ({
  fetchLifts: vi.fn().mockResolvedValue([]),
}));

afterEach(cleanup);

const sampleDefect = {
  _id: '1',
  defectNo: 'DEF-0007',
  title: 'Door not closing fully',
  description: '',
  liftId: '',
  location: 'Blk 12 lift lobby',
  severity: 'Major',
  status: 'Open',
  reportedBy: 'Building Manager',
};

describe('DefectFormDialog — create mode', () => {
  test('titles itself "Log Defect" and has no Status field (defects always start Open)', () => {
    render(<DefectFormDialog open defect={null} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Log Defect' })).toBeTruthy();
    expect(screen.queryByText('Status')).toBeNull();
  });

  test('blocks submission and shows inline errors when required fields are empty', async () => {
    const onSubmit = vi.fn();
    render(<DefectFormDialog open defect={null} onClose={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Log Defect' }));

    expect(await screen.findByText('Title is required')).toBeTruthy();
    expect(screen.getByText('Location is required')).toBeTruthy();
    expect(screen.getByText('Severity is required')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('DefectFormDialog — edit mode', () => {
  test('titles itself with the defect number and shows the Status field', () => {
    render(<DefectFormDialog open defect={sampleDefect} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit Defect DEF-0007' })).toBeTruthy();
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
  });

  test('pre-fills the existing values instead of starting from a blank form', () => {
    render(<DefectFormDialog open defect={sampleDefect} onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.getByDisplayValue('Door not closing fully')).toBeTruthy();
    expect(screen.getByDisplayValue('Blk 12 lift lobby')).toBeTruthy();
    expect(screen.getByDisplayValue('Building Manager')).toBeTruthy();
  });
});
