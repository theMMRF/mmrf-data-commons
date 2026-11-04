import React, { useEffect, useState } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useFetchUserDetailsQuery } from '@gen3/core';
import maintenanceConfig from '../../config/gen3/maintenance.json';

export interface MaintenanceConfig {
  enabled: boolean;
  id: string;
  title: string;
  message: string;
  buttonLabel: string;
  startsAt: string;
  endsAt: string;
}

export const isMaintenanceActive = (config: MaintenanceConfig, now: number) => {
  const start = Date.parse(config.startsAt);
  const end = Date.parse(config.endsAt);
  // Require a bounded window so a temporary notice cannot remain enabled forever.
  return config.enabled && start < end && now >= start && now < end;
};

export const MaintenanceNoticeView = ({
  config = maintenanceConfig,
  loginStatus,
  blocked = false,
}: {
  config?: MaintenanceConfig;
  loginStatus?: string;
  blocked?: boolean;
}) => {
  const key = `vlab:maintenance:${config.id}`;
  const [dismissedKey, setDismissedKey] = useState<string>();
  const [readyKey, setReadyKey] = useState<string>();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (loginStatus === 'unauthenticated') setDismissedKey(undefined);
    try {
      if (loginStatus === 'unauthenticated') {
        window.sessionStorage.removeItem(key);
        setDismissedKey(undefined);
      } else if (window.sessionStorage.getItem(key) === 'dismissed') {
        setDismissedKey(key);
      }
    } catch {
      // In-memory dismissal still works when browser storage is unavailable.
    }
    setReadyKey(key);
  }, [key, loginStatus]);

  useEffect(() => {
    if (!config.enabled) return;
    let timer: number;
    const update = () => {
      window.clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      const boundary = [Date.parse(config.startsAt), Date.parse(config.endsAt)]
        .filter((time) => time > current)
        .sort((a, b) => a - b)[0];
      timer = window.setTimeout(
        update,
        Math.min(60_000, boundary ? boundary - current : 60_000),
      );
    };
    update();
    window.addEventListener('focus', update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', update);
    };
  }, [config.enabled, config.startsAt, config.endsAt]);

  const dismiss = () => {
    setDismissedKey(key);
    try {
      window.sessionStorage.setItem(key, 'dismissed');
    } catch {
      // Storage is optional; do not prevent the user from closing the notice.
    }
  };

  return (
    <Modal
      opened={
        readyKey === key &&
        loginStatus === 'authenticated' &&
        !blocked &&
        dismissedKey !== key &&
        isMaintenanceActive(config, now)
      }
      onClose={dismiss}
      title={config.title}
      centered
      closeOnClickOutside={false}
      closeButtonProps={{ 'aria-label': 'Close maintenance notice' }}
      radius="md"
      padding="lg"
      size="lg"
    >
      <Stack gap="lg">
        <Text>{config.message}</Text>
        <Group justify="flex-end">
          <Button color="primary" onClick={dismiss}>
            {config.buttonLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default function MaintenanceNotice({
  blocked = false,
}: {
  blocked?: boolean;
}) {
  const login = useFetchUserDetailsQuery();
  // Ignore loading and request errors: only a confirmed logout clears dismissal.
  const loginStatus = login.isSuccess ? login.data?.loginStatus : undefined;
  return <MaintenanceNoticeView loginStatus={loginStatus} blocked={blocked} />;
}
