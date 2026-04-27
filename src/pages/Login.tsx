import React from 'react';
import {
  LoginPanel,
  LoginConfig,
  LoginPageGetServerSideProps as getServerSideProps,
} from '@gen3/frontend';
import { Anchor, Button, Stack, Text } from '@mantine/core';
import PageTitle from '@/components/PageTitle';

interface LoginBottomContentItem {
  type?: string;
  text?: string;
  email?: string;
  className?: string;
}

export const LoginPage = ({ loginConfig }: { loginConfig: LoginConfig }) => {
  const { bottomContent, accessRequestUrl, ...loginPanelConfig } = loginConfig as LoginConfig & {
    bottomContent?: unknown;
    accessRequestUrl?: string;
  };
  const safeBottomContent: LoginBottomContentItem[] = Array.isArray(bottomContent)
    ? bottomContent
    : [];
  const resolvedAccessRequestUrl =
    accessRequestUrl ?? process.env.NEXT_PUBLIC_ACCESS_REQUEST_URL;
  if (!resolvedAccessRequestUrl) {
    console.error(
      'Missing access request URL. Set loginConfig.accessRequestUrl or NEXT_PUBLIC_ACCESS_REQUEST_URL.',
    );
  }
  const getBottomContentClassName = (className?: string) =>
    className?.replace(/\bmt-10\b/, 'mt-4') ?? 'mt-4';

  return (
    <>
      <PageTitle pageName="Login Page" />
      <div className="flex flex-col items-center">
        <LoginPanel {...loginPanelConfig} />
        {resolvedAccessRequestUrl ? (
          <Stack mt="md" w={260}>
            <Button
              component="a"
              href={resolvedAccessRequestUrl}
              target="_blank"
              rel="noreferrer"
              variant="outline"
            >
              Apply For Access
            </Button>
          </Stack>
        ) : null}
        {safeBottomContent.map((item, index) =>
          item.type === 'textWithEmail' ? (
            <Text
              key={`${item.email ?? 'bottom-content'}-${index}`}
              className={getBottomContentClassName(item.className)}
            >
              {item.text}{' '}
              {item.email ? (
                <Anchor href={`mailto:${item.email}`}>{item.email}</Anchor>
              ) : null}
            </Text>
          ) : item.text ? (
            <Text
              key={`${item.text}-${index}`}
              className={getBottomContentClassName(item.className)}
            >
              {item.text}
            </Text>
          ) : null,
        )}
      </div>
    </>
  );
};

export default LoginPage;

export { getServerSideProps };
