import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { expect, userEvent, within } from 'storybook/test';
import type { AnalysisToolConfiguration } from '@gen3/frontend';
import WhatsNew from './WhatsNew';
import AnalysisToolSections from '../AnalysisToolSections';
import { RELEASES } from './releases';
import {
  LAST_SEEN_STORAGE_KEY,
  SESSION_STORAGE_KEY,
} from './useUnseenReleaseIds';
import config from '../../../../config/gen3/analysisTools.json';

const sections = config.sections.map((section) => ({
  ...section,
  tools: section.tools.map((tool) => ({ ...tool, href: '/' })),
}));
const tools = sections.flatMap(
  (section) => section.tools,
) as AnalysisToolConfiguration[];

const meta = {
  component: WhatsNew,
  title: 'components/analysis/WhatsNew',
  args: { tools },
  beforeEach: () => {
    window.localStorage.removeItem(LAST_SEEN_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },
  decorators: [
    (Story) => (
      <div style={{ width: 284 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WhatsNew>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [newest] = RELEASES;
    expect(
      await canvas.findByRole('heading', { level: 3, name: newest.title }),
    ).toBeVisible();
    expect(await canvas.findByText('New')).toBeVisible();
    expect(canvas.getAllByText('New')).toHaveLength(1);

    const toolLink = canvas.getAllByRole('link', {
      name: 'Open Differential Gene Expression',
    })[0];
    expect(toolLink).toHaveAttribute('href', '/?app=DE');

    const oldest = RELEASES[RELEASES.length - 1];
    expect(
      canvas.queryByRole('heading', { level: 3, name: oldest.title }),
    ).toBeNull();

    const toggle = canvas.getByRole('button', {
      name: `Show ${RELEASES.length - 2} earlier updates`,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent('Show fewer updates');
    expect(
      canvas.getByRole('heading', { level: 3, name: oldest.title }),
    ).toBeVisible();

    expect(window.localStorage.getItem(LAST_SEEN_STORAGE_KEY)).toBe(
      newest.date,
    );
  },
};

export const HiddenToolsAreNotLinked: Story = {
  args: { tools: tools.filter((tool) => tool.appId !== 'DE') },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      (await canvas.findAllByRole('link', { name: 'Open ProteinPaint' }))
        .length,
    ).toBeGreaterThan(0);
    expect(
      canvas.queryByRole('link', { name: 'Open Differential Gene Expression' }),
    ).toBeNull();
  },
};

export const InAnalysisCenter: Story = {
  decorators: [
    () => (
      <div style={{ width: 1400 }} className="flex items-start gap-4 px-4">
        <div className="min-w-0 flex-1">
          <AnalysisToolSections sections={sections} />
        </div>
        <div className="w-[284px] shrink-0">
          <WhatsNew tools={tools} />
        </div>
      </div>
    ),
  ],
};
