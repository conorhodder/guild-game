import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNewGame } from '../game/newGame';
import { LedgerPanel } from './LedgerPanel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('LedgerPanel', () => {
  it('shows local stats and downloads only the Ledger as JSON', async () => {
    const ledger = createNewGame({
      seed: 1,
      wallMs: 1_700_000_000_000,
      guildName: 'Test Guild',
    }).ledger;
    ledger.namedKills = 1;
    ledger.namedMonstersSlainById = { grizzlefang: 1 };
    ledger.itemsByRarity.named = 1;
    ledger.namedDrops = 1;
    render(<LedgerPanel ledger={ledger} />);
    const createObjectURL = vi.fn<(blob: Blob) => string>().mockReturnValue('blob:local-ledger');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    let clickedDownload: string | undefined;
    let clickedHref: string | undefined;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedDownload = this.download;
      clickedHref = this.href;
    });
    vi.useFakeTimers();

    expect(screen.getByText('The Ledger never leaves this device.')).toBeDefined();
    expect(screen.getByText(/Grizzlefang \(grizzlefang\) — 1/)).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Export ledger (JSON)' }));
    vi.runAllTimers();

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe('application/json');
    expect(await blob?.text()).toBe(JSON.stringify(ledger, null, 2));
    expect(clickedDownload).toBe('guild-ledger.json');
    expect(clickedHref).toBe('blob:local-ledger');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local-ledger');
  });
});
