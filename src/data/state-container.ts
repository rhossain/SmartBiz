/**
 * src/data/state-container.ts — typed state container with
 * `get` / `set` / `subscribe`. Closure-scoped; no global state
 * (NFR7.5; team.md#Code Style §CS-7).
 */
export type Unsubscribe = () => void;

export interface StateContainer<State> {
  readonly get: () => State;
  readonly set: (next: State) => void;
  readonly update: (mut: (prev: State) => State) => void;
  readonly subscribe: (fn: (s: State) => void) => Unsubscribe;
}

export const createStateContainer = <State>(initial: State): StateContainer<State> => {
  let value: State = initial;
  const subs = new Set<(s: State) => void>();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      for (const s of subs) s(value);
    },
    update: (mut) => {
      value = mut(value);
      for (const s of subs) s(value);
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
};
