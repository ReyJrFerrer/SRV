export const extractFulfilledResults = <T>(
  results: PromiseSettledResult<T>[],
): T[] => {
  return results
    .filter(
      (result): result is PromiseFulfilledResult<T> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);
};

export const extractFulfilledArrayResults = <T>(
  results: PromiseSettledResult<T[]>[],
): T[] => {
  return results
    .filter(
      (result): result is PromiseFulfilledResult<T[]> =>
        result.status === "fulfilled" && Array.isArray(result.value),
    )
    .flatMap((result) => result.value);
};

export const handlePromiseSettledResults = <T>(
  results: PromiseSettledResult<T>[],
  defaultValue: T,
): T => {
  const fulfilled = results.find(
    (r): r is PromiseFulfilledResult<T> => r.status === "fulfilled",
  );
  return fulfilled ? fulfilled.value : defaultValue;
};

export const handlePromiseSettledArrayResults = <T>(
  results: PromiseSettledResult<T[]>[],
  defaultValue: T[] = [],
): T[] => {
  const fulfilled = results.find(
    (r): r is PromiseFulfilledResult<T[]> =>
      r.status === "fulfilled" && Array.isArray(r.value),
  );
  return fulfilled ? fulfilled.value : defaultValue;
};
