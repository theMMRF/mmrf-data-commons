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
import { getLoginStatus } from '@/lib/auth/getLoginStatus';
import { activeTermsConfig, type TermsConfig } from '@/lib/terms/config';
import { acceptActiveTerms } from '@/lib/terms/client';
import { getTermsStatusFromCookie } from '@/lib/terms/placeholderTermsService';

interface TermsAcceptancePageProps {
  termsConfig: TermsConfig;
}

const getSafeReferer = (referer: unknown): string => {
  if (typeof referer !== 'string') return '/';
  if (!referer.startsWith('/') || referer.startsWith('//')) return '/';
  if (referer.startsWith('/Login') || referer.startsWith('/TermsAcceptance')) {
    return '/';
  }

  return referer;
};

const TermsAcceptancePage = ({ termsConfig }: TermsAcceptancePageProps) => {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referer = useMemo(
    () => getSafeReferer(router.query.referer),
    [router.query.referer],
  );

  const handleAccept = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await acceptActiveTerms();
      await router.replace(referer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to record terms acceptance',
      );
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle pageName="Terms Acceptance" />
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" radius="md" p="xl">
          <Stack gap="lg">
            <Stack gap="xs">
              <Title order={1}>{termsConfig.title}</Title>
              <Text c="dimmed" size="sm">
                Effective {termsConfig.effectiveDate}
              </Text>
            </Stack>

            <Text>{termsConfig.summary}</Text>

            <Button
              component="a"
              href={termsConfig.termsUrl}
              rel="noopener noreferrer"
              target="_blank"
              variant="default"
            >
              Review terms and conditions
            </Button>

            <Checkbox
              checked={accepted}
              label={termsConfig.acceptanceText}
              onChange={(event) => setAccepted(event.currentTarget.checked)}
            />

            {error && (
              <Alert color="red" title="Acceptance failed">
                {error}
              </Alert>
            )}

            <Group justify="flex-end">
              <Button
                disabled={!accepted}
                loading={isSubmitting}
                onClick={handleAccept}
              >
                Continue to platform
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

  const termsStatus = getTermsStatusFromCookie(req.headers.cookie);

  if (termsStatus.accepted) {
    return {
      redirect: {
        destination: getSafeReferer(query.referer),
        permanent: false,
      },
    };
  }

  return {
    props: {
      termsConfig: activeTermsConfig,
    },
  };
};

export default TermsAcceptancePage;
