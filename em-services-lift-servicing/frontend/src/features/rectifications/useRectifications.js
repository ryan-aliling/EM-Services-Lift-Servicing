import { useCallback, useEffect, useState } from 'react';
import * as rectificationApi from '../../api/rectificationApi';

// Wraps every /api/rectifications call (list/get one/create/update/endorse/delete) behind
// one hook, so RectificationsSection/RectificationDetail/RectificationForm all share the
// same list state instead of each re-implementing their own load()/error handling.
export function useRectifications() {
  const [rectifications, setRectifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rectificationApi.fetchRectifications();
      setRectifications(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rectifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const getOne = useCallback((id) => rectificationApi.fetchRectification(id), []);

  const create = useCallback(
    async (payload) => {
      const created = await rectificationApi.createRectification(payload);
      await load();
      return created;
    },
    [load]
  );

  const update = useCallback(
    async (id, payload) => {
      const updated = await rectificationApi.updateRectification(id, payload);
      await load();
      return updated;
    },
    [load]
  );

  const endorse = useCallback(
    async (id, endorsedBy) => {
      const endorsed = await rectificationApi.endorseRectification(id, endorsedBy);
      await load();
      return endorsed;
    },
    [load]
  );

  const remove = useCallback(
    async (id) => {
      await rectificationApi.deleteRectification(id);
      await load();
    },
    [load]
  );

  return { rectifications, loading, error, reload: load, getOne, create, update, endorse, remove };
}
