import React from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { http, HttpResponse } from 'msw';
import { expect, userEvent, within } from 'storybook/test';
import CohortBuilderApp from './CohortBuilder';

// Synthetic values exercise the real Gen3 markup, so framework upgrades that
// break our scoped CSS are visible without access to the development commons.
const positive = 'TP53 mutation and chromosome 17p deletion detected';
const negative = 'TP53 mutation and chromosome 17p deletion not detected';
const histogram = (values: string[]) => ({
  histogram: values.map((key, index) => ({ key, count: 20 - index })),
});

const meta = {
  component: CohortBuilderApp,
  title: 'features/apps/CohortBuilder',
  parameters: {
    layout: 'fullscreen',
    nextjs: { router: { query: { tab: 'cgs_risk' } } },
    msw: {
      handlers: {
        global: [
          http.get('*/_status', () => HttpResponse.json({ message: 'OK' })),
          http.get('*/user/user', () =>
            HttpResponse.json(null, { status: 401 }),
          ),
          http.get('*/user/mapping', () => HttpResponse.json({})),
          http.post('*/guppy/graphql', () =>
            HttpResponse.json({
              data: {
                CaseCentric__aggregation: {
                  case_centric: {
                    _totalCount: 39,
                    project: { project_id: histogram(['MMRF-COMMPASS']) },
                    primary_site: histogram(['Bone marrow']),
                    disease_type: histogram(['Multiple myeloma']),
                    cgs_risk_key_criteria: {
                      cgs_risk_category: histogram([
                        'High risk',
                        'Standard risk',
                      ]),
                      cgs_risk_criteria: histogram([positive]),
                      other_criteria: histogram([positive, negative]),
                    },
                  },
                },
              },
            }),
          ),
        ],
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CohortBuilderApp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CgsRisk: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const checkbox = await canvas.findByRole('checkbox', { name: negative });
    const card = checkbox.closest(
      '[id="cgs_risk_key_criteria.other_criteria"]',
    )!;
    const label = within(card as HTMLElement).getByText(negative);
    const labelContainer = label.parentElement!;
    expect(getComputedStyle(labelContainer).whiteSpace).toBe('normal');
    expect(labelContainer.scrollWidth).toBeLessThanOrEqual(
      labelContainer.clientWidth,
    );
    expect(getComputedStyle(labelContainer.parentElement!).alignItems).toBe(
      'flex-start',
    );

    const grid = canvas.getByTestId('title-cohort-builder-facet-groups');
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ');
    // 26rem minimum, unless the available panel is narrower than one card.
    if (grid.clientWidth >= 416) {
      expect(columns.every((width) => parseFloat(width) >= 416)).toBe(true);
    }
    expect(
      canvas.getByRole('link', { name: /consensus recommendations/i }),
    ).toHaveAttribute('href', 'https://ascopubs.org/doi/10.1200/JCO-24-01893');
  },
};

export const General: Story = {
  parameters: { nextjs: { router: { query: { tab: 'general' } } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('checkbox', { name: 'MMRF-COMMPASS' });
    expect(canvas.queryByRole('complementary')).not.toBeInTheDocument();
    const label = canvas.getByText('Multiple myeloma');
    expect(getComputedStyle(label.parentElement!).whiteSpace).toBe('nowrap');

    // Storybook's router keeps query.tab at 'general': visibility must follow
    // Gen3's selection immediately, even while a route update is pending.
    await userEvent.click(canvas.getByRole('tab', { name: 'CGS Risk' }));
    const reference = canvas.getByRole('complementary');
    expect(reference).toBeVisible();
    expect(getComputedStyle(reference).marginLeft).toBe('12px');
    expect(getComputedStyle(reference).marginRight).toBe('12px');
    await userEvent.click(canvas.getByRole('tab', { name: /^General$/ }));
    expect(reference).not.toBeVisible();
  },
};
