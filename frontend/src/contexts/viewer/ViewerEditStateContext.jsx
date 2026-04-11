import { createContext, useContext } from "react";

const ViewerEditStateContext = createContext(null);

export const ViewerEditStateProvider = ({ value, children }) => (
  <ViewerEditStateContext.Provider value={value}>
    {children}
  </ViewerEditStateContext.Provider>
);

export const useViewerEditStateContext = () => {
  const ctx = useContext(ViewerEditStateContext);
  return ctx ?? { data: {}, events: {} };
};
