"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  createDefaultDiscoveryQuery,
  parseDiscoveryQuery,
  serializeDiscoveryQuery,
  type DiscoveryQueryState,
} from "../model/discovery-query";

type QueryKey = keyof DiscoveryQueryState;
type Change = {
  [Key in QueryKey]: {
    type: "change";
    key: Key;
    value: SetStateAction<DiscoveryQueryState[Key]>;
  }
}[QueryKey];
type Action = Change | { type: "restore"; state: DiscoveryQueryState };
interface Snapshot {
  state: DiscoveryQueryState;
  ready: boolean;
  intent: "restore" | "push" | "replace";
  navigationVersion: number;
}

function reducer(snapshot: Snapshot, action: Action): Snapshot {
  if (action.type === "restore") {
    return {
      state: action.state,
      ready: true,
      intent: "restore",
      navigationVersion: snapshot.navigationVersion + 1,
    };
  }
  // The key/value relationship is enforced by Change and the public setters.
  const previous = snapshot.state[action.key];
  const value = typeof action.value === "function"
    ? (action.value as (value: DiscoveryQueryState[QueryKey]) => DiscoveryQueryState[QueryKey])(previous)
    : action.value;
  if (Object.is(previous, value)) return snapshot;
  return {
    ...snapshot,
    state: { ...snapshot.state, [action.key]: value },
    intent: action.key === "query" ? "replace" : "push",
  };
}

/** URL state is independent of the server catalog; map interactions never refetch RSCs. */
export function useDiscoveryQuery(restaurants: readonly { id: string }[]) {
  const restaurantIds = useMemo(() => restaurants.map(({ id }) => id), [restaurants]);
  const [snapshot, dispatch] = useReducer(reducer, undefined, (): Snapshot => ({
    state: createDefaultDiscoveryQuery(),
    ready: false,
    intent: "restore",
    navigationVersion: 0,
  }));
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelWrite = useCallback(() => {
    if (writeTimer.current !== null) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const restore = () => {
      cancelWrite();
      dispatch({
        type: "restore",
        state: parseDiscoveryQuery(window.location.search, restaurantIds),
      });
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      cancelWrite();
    };
  }, [restaurantIds, cancelWrite]);

  useEffect(() => {
    if (!snapshot.ready || snapshot.intent === "restore") return;
    const write = () => {
      const query = serializeDiscoveryQuery(snapshot.state);
      const { pathname, hash } = window.location;
      const target = `${pathname}${query ? `?${query}` : ""}${hash}`;
      if (target === `${pathname}${window.location.search}${hash}`) return;
      // Preserve Next's router metadata so browser Back/Forward retain the tree.
      if (snapshot.intent === "push")
        window.history.pushState(window.history.state, "", target);
      else window.history.replaceState(window.history.state, "", target);
      writeTimer.current = null;
    };
    if (snapshot.intent === "replace") writeTimer.current = setTimeout(write, 250);
    else write();
    return cancelWrite;
  }, [snapshot, cancelWrite]);

  const setters = useMemo(() => {
    function setter<Key extends QueryKey>(key: Key): Dispatch<SetStateAction<DiscoveryQueryState[Key]>> {
      return (value) => dispatch({ type: "change", key, value } as Change);
    }
    return {
      setQuery: setter("query"),
      setCategory: setter("category"),
      setView: setter("view"),
      setSort: setter("sort"),
      setFilters: setter("filters"),
      setOrigin: setter("origin"),
      setReturnOrigin: setter("returnOrigin"),
      setSelected: setter("selected"),
    };
  }, []);

  return {
    ...snapshot.state,
    ...setters,
    ready: snapshot.ready,
    navigationVersion: snapshot.navigationVersion,
    state: snapshot.state,
  };
}
