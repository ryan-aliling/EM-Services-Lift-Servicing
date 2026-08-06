// @vitest-environment jsdom
// Component test for the "easy user flow" progress tracker (Aeric).
// See test-cases.md for the full test plan.
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import StatusStepper from '../../src/features/scheduling/StatusStepper';

afterEach(cleanup);

describe('StatusStepper', () => {
  test('marks earlier steps done, the current step current, and later steps pending', () => {
    render(<StatusStepper status="In Progress" />);

    expect(screen.getByText('Scheduled').closest('li').className).toContain('status-step--done');
    expect(screen.getByText('Assigned').closest('li').className).toContain('status-step--done');
    expect(screen.getByText('In Progress').closest('li').className).toContain('status-step--current');
    expect(screen.getByText('Completed').closest('li').className).toContain('status-step--pending');
  });

  test('renders a single Cancelled pill instead of the 4-step tracker', () => {
    render(<StatusStepper status="Cancelled" />);

    expect(screen.getByText('Cancelled')).toBeTruthy();
    expect(screen.queryByText('Scheduled')).toBeNull();
  });
});
