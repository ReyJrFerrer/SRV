export const mapTrustLevel = (trustLevel: any): string => {
  if (!trustLevel || typeof trustLevel !== "object") return "New";

  const levels = ["New", "Low", "Medium", "High", "VeryHigh"];
  for (const level of levels) {
    if (trustLevel.hasOwnProperty(level)) return level;
  }
  return "VeryHigh";
};
