'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type CollectionFilter = 'reading' | 'archive';

interface CollectionFilterContextValue {
  activeFilters: Set<CollectionFilter>;
  toggleFilter: (filter: CollectionFilter) => void;
}

const CollectionFilterContext = createContext<CollectionFilterContextValue>({
  activeFilters: new Set(),
  toggleFilter: () => {},
});

export function CollectionFilterProvider({ children }: { children: ReactNode }) {
  const [activeFilters, setActiveFilters] = useState<Set<CollectionFilter>>(new Set());

  const toggleFilter = (filter: CollectionFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  return (
    <CollectionFilterContext.Provider value={{ activeFilters, toggleFilter }}>
      {children}
    </CollectionFilterContext.Provider>
  );
}

export function useCollectionFilter() {
  return useContext(CollectionFilterContext);
}
