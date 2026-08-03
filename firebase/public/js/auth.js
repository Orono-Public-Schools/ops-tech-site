// Auth gate shared by every page except signin.html.
// Requires: signed in, @orono.k12.mn.us domain, AND membership in the
// allowedUsers allowlist (managed on the Admin page; also enforced
// server-side by Firestore rules).
// IMPORTANT: importing this module runs the gate — signin.html must import
// from ./domain.js instead.

import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { setFooterEmail } from './layout.js';
import { isAllowedUser } from './domain.js';

export { ALLOWED_DOMAIN, isAllowedUser } from './domain.js';

const onSigninPage = /(^|\/)signin(\.html)?$/.test(location.pathname);

function denied() {
  signOut(auth).finally(() => location.replace('signin.html?denied=1'));
}

let resolvePerms;
// Resolves with the user's permission map ({homePages, links, documentation,
// images, communications, status, admin} -> bool). Set on the Admin page;
// security rules enforce the same map server-side.
export const permsReady = new Promise((resolve) => { resolvePerms = resolve; });

// Shows the page's edit UI (body.can-edit — see site.css) if the signed-in
// user has the given capability.
export async function gateEditing(permKey) {
  const perms = await permsReady;
  if (perms[permKey]) {
    document.body.classList.add('can-edit');
  }
  return !!perms[permKey];
}

// Whole-page gate (compose, admin): bounce to Home without the capability.
export async function requirePerm(permKey) {
  const perms = await permsReady;
  if (!perms[permKey]) {
    location.replace('index.html');
    return new Promise(() => {}); // page is navigating away
  }
  return perms;
}

// Resolves with the signed-in, domain-checked, allowlisted user. If the
// visitor fails any check, the page navigates away and the promise never
// resolves.
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if (onSigninPage) return; // never gate the sign-in page itself

    if (!user) {
      const next = encodeURIComponent(location.pathname + location.search);
      location.replace('signin.html?next=' + next);
      return;
    }
    if (!isAllowedUser(user)) {
      denied();
      return;
    }
    // Resolve immediately so page data loads in parallel; the allowlist
    // lookup runs alongside it. Security rules enforce the allowlist on
    // every read/write regardless — this check only handles the UX
    // (bounce non-allowlisted users to the denied screen).
    setFooterEmail(user.email);
    resolve(user);
    getDoc(doc(db, 'allowedUsers', user.email.toLowerCase()))
      .then(entry => {
        if (!entry.exists()) {
          denied();
          return;
        }
        resolvePerms(entry.get('perms') || {});
      })
      .catch(err => {
        console.error('Allowlist check failed:', err);
        denied();
      });
  });
});
