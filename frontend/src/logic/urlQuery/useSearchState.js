import { useState } from "react";

import { defaultSearchQuery } from "./searchSpec";

export const useSearchState = () => {
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);

  const updateSearchQuery = (key, value) => {
    setSearchQuery((prev) => ({ ...prev, [key]: value }));
  };
  const resetSearchQuery = () => {
    setSearchQuery(defaultSearchQuery);
  };

  return { searchQuery, updateSearchQuery, resetSearchQuery };
};
