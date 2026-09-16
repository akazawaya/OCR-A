/* eslint-disable react-refresh/only-export-components */

import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "sonner";

import DocumentsPage from "../pages/DocumentsPage";

const LocationProbe = () => {
  const location = useLocation();

  return (
    <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>
  );
};

export const renderDocumentsPage = ({ initialEntry = "/documents" } = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            element={
              <>
                <DocumentsPage />
                <LocationProbe />
              </>
            }
            path="/documents"
          />
          <Route
            element={<LocationProbe />}
            path="/documents/:primaryKey/viewer"
          />
        </Routes>
      </MemoryRouter>
      <Toaster />
    </QueryClientProvider>,
  );
};
