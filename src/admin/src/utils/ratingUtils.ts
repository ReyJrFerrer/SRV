export const calculateRatingDistribution = (
  items: Array<{ rating?: number }>,
): Record<number, number> => {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  items.forEach((item) => {
    if (item.rating && item.rating >= 1 && item.rating <= 5) {
      dist[item.rating] = (dist[item.rating] || 0) + 1;
    }
  });
  return dist;
};

export const calculateAverageRating = (
  items: Array<{ rating?: number }>,
): number => {
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, item) => acc + (item.rating || 0), 0);
  return sum / items.length;
};

