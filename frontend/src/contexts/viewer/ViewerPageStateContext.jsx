import { createContext, useContext } from "react";

const ViewerPageStateContext = createContext(null);

export const ViewerPageStateProvider = ({ value, children }) => (
  <ViewerPageStateContext.Provider value={value}>
    {children}
  </ViewerPageStateContext.Provider>
);

export const useViewerPageStateContext = () => {
  const ctx = useContext(ViewerPageStateContext);
  return ctx ?? { values: {}, events: {} };
};
