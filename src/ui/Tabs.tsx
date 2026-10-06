import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface TabDefinition {
  id: string;
  label: string;
  panel: ReactNode;
}

interface TabsProps {
  tabs: TabDefinition[];
}

export function Tabs({ tabs }: TabsProps) {
  const [selectedId, setSelectedId] = useState(tabs[0]?.id ?? '');
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeId = tabs.some((tab) => tab.id === selectedId) ? selectedId : (tabs[0]?.id ?? '');

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    setSelectedId(nextTab.id);
    tabRefs.current.get(nextTab.id)?.focus();
  }

  return (
    <div className="tabs">
      <div aria-label="Game sections" className="tab-list" role="tablist">
        {tabs.map((tab, index) => (
          <button
            aria-controls={`${tab.id}-panel`}
            aria-selected={activeId === tab.id}
            className="tab"
            id={`${tab.id}-tab`}
            key={tab.id}
            onClick={() => setSelectedId(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            ref={(element) => {
              if (element) tabRefs.current.set(tab.id, element);
              else tabRefs.current.delete(tab.id);
            }}
            role="tab"
            tabIndex={activeId === tab.id ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <section
          aria-labelledby={`${tab.id}-tab`}
          className="tab-panel"
          hidden={activeId !== tab.id}
          id={`${tab.id}-panel`}
          key={tab.id}
          role="tabpanel"
          tabIndex={0}
        >
          {tab.panel}
        </section>
      ))}
    </div>
  );
}
