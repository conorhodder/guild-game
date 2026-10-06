import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConBadge } from './ConBadge';

describe('ConBadge', () => {
  it('always renders the con label as text', () => {
    render(<ConBadge con="deadly" />);

    expect(screen.getByText('Deadly').classList.contains('con-deadly')).toBe(true);
  });
});
