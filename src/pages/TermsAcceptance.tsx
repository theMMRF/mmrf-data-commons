import React, { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import PageTitle from '@/components/PageTitle';
import TermsContent from '@/components/Terms/TermsContent';
import { getLoginStatus } from '@/lib/auth/getLoginStatus';
import { termsUiConfig } from '@/lib/terms/config';
import {
  acceptActiveTerms,
  fetchTermsStatus,
  TermsClientError,
} from '@/lib/terms/client';
import { getTermsGateResult, fetchCurrentTerms } from '@/lib/terms/termsService';
import { getSafeReferer } from '@/lib/terms/referer';
import { resolveUserIdentity } from '@/lib/terms/userEmail';
import type { TermsUiConfig, TermsVersion } from '@/lib/terms/types';

interface TermsAcceptancePageProps {
  currentTerms: TermsVersion;
  uiConfig: TermsUiConfig;
  loadError?: string | null;
  statusCheckFailed?: boolean;
}

const formatEffectiveDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
  }).format(new Date(value));

const TermsAcceptancePage = ({
  currentTerms: initialTerms,
  uiConfig,
  loadError = null,
  statusCheckFailed = false,
}: TermsAcceptancePageProps) => {
  const router = useRouter();
  const [currentTerms, setCurrentTerms] = useState(initialTerms);
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(loadError);

  const referer = useMemo(
    () => getSafeReferer(router.query.referer),
    [router.query.referer],
  );

  const handleAccept = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await acceptActiveTerms(currentTerms.id);
      await router.replace(referer);
    } catch (err) {
      if (err instanceof TermsClientError && err.status === 409) {
        if (err.currentTerms) {
          setCurrentTerms(err.currentTerms);
        } else {
          try {
            const status = await fetchTermsStatus();
            setCurrentTerms(status.currentTerms);
          } catch {
            // Keep existing terms content if refresh fails.
          }
        }

        setAccepted(false);
        setError(
          err.message ||
            'The terms were updated while you were reviewing them. Please review the latest version and accept again.',
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to record terms acceptance',
        );
      }

      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle pageName="Terms and Conditions" />
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="lg">
            <Stack gap="xs">
              <Title order={1}>{uiConfig.title}</Title>
              <Text c="dimmed">{uiConfig.intro}</Text>
              <Text c="dimmed" size="sm">
                Effective {formatEffectiveDate(currentTerms.effectiveAt)}
              </Text>
            </Stack>

            <TermsContent terms={currentTerms} />

            {currentTerms.termsUrl && (
              <Button
                component="a"
                href={currentTerms.termsUrl}
                rel="noopener noreferrer"
                target="_blank"
                variant="default"
              >
                {uiConfig.externalLinkText}
              </Button>
            )}

            <Checkbox
              checked={accepted}
              label={uiConfig.acceptanceText}
              onChange={(event) => setAccepted(event.currentTarget.checked)}
            />

            {error && (
              <Alert
                color="red"
                title={
                  loadError
                    ? 'Unable to continue'
                    : statusCheckFailed
                      ? 'Acceptance status unavailable'
                      : 'Acceptance failed'
                }
              >
                {error}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                disabled={!accepted || !currentTerms.id || Boolean(loadError)}
                loading={isSubmitting}
                onClick={handleAccept}
              >
                {uiConfig.submitButtonText}
              </Button>
            </Group>
          </Stack>
        </Card>
      </Container>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<
  TermsAcceptancePageProps
> = async ({ req, query }) => {
  const loginStatus = await getLoginStatus(req.headers.cookie);

  if (loginStatus.status !== 'issued') {
    return {
      redirect: {
        destination: `/Login?referer=${encodeURIComponent(
          getSafeReferer(query.referer),
        )}`,
        permanent: false,
      },
    };
  }

  const termsGate = await getTermsGateResult(req.headers.cookie);
  const identity = await resolveUserIdentity(req.headers.cookie);

  const identityError = identity.email
    ? null
    : 'Unable to determine your email address for terms acceptance. Please log out and log in again.';

  if (termsGate.hasAcceptedLatestTerms && !termsGate.error) {
    return {
      redirect: {
        destination: getSafeReferer(query.referer),
        permanent: false,
      },
    };
  }

  if (termsGate.currentTerms) {
    return {
      props: {
        currentTerms: termsGate.currentTerms,
        loadError: identityError,
        statusCheckFailed: Boolean(!identityError && termsGate.error),
        uiConfig: termsUiConfig,
      },
    };
  }

  try {
    const currentTerms = await fetchCurrentTerms();

    return {
      props: {
        currentTerms,
        loadError: identityError,
        statusCheckFailed: Boolean(!identityError && termsGate.error),
        uiConfig: termsUiConfig,
      },
    };
  } catch {
    // Fall through to placeholder content below.
  }

  return {
    props: {
      currentTerms: {
        contentFormat: 'plain_text',
        effectiveAt: new Date().toISOString(),
        id: 0,
        termsContent:
          'Unable to load the current terms and conditions. Please try again later or contact support.',
        termsUrl: null,
        version: 'unknown',
      },
      loadError:
        identityError ??
        termsGate.error ??
        'Unable to load the current terms and conditions. Please try again later.',
      statusCheckFailed: false,
      uiConfig: termsUiConfig,
    },
  };
};

export default TermsAcceptancePage;
