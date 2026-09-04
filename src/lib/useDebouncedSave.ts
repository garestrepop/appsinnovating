import { useEffect, useRef } from "react";

/**
 * Llama a `save(value)` `delayMs` después del último cambio de `value`,
 * y solo si el valor cambió respecto al último guardado exitoso.
 */
export function useDebouncedSave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delayMs = 2000
) {
  const lastSaved = useRef<T>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === lastSaved.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      save(value)
        .then(() => {
          lastSaved.current = value;
        })
        .catch(() => {
          // Se reintentará en el próximo cambio o guardado manual.
        });
    }, delayMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);
}
