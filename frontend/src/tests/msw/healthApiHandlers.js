import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";

let isSystemHealthy = true;

export const resetMockSystemHealth = () => {
  isSystemHealthy = true;
};

export const setMockSystemHealth = (isHealthy) => {
  isSystemHealthy = isHealthy;
};

export const healthApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/health/`, () => {
    if (!isSystemHealthy) {
      return HttpResponse.json(
        { redis: "unavailable", status: "error" },
        { status: 503 },
      );
    }

    return HttpResponse.json({ status: "ok" });
  }),
];
