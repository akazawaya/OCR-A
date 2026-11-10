// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import SystemAvailabilityLayout from "../components/System/SystemAvailabilityLayout";
import { routePaths } from "../appConfig";

import { getLogoutRequestCount } from "./msw/authApiHandlers";
import { setMockSystemHealth } from "./msw/healthApiHandlers";

const HEALTH_CHECK_INTERVAL_MS = 3_000;
const REQUIRED_FAILURE_COUNT = 2;
const REQUIRED_RECOVERY_COUNT = 2;

const renderBoundary = (initialPath = routePaths.docs.to()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const router = createMemoryRouter(
    [
      {
        element: <SystemAvailabilityLayout />,
        children: [
          {
            path: routePaths.docs.template,
            element: <div>文書一覧</div>,
          },
          {
            path: routePaths.login.template,
            element: <div>ログイン</div>,
          },
          {
            path: routePaths.systemUnavailable.template,
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { queryClient, router };
};

const advanceHealthCheckIntervals = async (count = 1) => {
  for (let checkCount = 0; checkCount < count; checkCount += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HEALTH_CHECK_INTERVAL_MS);
    });
  }
};

describe("SystemAvailabilityLayout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("health異常が規定回数連続した場合に全画面を停止してログアウトする", async () => {
    const { queryClient, router } = renderBoundary();

    await vi.waitFor(() => {
      expect(screen.getByText("文書一覧")).toBeInTheDocument();
    });
    queryClient.setQueryData(["private-data"], { document: 1 });
    setMockSystemHealth(false);

    await advanceHealthCheckIntervals(REQUIRED_FAILURE_COUNT - 1);
    expect(screen.getByText("文書一覧")).toBeInTheDocument();

    await advanceHealthCheckIntervals();
    await vi.waitFor(() => {
      expect(
        screen.getByText("現在サービスを利用できません"),
      ).toBeInTheDocument();
    });
    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe(
        routePaths.systemUnavailable.to(),
      );
      expect(getLogoutRequestCount()).toBe(1);
    });
    expect(queryClient.getQueryData(["private-data"])).toBeUndefined();
    expect(screen.queryByText("文書一覧")).not.toBeInTheDocument();
  });

  test("復旧を規定回数連続で確認しログアウト済みならLoginPageへ戻る", async () => {
    const { router } = renderBoundary();

    await vi.waitFor(() => {
      expect(screen.getByText("文書一覧")).toBeInTheDocument();
    });
    setMockSystemHealth(false);
    await advanceHealthCheckIntervals(REQUIRED_FAILURE_COUNT);
    await vi.waitFor(() => {
      expect(
        screen.getByText("現在サービスを利用できません"),
      ).toBeInTheDocument();
    });

    setMockSystemHealth(true);
    await advanceHealthCheckIntervals(REQUIRED_RECOVERY_COUNT - 1);
    expect(screen.queryByText("ログイン")).not.toBeInTheDocument();

    await advanceHealthCheckIntervals();
    await vi.waitFor(() => {
      expect(screen.getByText("ログイン")).toBeInTheDocument();
    });
    expect(router.state.location.pathname).toBe(routePaths.login.to());
  });

  test("障害中に別画面へ移動しても障害画面へ戻す", async () => {
    const { router } = renderBoundary();

    await vi.waitFor(() => {
      expect(screen.getByText("文書一覧")).toBeInTheDocument();
    });
    setMockSystemHealth(false);
    await advanceHealthCheckIntervals(REQUIRED_FAILURE_COUNT);
    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe(
        routePaths.systemUnavailable.to(),
      );
    });

    await act(async () => {
      await router.navigate(routePaths.docs.to());
    });

    await vi.waitFor(() => {
      expect(router.state.location.pathname).toBe(
        routePaths.systemUnavailable.to(),
      );
      expect(
        screen.getByText("現在サービスを利用できません"),
      ).toBeInTheDocument();
    });
  });
});
