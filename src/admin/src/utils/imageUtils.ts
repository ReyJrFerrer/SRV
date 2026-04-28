const ERROR_IMAGE_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EError%3C/text%3E%3C/svg%3E";

export const getErrorImageUrl = () => ERROR_IMAGE_SVG;

export const addCacheBuster = (url: string): string => {
  if (!url.includes("&token=")) {
    return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  }
  return url;
};

export const findMediaIdFromUrl = async (
  url: string,
  firestore: any,
): Promise<string | null> => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return url;
  }

  try {
    const { collection, query, where, getDocs } =
      await import("firebase/firestore");
    const mediaCollection = collection(firestore, "media");
    const q = query(mediaCollection, where("url", "==", url));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
  } catch (error) {
    console.error("Error finding media ID:", error);
  }

  return null;
};

export const loadTicketAttachmentImages = async (
  attachments: string[],
  firestore: any,
  getMediaItem: (mediaId: string) => Promise<any>,
): Promise<Record<string, string>> => {
  const urls: Record<string, string> = {};

  for (const attachment of attachments) {
    try {
      let mediaId = attachment;

      const foundMediaId = await findMediaIdFromUrl(attachment, firestore);
      if (foundMediaId) {
        mediaId = foundMediaId;
      } else if (
        attachment.startsWith("http://") ||
        attachment.startsWith("https://")
      ) {
        urls[attachment] = attachment;
        continue;
      }

      const mediaItem = await getMediaItem(mediaId);

      if (mediaItem?.url) {
        urls[attachment] = addCacheBuster(mediaItem.url);
      } else {
        console.warn("Failed to get media item for:", attachment);
        urls[attachment] = ERROR_IMAGE_SVG;
      }
    } catch (error) {
      console.error("Error loading image for attachment:", attachment, error);
      urls[attachment] = ERROR_IMAGE_SVG;
    }
  }

  return urls;
};
