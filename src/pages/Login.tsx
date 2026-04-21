import React from 'react';
import {
  LoginPanel,
  LoginConfig,
  LoginPageGetServerSideProps as getServerSideProps,
} from '@gen3/frontend';
import { Anchor, Button, Stack, Text } from '@mantine/core';
import PageTitle from '@/components/PageTitle';

export const LoginPage = ({ loginConfig }: { loginConfig: LoginConfig }) => {
  const { bottomContent, ...loginPanelConfig } = loginConfig as LoginConfig & {
    bottomContent?: Array<{
      type?: string;
      text?: string;
      email?: string;
      className?: string;
    }>;
  };

  return (
    <>
      <PageTitle pageName="Login Page" />
      <div className="flex flex-col items-center">
        <LoginPanel {...loginPanelConfig} />
        <Stack mt="md" w={260}>
          <Button
            component="a"
            href="https://mmrf.formstack.com/forms/mmrf_virtual_lab_access_request"
            target="_blank"
            rel="noreferrer"
            variant="outline"
          >
            Apply For Access
          </Button>
        </Stack>
        {bottomContent?.map((item, index) =>
          item.type === 'textWithEmail' ? (
            <Text
              key={`${item.email ?? 'bottom-content'}-${index}`}
              className={item.className}
            >
              {item.text}{' '}
              {item.email ? (
                <Anchor href={`mailto:${item.email}`}>{item.email}</Anchor>
              ) : null}
            </Text>
          ) : item.text ? (
            <Text
              key={`${item.text}-${index}`}
              className={item.className}
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
