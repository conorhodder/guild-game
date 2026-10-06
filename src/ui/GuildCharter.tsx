interface GuildCharterProps {
  heroesViewed: boolean;
  questDispatched: boolean;
  logOpened: boolean;
  onDismiss: () => void;
}

export function GuildCharter({
  heroesViewed,
  questDispatched,
  logOpened,
  onDismiss,
}: GuildCharterProps) {
  const steps = [
    ['Meet your heroes', heroesViewed],
    ['Send your party on Rats in the Cellar', questDispatched],
    ['Read the log', logOpened],
  ] as const;

  return (
    <section aria-labelledby="guild-charter-heading" className="guild-charter">
      <div>
        <h2 id="guild-charter-heading">Guild charter</h2>
        <ul>
          {steps.map(([label, completed]) => (
            <li
              aria-label={`${label} — ${completed ? 'complete' : 'not complete'}`}
              className={completed ? 'guild-charter-complete' : undefined}
              key={label}
            >
              <span aria-hidden="true">{completed ? '✓' : '○'}</span> {label}
            </li>
          ))}
        </ul>
      </div>
      <button onClick={onDismiss} type="button">
        Dismiss charter
      </button>
    </section>
  );
}
