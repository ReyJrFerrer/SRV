export interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  providerId?: string;
  clientId?: string;
  bookingId?: string;
  clientName?: string;
  providerName?: string;
  status?: "Visible" | "Hidden" | "Flagged" | "Deleted";
}

export type ReviewTab = "received" | "given-client" | "given-provider";

export interface ReviewStats {
  total: number;
  counts: Record<number, number>;
  avg: number;
}

/**
 * Get current reviews based on active tab and filter
 */
export const getCurrentReviews = (
  activeTab: ReviewTab,
  receivedReviews: Review[],
  givenAsClientReviews: Review[],
  givenAsProviderReviews: Review[],
  showHiddenOnly: boolean,
): Review[] => {
  let reviews: Review[] = [];
  switch (activeTab) {
    case "received":
      reviews = receivedReviews;
      break;
    case "given-client":
      reviews = givenAsClientReviews;
      break;
    case "given-provider":
      reviews = givenAsProviderReviews;
      break;
    default:
      reviews = receivedReviews;
  }

  // Filter by status if showHiddenOnly is true
  if (showHiddenOnly) {
    return reviews.filter((r) => r.status === "Hidden");
  }

  // Show all reviews (visible and hidden) but separate them
  return reviews;
};

/**
 * Filter visible reviews from current reviews
 */
export const getVisibleReviews = (reviews: Review[]): Review[] => {
  return reviews.filter((r) => r.status === "Visible" || !r.status);
};

/**
 * Filter hidden reviews from current reviews
 */
export const getHiddenReviews = (reviews: Review[]): Review[] => {
  return reviews.filter((r) => r.status === "Hidden");
};

/**
 * Get reviews to display (visible first, then hidden)
 */
export const getDisplayReviews = (
  visibleReviews: Review[],
  hiddenReviews: Review[],
): Review[] => {
  return [...visibleReviews, ...hiddenReviews];
};

/**
 * Calculate review statistics
 */
export const calculateReviewStats = (reviews: Review[]): ReviewStats => {
  const total = reviews.length;
  const counts = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
    (acc, r) => ({ ...acc, [r]: 0 }),
    {},
  );
  let sum = 0;
  reviews.forEach((r) => {
    counts[r.rating] = (counts[r.rating] || 0) + 1;
    sum += r.rating;
  });
  const avg = total ? sum / total : 0;
  return { total, counts, avg };
};

/**
 * Toggle select all reviews
 */
export const toggleSelectAll = (
  selectedReviews: Set<string>,
  displayReviews: Review[],
): Set<string> => {
  if (selectedReviews.size === displayReviews.length) {
    return new Set();
  } else {
    return new Set(displayReviews.map((r) => r.id));
  }
};

/**
 * Toggle select single review
 */
export const toggleSelectReview = (
  selectedReviews: Set<string>,
  reviewId: string,
): Set<string> => {
  const newSelected = new Set(selectedReviews);
  if (newSelected.has(reviewId)) {
    newSelected.delete(reviewId);
  } else {
    newSelected.add(reviewId);
  }
  return newSelected;
};
