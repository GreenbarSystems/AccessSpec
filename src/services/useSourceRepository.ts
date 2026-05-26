import { useSyncExternalStore } from 'react';
import { sourceRepository } from './SourceRepository';
import type { Project } from './SourceRepository';

/**
 * Subscribe to the singleton SourceRepository. Returns the current Project
 * (or null) and the repo instance for mutations.
 */
export function useSourceRepository(): {
  project: Project | null;
  repo: typeof sourceRepository;
} {
  const project = useSyncExternalStore(
    (cb) => sourceRepository.subscribe(cb),
    () => sourceRepository.getProject(),
    () => sourceRepository.getProject(),
  );
  return { project, repo: sourceRepository };
}
