import { useEffect } from "react";

export default function useTabSwitch(onEvent) {
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        onEvent({
          type: "tab_switch",
          timestamp: Date.now(),
        });
      }
    };

    document.addEventListener("visibilitychange", handler);
    return () =>
      document.removeEventListener("visibilitychange", handler);
  }, [onEvent]);
}
