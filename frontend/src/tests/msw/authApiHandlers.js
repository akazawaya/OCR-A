import { http, HttpResponse } from "msw";

import { MOCK_API_BASE_URL } from "./config";
import { defaultMockAuthUser } from "./fixture";

let isAuthenticated = false;
let user = structuredClone(defaultMockAuthUser);
let receivedLoginRequestBody = null;
let receivedCreateUserRequestBody = null;
let receivedPasswordChangeRequestBody = null;

export const resetMockUser = () => {
  isAuthenticated = false;
  user = structuredClone(defaultMockAuthUser);
  receivedLoginRequestBody = null;
  receivedCreateUserRequestBody = null;
  receivedPasswordChangeRequestBody = null;
};
export const loginMockUser = () => {
  isAuthenticated = true;
};
export const getReceivedLoginRequestBody = () => {
  return receivedLoginRequestBody;
};
export const getReceivedCreateUserRequestBody = () => {
  return receivedCreateUserRequestBody;
};
export const getReceivedPasswordChangeRequestBody = () => {
  return receivedPasswordChangeRequestBody;
};
export const authApiHandlers = [
  http.get(`${MOCK_API_BASE_URL}/auth/me/`, () => {
    return HttpResponse.json({
      authenticated: isAuthenticated,
      email: isAuthenticated ? user.email : null,
    });
  }),

  http.post(`${MOCK_API_BASE_URL}/users/`, async ({ request }) => {
    const body = await request.json();
    receivedCreateUserRequestBody = structuredClone(body);

    // email重複のバリデーションチェックのテストはここでは行わない。backendで担う。
    if (body.type === "registered") {
      user = {
        id: defaultMockAuthUser.id,
        email: body.email,
        password: body.password,
      };
    } else if (body.type === "guest") {
      user = structuredClone(defaultMockAuthUser);
    } else {
      throw new Error(`Unexpected user type: ${body.type}`);
    }

    isAuthenticated = true;

    return HttpResponse.json(
      {
        id: user.id,
        email: user.email,
      },
      { status: 201 },
    );
  }),

  http.post(`${MOCK_API_BASE_URL}/auth/login/`, async ({ request }) => {
    const body = await request.json();
    receivedLoginRequestBody = structuredClone(body);
    if (
      user !== null &&
      body.email === user.email &&
      body.password === user.password
    ) {
      isAuthenticated = true;
      return HttpResponse.json(
        {
          user: {
            id: user.id,
            email: user.email,
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

  http.post(`${MOCK_API_BASE_URL}/users/me/password/`, async ({ request }) => {
    const body = await request.json();
    receivedPasswordChangeRequestBody = structuredClone(body);

    if (body.current_password !== user.password) {
      return HttpResponse.json(
        { current_password: ["現在のパスワードが一致しません。"] },
        { status: 400 },
      );
    }

    user = { ...user, password: body.new_password };
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${MOCK_API_BASE_URL}/users/me/`, () => {
    user = null;
    isAuthenticated = false;
    return new HttpResponse(null, { status: 204 });
  }),
];
