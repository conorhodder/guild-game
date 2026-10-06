import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AwaySummary } from '../game/systems/offline';
import { AwaySummaryDialog } from './AwaySummaryDialog';

afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-away-trigger]').forEach((trigger) => trigger.remove());
});

const summary: AwaySummary = {
  rawDelta: 27 * 60 * 60 * 1000 + 10 * 60 * 1000,
  credited: 12 * 60 * 60 * 1000,
  capped: true,
  heroes: [
    {
      heroId: 'h1',
      name: 'Maelis Ashford',
      levelsGained: 1,
      xpGained: 123,
      skillUps: [],
      knockouts: 0,
      needsAttention: false,
    },
  ],
  goldGained: 0,
  itemsByRarity: { common: 0, uncommon: 0, rare: 0, named: 0 },
  rareDrops: [],
  namedDrops: [],
  materials: [],
  kills: 0,
  namedKills: 0,
  questsCompleted: 0,
  questsFailed: 0,
  knockouts: 0,
  allQuiet: false,
};

function renderDialog(onDismiss = vi.fn()) {
  const trigger = document.createElement('button');
  trigger.dataset.awayTrigger = 'true';
  trigger.textContent = 'Open summary';
  document.body.append(trigger);
  trigger.focus();
  const view = render(
    <AwaySummaryDialog onDismiss={onDismiss} onGoToHero={vi.fn()} summary={summary} />,
  );
  return { ...view, onDismiss, trigger };
}

function DismissibleDialog({ summary: value }: { summary: AwaySummary }) {
  const [open, setOpen] = useState(true);
  return open ? (
    <AwaySummaryDialog onDismiss={() => setOpen(false)} summary={value} />
  ) : null;
}

function focusTrigger() {
  const trigger = document.createElement('button');
  trigger.dataset.awayTrigger = 'true';
  trigger.textContent = 'Open summary';
  document.body.append(trigger);
  trigger.focus();
  return trigger;
}

describe('AwaySummaryDialog', () => {
  it('announces capped time plainly and focuses within the labelled modal', () => {
    const { trigger } = renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'While you were away' });

    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Go to Maelis Ashford' }));
    expect(screen.getByText(
      'You were away 1d 3h 10m. Progress is capped at 12 hours.',
    )).toBeDefined();
    expect(trigger).not.toBe(document.activeElement);
  });

  it('traps Tab, closes with Escape, and restores focus', () => {
    const trigger = focusTrigger();
    render(<DismissibleDialog summary={summary} />);
    const dialog = screen.getByRole('dialog', { name: 'While you were away' });
    const heroButton = screen.getByRole('button', { name: 'Go to Maelis Ashford' });
    const closeButton = screen.getByRole('button', { name: 'Back to the guild' });

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeButton);
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(heroButton);

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the guild button and shows the quiet state', () => {
    const trigger = focusTrigger();
    const quietSummary = { ...summary, heroes: [], allQuiet: true };
    render(<DismissibleDialog summary={quietSummary} />);

    expect(screen.getByText('All quiet while you were away.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the guild' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('capitalizes skill names like the guild log', () => {
    const skillSummary = {
      ...summary,
      heroes: [
        {
          ...summary.heroes[0]!,
          skillUps: [{ skill: 'defense', count: 5, value: 12 }],
        },
      ],
    };

    render(<DismissibleDialog summary={skillSummary} />);

    expect(screen.getByText('Defense: 5 skill-ups (now 12)')).toBeDefined();
  });
});
