import React, { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import Loading from '@/components/Loading';
import {
  fetchTermsStatus,
  TermsClientError,
} from '@/lib/terms/client';
import { isExemptFromTermsCheck } from '@/lib/terms/exemptPaths';
import { getSafeReferer } from '@/lib/terms/referer';

interface TermsAcceptanceGuardProps {
  children: ReactNode;
}

const TermsAcceptanceGuard = ({ children }: TermsAcceptanceGuardProps) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifyTermsAcceptance = async () => {
      if (isExemptFromTermsCheck(router.pathname)) {
        if (!cancelled) {
          setIsAllowed(true);
          setIsChecking(false);
        }
        return;
      }

      try {
        const status = await fetchTermsStatus();

        if (cancelled) return;

        if (status.hasAcceptedLatestTerms) {
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }

        await router.replace({
          pathname: '/TermsAcceptance',
          query: { referer: getSafeReferer(router.asPath) },
        });
      } catch (error) {
        if (cancelled) return;

        if (error instanceof TermsClientError && error.status === 401) {
          setIsAllowed(true);
          setIsChecking(false);
          return;
        }

        await router.replace({
          pathname: '/TermsAcceptance',
          query: { referer: getSafeReferer(router.asPath) },
        });
      }
    };

    void verifyTermsAcceptance();

    return () => {
      cancelled = true;
    };
  }, [router, router.asPath, router.pathname]);

  if (isChecking || !isAllowed) {
    return <Loading />;
  }

  return children;
};

export default TermsAcceptanceGuard;
