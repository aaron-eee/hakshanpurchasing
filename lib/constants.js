export const LOCATIONS = ["Cheras Warehouse", "Central Kitchen", "KD Hakshan"];
export const CATEGORIES = ["Decor", "Furniture", "Kitchen Equipment", "Packaging", "Cleaning", "Electronics", "Other"];
export const daysBetween = (d) => {
  if (!d) return null;
  const t = new Date(d + "T00:00:00");
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((t - n) / 86400000);
};
