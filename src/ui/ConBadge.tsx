import type { Con } from '../game/types';

const labels: Record<Con, string> = {
  trivial: 'Trivial',
  easy: 'Easy',
  even: 'Even',
  tough: 'Tough',
  deadly: 'Deadly',
};

export function ConBadge({ con }: { con: Con }) {
  return <span className={`con-badge con-${con}`}>{labels[con]}</span>;
}
