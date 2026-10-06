import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Tabs } from './Tabs';

afterEach(() => {
  cleanup();
});

describe('Tabs', () => {
  it('does not render inactive panels during parent updates', () => {
    let rosterRenders = 0;
    let questRenders = 0;

    function RosterPanel() {
      rosterRenders += 1;
      return <p>Roster panel</p>;
    }

    function QuestPanel() {
      questRenders += 1;
      return <p>Quest panel</p>;
    }

    function makeTabs() {
      return [
        { id: 'roster', label: 'Roster', panel: <RosterPanel /> },
        { id: 'quests', label: 'Quests', panel: <QuestPanel /> },
      ];
    }

    const view = render(<Tabs selectedId="roster" tabs={makeTabs()} />);
    expect(rosterRenders).toBe(1);
    expect(questRenders).toBe(1);

    view.rerender(<Tabs selectedId="roster" tabs={makeTabs()} />);
    expect(rosterRenders).toBe(2);
    expect(questRenders).toBe(1);

    view.rerender(<Tabs selectedId="quests" tabs={makeTabs()} />);
    expect(screen.getByRole('tab', { name: 'Quests' }).getAttribute('aria-selected')).toBe('true');
    expect(questRenders).toBe(2);
    expect(rosterRenders).toBe(3);
  });
});
