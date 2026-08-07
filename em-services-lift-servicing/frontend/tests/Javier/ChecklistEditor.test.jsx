// @vitest-environment jsdom
// Component test for the checklist bulk-set buttons (Javier, client feedback:
// "Add a all pass/all fail for the inspection checklist"). See test-cases.md.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import ChecklistEditor from '../../src/features/inspections/ChecklistEditor';

afterEach(cleanup);

const sampleChecklist = [
  { item: 'Door operation', result: 'N/A', remarks: '' },
  { item: 'Emergency alarm', result: 'N/A', remarks: '' },
];

describe('ChecklistEditor', () => {
  test('renders every checklist item', () => {
    render(<ChecklistEditor checklist={sampleChecklist} onChange={() => {}} />);

    expect(screen.getByText('Door operation')).toBeTruthy();
    expect(screen.getByText('Emergency alarm')).toBeTruthy();
  });

  test('"All Pass" sets every item\'s result to Pass in one click', () => {
    const onChange = vi.fn();
    render(<ChecklistEditor checklist={sampleChecklist} onChange={onChange} />);

    fireEvent.click(screen.getByText('All Pass'));

    expect(onChange).toHaveBeenCalledWith([
      { item: 'Door operation', result: 'Pass', remarks: '' },
      { item: 'Emergency alarm', result: 'Pass', remarks: '' },
    ]);
  });

  test('"All Fail" sets every item\'s result to Fail in one click', () => {
    const onChange = vi.fn();
    render(<ChecklistEditor checklist={sampleChecklist} onChange={onChange} />);

    fireEvent.click(screen.getByText('All Fail'));

    expect(onChange).toHaveBeenCalledWith([
      { item: 'Door operation', result: 'Fail', remarks: '' },
      { item: 'Emergency alarm', result: 'Fail', remarks: '' },
    ]);
  });

  test('hides the bulk-set buttons in read-only mode', () => {
    render(<ChecklistEditor checklist={sampleChecklist} onChange={() => {}} readOnly />);

    expect(screen.queryByText('All Pass')).toBeNull();
    expect(screen.queryByText('All Fail')).toBeNull();
  });
});
