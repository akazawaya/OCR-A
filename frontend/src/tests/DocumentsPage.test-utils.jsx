/* eslint-disable react-refresh/only-export-components */

import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import DocumentsPage from "../pages/DocumentsPage";

export const defaultMockDocuments = [
  {
    id: 1,
    created: "2026-04-01 10:00:00",
    file_name: "alpha-report.pdf",
    state: "done",
  },
  {
    id: 2,
    created: "2026-04-02 10:00:00",
    file_name: "beta-report.pdf",
    state: "queued",
  },
  {
    id: 3,
    created: "2026-04-03 10:00:00",
    file_name: "gamma-alpha.pdf",
    state: "done",
  },
];

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
            path="/documents"
            element={
              <>
                <DocumentsPage />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/documents/:primaryKey/viewer"
            element={<LocationProbe />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};
