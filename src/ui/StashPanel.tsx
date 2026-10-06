import { useState } from 'react';
import { classes } from '../game/data/classes';
import { itemsById } from '../game/data/items';
import type { GameState, ItemData, ItemSlot } from '../game/types';

const slotLabels: Record<ItemSlot, string> = {
  mainHand: 'Main hand',
  offHand: 'Off hand',
  body: 'Body',
  trinket: 'Trinket',
  material: 'Material',
};

const statLabels: Record<string, string> = {
  attack: 'Attack',
  armor: 'Armor',
  hp: 'HP',
  heal: 'Heal',
};

interface StashPanelProps {
  game: GameState;
  onSell: (uid: string) => string | null;
  onSellMaterial: (itemId: string, quantity: number) => string | null;
}

function ItemDetails({ item }: { item: ItemData }) {
  const restrictions =
    item.classes === 'all' ? 'All classes' : item.classes.map((id) => classes[id].name).join(', ');
  const stats = Object.entries(item.stats)
    .map(([stat, value]) => `${statLabels[stat] ?? stat} +${value}`)
    .join(', ');

  return (
    <>
      <p className={`item-rarity rarity-${item.rarity}`}>{item.rarity}</p>
      <p>Slot: {slotLabels[item.slot]}</p>
      <p>Level required: {item.levelReq}</p>
      <p>Classes: {restrictions}</p>
      <p>Stats: {stats || '—'}</p>
      <p>Value: {item.value} gold</p>
    </>
  );
}

export function StashPanel({ game, onSell, onSellMaterial }: StashPanelProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const gear = Object.values(game.stash).flatMap((instance) => {
    const item = itemsById[instance.itemId];
    return item && item.slot !== 'material' ? [{ instance, item }] : [];
  });
  const materials = Object.entries(game.materials).flatMap(([itemId, quantity]) => {
    const item = itemsById[itemId];
    return item?.slot === 'material' ? [{ item, quantity }] : [];
  });

  function handleSell(uid: string) {
    setMessage(onSell(uid) ?? 'Item sold.');
  }

  function handleSellMaterial(itemId: string, quantity: number) {
    setMessage(onSellMaterial(itemId, quantity) ?? 'Materials sold.');
  }

  return (
    <section aria-labelledby="stash-heading" className="stash">
      <h2 id="stash-heading">Stash</h2>
      <section aria-labelledby="stash-items-heading">
        <h3 id="stash-items-heading">Items</h3>
        {gear.length === 0 ? (
          <p>The stash is empty.</p>
        ) : (
          <ul className="stash-list">
            {gear.map(({ instance, item }) => (
              <li key={instance.uid}>
                <h4>{item.name}</h4>
                <ItemDetails item={item} />
                <button onClick={() => handleSell(instance.uid)} type="button">
                  Sell {item.name} for {item.value} gold
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="stash-materials-heading">
        <h3 id="stash-materials-heading">Materials</h3>
        {materials.length === 0 ? (
          <p>No materials.</p>
        ) : (
          <ul className="stash-list">
            {materials.map(({ item, quantity }) => (
              <li key={item.id}>
                <h4>{item.name}</h4>
                <ItemDetails item={item} />
                <p>Quantity: {quantity}</p>
                <label htmlFor={`sell-quantity-${item.id}`}>
                  Quantity to sell {item.name}
                </label>
                <input
                  id={`sell-quantity-${item.id}`}
                  max={quantity}
                  min={1}
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [item.id]: Number(event.target.value),
                    }))
                  }
                  type="number"
                  value={Math.min(quantities[item.id] ?? 1, quantity)}
                />
                <button
                  onClick={() =>
                    handleSellMaterial(item.id, Math.min(quantities[item.id] ?? 1, quantity))
                  }
                  type="button"
                >
                  Sell {item.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
