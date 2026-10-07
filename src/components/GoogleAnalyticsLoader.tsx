import React, { useEffect, JSX } from 'react';
import Script from 'next/script';
import {
  selectUserAuthStatus,
  selectUserDetails,
  useCoreSelector,
} from '@gen3/core';

type GtagCommand =
  | ['js', Date]
  | ['config', string]
  | ['set', { user_id: string | null }];

export const GA_PLACEHOLDER_LOG_MESSAGE =
  'GA placeholder: consent accepted, analytics would initialize here';

declare global {
  interface Window {
    __mmrfGaPlaceholderLogged?: boolean;
    __mmrfGaMeasurementId?: string;
    __mmrfGaUserId?: string | null;
    dataLayer?: unknown[];
    gtag?: (...args: GtagCommand) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

interface GoogleAnalyticsLoaderProps {
  enabled: boolean;
  gaMeasurementId?: string;
}

const GoogleAnalyticsLoader = ({
  enabled,
  gaMeasurementId,
}: GoogleAnalyticsLoaderProps): JSX.Element | null => {
  const measurementId = gaMeasurementId?.trim();
  const loginStatus = useCoreSelector(selectUserAuthStatus);
  const user = useCoreSelector(selectUserDetails);
  const identityPending =
    loginStatus === 'pending' || loginStatus === 'not present';
  // Fence account IDs are stable across devices. Never fall back to an email,
  // username, token subject, or other potentially identifying profile field.
  const accountId = user.user_id ?? user.id;
  const userId =
    loginStatus === 'authenticated' &&
    typeof accountId === 'number' &&
    Number.isSafeInteger(accountId) &&
    accountId > 0
      ? `fence-${accountId}`
      : null;

  useEffect(() => {
    if (!measurementId) return;

    if (!enabled) {
      // Unmounting a Script does not stop a Google tag that has already loaded.
      window[`ga-disable-${measurementId}`] = true;
      if (window.__mmrfGaUserId) {
        window.gtag?.('set', { user_id: null });
        window.__mmrfGaUserId = null;
      }
      return;
    }

    // Wait for the existing SessionProvider to resolve the initial identity so
    // the first page view for a signed-in visitor already has their User-ID.
    // A background session refresh should not temporarily remove a known ID.
    if (identityPending) return;

    window[`ga-disable-${measurementId}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        // Match Google's gtag command queue format (an arguments object).
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };

    if (window.__mmrfGaMeasurementId !== measurementId) {
      window.gtag('js', new Date());
      if (userId || window.__mmrfGaUserId) {
        window.gtag('set', { user_id: userId });
      }
      window.__mmrfGaUserId = userId;
      window.gtag('config', measurementId);
      window.__mmrfGaMeasurementId = measurementId;
    } else if (window.__mmrfGaUserId !== userId) {
      // 'set' updates future events without generating another config page view.
      window.gtag('set', { user_id: userId });
      window.__mmrfGaUserId = userId;
    }
  }, [enabled, measurementId, identityPending, userId]);

  useEffect(() => {
    if (!enabled || measurementId) return;
    if (typeof window === 'undefined' || window.__mmrfGaPlaceholderLogged)
      return;

    console.log(GA_PLACEHOLDER_LOG_MESSAGE);
    window.__mmrfGaPlaceholderLogged = true;
  }, [enabled, measurementId]);

  if (!enabled || !measurementId || identityPending) return null;

  return (
    <Script
      id="google-analytics-script"
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
    />
  );
};

export default GoogleAnalyticsLoader;
