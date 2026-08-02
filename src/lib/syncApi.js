import { supabase } from './supabaseClient';

/** Pushes the current queue/state to a sync code. Overwrites whatever was there. */
export async function pushSession(code, { queue, currentIndex, volume }) {
  const { error } = await supabase.rpc('upsert_session', {
    p_code: code,
    p_queue: queue,
    p_index: currentIndex,
    p_volume: volume,
  });
  if (error) throw error;
}

/** Fetches whatever is stored under a sync code. Returns null if the code doesn't exist. */
export async function pullSession(code) {
  const { data, error } = await supabase.rpc('get_session', { p_code: code });
  if (error) throw error;
  if (!data || !data.queue) return null;
  return {
    queue: data.queue,
    currentIndex: data.current_index,
    volume: data.volume,
  };
}
