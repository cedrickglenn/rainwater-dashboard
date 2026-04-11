import { logout } from '~/lib/auth.server';

export const action = async ({ request }) => {
  return logout(request);
};

// Fallback for direct GET navigation
export const loader = async ({ request }) => {
  return logout(request);
};
