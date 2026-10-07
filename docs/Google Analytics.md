# Google Analytics identity and user counts

The Google tag is included globally by `src/pages/_app.tsx` after cookie consent
is accepted and `NEXT_PUBLIC_GA_MEASUREMENT_ID` is configured. It also tracks
visitors to the public `/Login` landing page who never sign in. Accepting cookies
does not require an account. Without an account User-ID, different browsers,
devices, or cleared cookies can count as different users. Code inspection confirms
these behaviors; it does not establish how much they contribute to production
counts without examining the GA property.

## Account User-ID

`GoogleAnalyticsLoader` reads the same Gen3 authentication state used by the
site's SessionProvider. It waits for the initial authentication lookup, then
sets the reserved GA `user_id` configuration before initializing the tag. An
authenticated account uses `fence-<numeric account ID>` from Fence's `user_id`
(or `id` for profiles using that field). This value is stable across sessions,
browsers, and devices for the same Fence account. Only positive safe integers
are accepted; email, username, token subject, and other profile fields are never
used as fallback identifiers. A profile without a valid ID is tracked anonymously.

Anonymous visitors still receive ordinary GA device-based tracking. Login and
account changes update the ID with `gtag('set', ...)`; logout clears it with
JavaScript `null`. These updates do not generate additional page views. Background
authentication refreshes keep the last resolved ID until the lookup finishes.
Initialization runs once per document, including under React StrictMode. The
existing Google tag page-view behavior is retained; this change does not add
manual route events. Cookie consent still gates loading and configuration.

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
4. In reports, add a comparison using **Signed in with user ID**, matching **Yes**,
   to examine identified accounts separately from public visitors. Keep the
   unfiltered report when measuring overall traffic. This dimension describes
   users, not an event-by-event authorization audit.
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

Use browser DevTools Network with consent accepted. Inspect Google Analytics
collection requests (`g/collect`): an authenticated account should send
`uid=fence-<ID>` from its first page view, and the same account in another browser
should send the same value. A visitor who never signs in should have no `uid`.
After logout, subsequent requests must have no prior account ID. Switching
accounts must use the new ID. Confirm the new field contains no email, name, or
token. Use GA DebugView with Google Tag Assistant if needed to inspect test
events; normal reports need processing time.

References:

- [Google: Send user IDs](https://developers.google.com/analytics/devguides/collection/ga4/user-id)
- [Google: Measure activity across platforms with User-ID](https://support.google.com/analytics/answer/9213390)
- [Google: Reporting identity](https://support.google.com/analytics/answer/10976610)
