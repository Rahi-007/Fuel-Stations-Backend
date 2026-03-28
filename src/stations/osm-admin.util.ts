/**
 * Admin labels for filtering (Bangladesh + generic OSM addressing).
 * Source: OSM tags on the feature — not from map tiles. If tags are missing,
 * fields stay null (later you can add Nominatim reverse geocode).
 */
export function extractAdminFromOsmTags(tags: Record<string, string>): {
  division: string | null;
  district: string | null;
  subDistrict: string | null;
  village: string | null;
} {
  const t = (key: string): string | null => {
    const v = tags[key]?.trim();
    return v ? v : null;
  };

  const division =
    t("addr:state") ||
    t("is_in:state") ||
    t("addr:region") ||
    null;

  /** জেলা — OSM often uses addr:district */
  const district =
    t("addr:district") ||
    t("is_in:district") ||
    t("addr:province") ||
    null;

  const subDistrict =
    t("addr:county") ||
    t("addr:subdistrict") ||
    t("addr:municipality") ||
    null;

  const village =
    t("addr:village") ||
    t("addr:hamlet") ||
    t("addr:neighbourhood") ||
    t("addr:suburb") ||
    t("addr:quarter") ||
    t("addr:city") ||
    null;

  return { division, district, subDistrict, village };
}
