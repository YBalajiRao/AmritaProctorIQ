import { useEffect, useRef } from "react";

export default function useDwellTime(questionId, onEvent) {
  const startTime = useRef(Date.now());
  const questionRef = useRef(questionId);

  useEffect(() => {
    // When question changes, log dwell time for previous question
    if (questionRef.current !== questionId) {
      const dwellTime = Date.now() - startTime.current;
      
      onEvent({
        type: "question_dwell",
        questionId: questionRef.current,
        dwellTime: dwellTime,
        timestamp: Date.now(),
      });

      // Reset for new question
      questionRef.current = questionId;
      startTime.current = Date.now();
    }
  }, [questionId, onEvent]);

  // Return current dwell time for display
  return () => Date.now() - startTime.current;
}
