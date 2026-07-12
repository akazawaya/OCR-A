import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockAuthUser, defaultMockGuestUser } from "./fixture";

let isAuthenticated = false;
let user = structuredClone(defaultMockAuthUser);
let receivedLoginRequestBody = null;
let createdUsers = [];

export const resetMockUser = () => {
  isAuthenticated = false;
  user = structuredClone(defaultMockAuthUser);
  receivedLoginRequestBody = null;
  createdUsers = [];
};
export const loginMockUser = () => {
  isAuthenticated = true;
};
export const getReceivedLoginRequestBody = () => {
  return receivedLoginRequestBody;
};
export const getCreatedUsers = () => {
  return createdUsers;
};
export const authApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/auth/me/`, () => {
    return HttpResponse.json({
      authenticated: isAuthenticated,
      username: isAuthenticated ? user.username : null,
    });
  }),

  http.post(`${MOCK_API_BASE_URL}/users/`, async () => {
    user = structuredClone(defaultMockGuestUser);
    createdUsers = [...createdUsers, structuredClone(user)];
    isAuthenticated = true;

    return HttpResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
        },
      },
      { status: 201 },
    );
  }),

  http.post(`${MOCK_API_BASE_URL}/auth/login/`, async ({ request }) => {
    const body = await request.json();
    receivedLoginRequestBody = structuredClone(body);
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
