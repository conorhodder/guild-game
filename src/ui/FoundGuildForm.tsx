import { useState } from 'react';
import type { FormEvent } from 'react';

interface FoundGuildFormProps {
  onFound: (name: string) => void;
}

export function FoundGuildForm({ onFound }: FoundGuildFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 32) {
      setError('Enter a guild name between 1 and 32 characters.');
      return;
    }

    setError('');
    onFound(trimmedName);
  }

  return (
    <section aria-labelledby="found-guild-heading" className="found-guild">
      <h2 id="found-guild-heading">Found your guild</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="guild-name">Guild name</label>
        <input
          id="guild-name"
          maxLength={64}
          onChange={(event) => setName(event.target.value)}
          type="text"
          value={name}
        />
        <button type="submit">Found your guild</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
