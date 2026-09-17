import type { SearchEntityType } from "./search";

/**
 * The result kinds as readers see them. Client-safe (no database import): the search box, the results page
 * and the API all read this one table, so a label or an order changes in one place.
 */
export const TYPE_ORDER: readonly SearchEntityType[] = ["tool", "data_series", "guide", "comparison", "professional", "business", "news", "post", "location", "entity"];

export const TYPE_LABEL: Record<SearchEntityType, string> = {
  tool: "Calculator",
  guide: "Guide",
  news: "News",
  business: "Business",
  entity: "Topic",
  location: "Place",
  data_series: "Data",
  comparison: "Compare",
  professional: "Professional",
  post: "Community",
};

export const TYPE_PLURAL: Record<SearchEntityType, string> = {
  tool: "Calculators",
  guide: "Guides",
  news: "News",
  business: "Businesses",
  entity: "Topics",
  location: "Places",
  data_series: "Data",
  comparison: "Comparisons",
  professional: "Professionals",
  post: "Community",
};
