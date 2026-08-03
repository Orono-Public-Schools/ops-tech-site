// Domain allow-check, side-effect free (safe to import anywhere,
// including signin.html — unlike auth.js, which redirects on load).

export const ALLOWED_DOMAIN = '@orono.k12.mn.us';

export function isAllowedUser(user) {
  return !!(user && user.email && user.email.toLowerCase().endsWith(ALLOWED_DOMAIN));
}
