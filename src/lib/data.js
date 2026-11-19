import { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Small data layer so pages never call the SDK inline.
 * Always reads a page of records and returns a plain array.
 */
export function useCollection(entityName, query = {}, options = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const key = JSON.stringify({ query, options });
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const result = await base44.entities[entityName].filter(query, options);
      if (!alive.current) return;
      setItems(Array.isArray(result) ? result : result?.items || []);
      setError(null);
    } catch (err) {
      if (!alive.current) return;
      setError(err);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [entityName, key]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  return { items, setItems, loading, error, reload };
}

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await base44.entities.Profile.filter({}, { limit: 1 });
      const list = Array.isArray(result) ? result : result?.items || [];
      setProfile(list[0] || null);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch) => {
      if (profile?.id) {
        const updated = await base44.entities.Profile.update(profile.id, patch);
        const next = { ...profile, ...patch, ...(updated || {}) };
        setProfile(next);
        return next;
      }
      const created = await base44.entities.Profile.create(patch);
      setProfile(created);
      return created;
    },
    [profile]
  );

  return { profile, loading, error, save, reload: load };
}

/** Single record by id. Returns null when it doesn't exist (or isn't yours). */
export function useRecord(entityName, id) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!id) {
      setRecord(null);
      setLoading(false);
      return;
    }
    try {
      const result = await base44.entities[entityName].get(id);
      setRecord(result);
      setError(null);
    } catch (err) {
      setError(err);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [entityName, id]);

  useEffect(() => {
    setLoading(!!id);
    reload();
  }, [reload, id]);

  return { record, setRecord, loading, error, reload };
}