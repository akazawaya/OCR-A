import { createContext, useContext } from "react";

const ViewerWordStateContext = createContext(null);

export const ViewerWordStateProvider = ({ value, children }) => (
  <ViewerWordStateContext.Provider value={value}>
    {children}
  </ViewerWordStateContext.Provider>
);

export const useViewerWordStateContext = () => {
  const ctx = useContext(ViewerWordStateContext);
  return (
    ctx ?? {
      values: { pageMetaById: new Map(), wordsByPageId: new Map() },
      events: {},
    }
  );
};
