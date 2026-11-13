import { LATIN } from './latin';
import { NON_LATIN } from './nonlatin';
import { compileLayout, type Layout } from './types';

export * from './types';

export const LAYOUTS: Layout[] = [...LATIN, ...NON_LATIN].map(compileLayout);

export function getLayout(id: string): Layout | undefined {
  return LAYOUTS.find((l) => l.id === id);
}
