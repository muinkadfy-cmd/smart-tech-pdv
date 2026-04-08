import { useEffect } from "react";

export function useKeyboardShortcuts(bindings: Array<{ key: string; handler: () => void; meta?: boolean }>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      bindings.forEach((binding) => {
        const matchesMeta = binding.meta ? event.ctrlKey || event.metaKey : true;
        if (matchesMeta && event.key.toLowerCase() === binding.key.toLowerCase()) {
          event.preventDefault();
          binding.handler();
        }
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings]);
}
