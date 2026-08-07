// @vitest-environment jsdom
// Component test for the "easy user flow" progress tracker (Aeric).
// See test-cases.md for the full test plan.
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import StatusStepper from '../../src/features/scheduling/StatusStepper';

afterEach(cleanup);

describe('StatusStepper', () => {
  test('renders all four workflow steps for a Scheduled schedule', () => {
    render(<StatusStepper status="Scheduled" />);

    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.getByText('Assigned')).toBeTruthy();
    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
  });

  test('renders a single Cancelled chip instead of the 4-step tracker', () => {
    render(<StatusStepper status="Cancelled" />);

    expect(screen.getByText('Cancelled')).toBeTruthy();
    // Cancelled is terminal — none of the workflow step labels should render.
    expect(screen.queryByText('Scheduled')).toBeNull();
    expect(screen.queryByText('In Progress')).toBeNull();
  });
});
