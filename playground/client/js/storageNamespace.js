/*
   AlgoArena - Storage namespace helpers
   Separates localStorage by runtime context:
   - playground: algoarena:playground:...
   - challenge:  algoarena:challenge:<name>:...
*/

import { detectRuntimeContext } from './modes/runtimeContext.js';

const BASE_NAMESPACE = 'algoarena';
const FALLBACK_CHALLENGE = 'default';

function normalizeSegment(value, fallbackValue) {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  const normalized = raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallbackValue;
}

export function resolveStorageContext(runtimeContext = detectRuntimeContext()) {
  const isChallenge = Boolean(runtimeContext?.isEmbeddedChallenge || runtimeContext?.challenge);
  const challengeName = normalizeSegment(runtimeContext?.challenge, FALLBACK_CHALLENGE);

  if (isChallenge) {
    const scope = `challenge:${challengeName}`;
    return Object.freeze({
      scope,
      namespace: `${BASE_NAMESPACE}:${scope}`,
      allowLegacyFallback: false,
    });
  }

  const scope = 'playground';
  return Object.freeze({
    scope,
    namespace: `${BASE_NAMESPACE}:${scope}`,
    // Keep backward compatibility for old non-namespaced keys in normal playground mode.
    allowLegacyFallback: true,
  });
}

export function namespacedStorageKey(key, storageContext = resolveStorageContext()) {
  return `${storageContext.namespace}:${key}`;
}

export function createProjectStorageKeys(runtimeContext = detectRuntimeContext()) {
  const context = resolveStorageContext(runtimeContext);
  return Object.freeze({
    context,
    projects: namespacedStorageKey('projects_v1', context),
    current: namespacedStorageKey('current_v1', context),
    legacyProjects: 'algoarena_projects_v1',
    legacyCurrent: 'algoarena_current_v1',
  });
}

export function createThemeStorageKeys(runtimeContext = detectRuntimeContext()) {
  const context = resolveStorageContext(runtimeContext);
  const contextKey = `arenacode-theme:${context.scope}`;

  return Object.freeze({
    context,
    contextKey,
    legacyGlobal: 'arenacode-theme',
    legacyKeys: ['theme', 'labyrinth-theme', 'treasure-theme'],
  });
}
