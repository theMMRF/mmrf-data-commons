# Google Analytics identity and user counts

The Google tag is included by `src/pages/_app.tsx` only when cookie consent
is accepted, `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured, and authentication
has resolved to a signed-in account with a valid numeric account ID. Public
landing-page visitors and other signed-out users are not tracked, even if they
accept cookies. This avoids collecting traffic that does not represent account
usage.

## Account User-ID

`GoogleAnalyticsLoader` reads the same Gen3 authentication state used by the
site's SessionProvider. It waits for the initial authentication lookup, then
sets the reserved GA `user_id` configuration before initializing the tag. An
authenticated account uses `fence-<numeric account ID>` from Fence's `user_id`
(or `id` for profiles using that field). This value is stable across sessions,
browsers, and devices for the same Fence account. Only positive safe integers
are accepted; email, username, token subject, and other profile fields are never
used as fallback identifiers. A profile without a valid ID is not tracked.

Login and account changes update the ID with `gtag('set', ...)`. Logout,
invalid account IDs, unresolved authentication (including background refreshes),
and withdrawn consent disable collection using Google's
`ga-disable-<measurement ID>` flag and clear the ID with JavaScript `null`.
Removing the Script component alone does not stop a previously loaded tag.
Collection resumes only after authentication and a valid account ID are available
and consent is still accepted. These transitions do not generate additional
configuration page views. Initialization runs once per document, including under
React StrictMode. The existing Google tag page-view behavior is retained; this
change does not add manual route events.

This is **pseudonymous**, not fully anonymous, data. No name, email, password, or
access token is sent by this User-ID implementation. The numeric ID can be
mapped back to an account by someone with access to the Fence user database.
Google Analytics User Explorer can expose this identifier and its activity;
BigQuery exports also include `user_id`. This does not make login details
available in Analytics. Ordinary Analytics collection (such as page URLs) is
separate from this identifier; avoid putting personal information in URLs.

## GA4 configuration after deployment

1. Open the existing GA4 property (with Editor permissions or above).
2. Go to **Admin → Data display → Reporting identity**.
3. Select **Observed** and save. It uses User-ID first, then device ID. **Blended**
   also supports User-ID but may include modeled data. **Device based** ignores
   User-ID for reporting.
4. Use a date range after deployment when reviewing signed-in account usage.
   A **Signed in with user ID = Yes** comparison can separate identified users
   from historical anonymous traffic; it is not needed to stop collection of
   signed-out traffic because the application now prevents it.
5. Do **not** register `user_id` as a custom dimension or user property. GA4 has
   built-in handling for this reserved configuration field.
6. Ensure the privacy notice describes using persistent account identifiers for
   analytics and connecting activity across devices.

No new GA property, measurement ID, or application secret is needed. Merge and
deploy the PR before validating the new data; opening the PR alone changes no
production tracking. Reports remain measures of consenting, tracked activity,
not a count of provisioned or authorized accounts. Multiple accounts for one
person remain separate, and blockers or declined consent can omit users.
Previously collected data without User-ID is not retroactively reassigned.

## Deployment validation

Use browser DevTools Network with consent accepted:

- On a fresh signed-out visit, confirm that neither the Google tag script nor
  Google Analytics collection requests (`g/collect`) load, including on `/Login`.
- After signing in, the first page view should send `uid=fence-<ID>`; signing in
  with the same account in another browser should send the same value.
- After logout or session expiry, confirm that no new collection requests are
  sent, including during subsequent navigation. The account ID should be cleared
  and `window['ga-disable-<measurement ID>']` should be `true`. A request already
  sent before logout cannot be recalled.
- Repeat with missing/invalid account IDs, unresolved authentication, and revoked
  cookie consent: collection must remain disabled. Sign back in with a valid
  account and accepted consent to confirm collection resumes with the correct ID.
- Switching accounts must use the new ID. Confirm the identifier contains no
  email, name, or token. Use GA DebugView with Google Tag Assistant if needed;
  normal reports need processing time.

References:

- [Google: Send user IDs](https://developers.google.com/analytics/devguides/collection/ga4/user-id)
- [Google: Measure activity across platforms with User-ID](https://support.google.com/analytics/answer/9213390)
- [Google: Reporting identity](https://support.google.com/analytics/answer/10976610)
- [Google: Disable Analytics collection](https://developers.google.com/tag-platform/security/guides/privacy#turn_off_google_analytics)
