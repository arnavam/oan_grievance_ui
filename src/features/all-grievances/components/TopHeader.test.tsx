/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { TopHeader } from './TopHeader';

describe('TopHeader', () => {
  it('shows a loading badge instead of a zero total while the summary is in flight', () => {
    const { container } = render(<TopHeader totalCount={0} summaryLoading />);
    const view = within(container);

    expect(view.getByRole('status')).toHaveTextContent('Loading');
    expect(view.queryByText('0 Total')).toBeNull();
  });

  it('shows the total once the summary has loaded', () => {
    const { container } = render(<TopHeader totalCount={42} />);
    expect(within(container).getByText('42 Total')).toBeTruthy();
  });
});
