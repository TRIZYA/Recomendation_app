import { useState, useEffect } from "react";

// useDebounce returns a debounced value that updates after the specified delay
export default function useDebounce(value, delay = 700) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
