import { createContext, useContext } from "react";

const ViewerDragRectStateContext = createContext(null);

export const ViewerDragRectStateProvider = ({ value, children }) => (
  <ViewerDragRectStateContext.Provider value={value}>
    {children}
  </ViewerDragRectStateContext.Provider>
);

export const useViewerDragRectStateContext = () => {
  const ctx = useContext(ViewerDragRectStateContext);
  return ctx ?? { values: {}, events: {} };
};
