import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Carga datos cada vez que la pantalla toma foco (y cuando cambia `fetcher`).
 * `fetcher` debe ser estable (useCallback) y devolver una promesa.
 */
export function useFocusFetch(fetcher) {
  const [state, setState] = useState({ data: null, error: null, loading: true, refreshing: false });
  const seq = useRef(0);

  const run = useCallback(
    async (mode) => {
      const mine = ++seq.current;
      setState((s) => ({ ...s, loading: s.data === null, refreshing: mode === 'refresh', error: null }));
      try {
        const data = await fetcher();
        if (mine === seq.current) setState({ data, error: null, loading: false, refreshing: false });
      } catch (e) {
        if (mine === seq.current) setState((s) => ({ ...s, error: e.message, loading: false, refreshing: false }));
      }
    },
    [fetcher]
  );

  useFocusEffect(
    useCallback(() => {
      run('initial');
    }, [run])
  );

  const refresh = useCallback(() => run('refresh'), [run]);
  const reload = useCallback(() => run('initial'), [run]);
  return { ...state, refresh, reload };
}
