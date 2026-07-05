import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockAuthUser } from "./fixture";

let isAuthenticated = false;
let user = structuredClone(defaultMockAuthUser);

export const resetMockUser = () => {
  isAuthenticated = false;
  user = structuredClone(defaultMockAuthUser);
};
export const loginMockUser = () => {
  isAuthenticated = true;
};
export const authApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/auth/me/`, () => {
    return HttpResponse.json({
      authenticated: isAuthenticated,
      username: isAuthenticated ? user.username : null,
    });
  }),

  http.post(`${MOCK_API_BASE_URL}/auth/login/`, async ({ request }) => {
    const body = await request.json();
    if (body.username === user.username && body.password === user.password) {
      isAuthenticated = true;
      return HttpResponse.json(
        {
          user: {
            id: user.id,
            username: user.username,
          },
        },
        { status: 200 },
      );
    }
    return new HttpResponse(null, { status: 400 });
  }),

  http.post(`${MOCK_API_BASE_URL}/auth/logout/`, () => {
    isAuthenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),
];
