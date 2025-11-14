export const handleDeleteReview = async (
  reviewId: string,
  deleteReview: (id: string) => Promise<void>,
  onSuccess: () => void,
  onError: (error: string) => void,
  setDeletingId: (id: string | null) => void,
) => {
  if (!reviewId) return;

  setDeletingId(reviewId);
  try {
    await deleteReview(reviewId);
    onSuccess();
  } catch (e) {
    console.error("Error deleting review:", e);
    onError("Failed to delete review.");
  } finally {
    setDeletingId(null);
  }
};

export const handleRestoreReview = async (
  reviewId: string,
  restoreReview: (id: string) => Promise<void>,
  onSuccess: () => void,
  onError: (error: string) => void,
  setDeletingId: (id: string | null) => void,
) => {
  if (!reviewId) return;

  setDeletingId(reviewId);
  try {
    await restoreReview(reviewId);
    onSuccess();
  } catch (e) {
    console.error("Error restoring review:", e);
    onError("Failed to restore review.");
  } finally {
    setDeletingId(null);
  }
};

export const sortReviews = (
  reviews: any[],
  sortBy: "newest" | "oldest" | "highest" | "lowest",
): any[] => {
  return [...reviews].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });
};

export const filterReviewsByRating = (
  reviews: any[],
  filterRating: number | null,
): any[] => {
  if (!filterRating) return reviews;
  return reviews.filter((review) => review.rating === filterRating);
};

export const filterReviewsByVisibility = (
  reviews: any[],
  showHidden: boolean,
): any[] => {
  if (showHidden) return reviews;
  return reviews.filter((review) => review.status === "Visible");
};
