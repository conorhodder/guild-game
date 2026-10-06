import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuildCharter } from './GuildCharter';

afterEach(() => cleanup());

describe('GuildCharter', () => {
  it('shows each onboarding step state and can be dismissed', () => {
    const onDismiss = vi.fn();

    render(
      <GuildCharter
        heroesViewed
        logOpened={false}
        onDismiss={onDismiss}
        questDispatched
      />,
    );

    expect(
      screen.getByRole('listitem', { name: 'Meet your heroes — complete' }),
    ).toBeDefined();
    expect(
      screen.getByRole('listitem', { name: 'Send your party on Rats in the Cellar — complete' }),
    ).toBeDefined();
    expect(screen.getByRole('listitem', { name: 'Read the log — not complete' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss charter' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
