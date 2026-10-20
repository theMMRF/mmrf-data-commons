import {
  ContentSource,
  Custom404Page,
  getNavPageLayoutPropsFromConfig,
} from '@gen3/frontend';
import { GEN3_COMMONS_NAME } from '@gen3/core';

// Next's 404 page is static; it still needs the layout props expected by Gen3.
export const getStaticProps = async () => ({
  props: {
    ...(await getNavPageLayoutPropsFromConfig()),
    config404: await ContentSource.getContentDatabase().get(
      `${GEN3_COMMONS_NAME}/404.json`,
    ),
  },
});

export default Custom404Page;
