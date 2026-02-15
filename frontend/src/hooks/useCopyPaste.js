import { useEffect } from "react";

export default function useCopyPaste(onEvent) {
  useEffect(() => {
    const handler = (e) => {
      onEvent({
        type: "paste",
        timestamp: Date.now(),
      });
    };

    document.addEventListener("paste", handler);

    return () => {
      document.removeEventListener("paste", handler);
    };
  }, [onEvent]);
}
