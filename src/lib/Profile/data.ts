import { GetServerSideProps } from "next";
import { GEN3_COMMONS_NAME } from "@gen3/core";
import {
  ContentSource,
  getNavPageLayoutPropsFromConfig,
  NavPageLayoutProps,
} from "@gen3/frontend";

export const ProfilePageGetServerSideProps: GetServerSideProps<
  NavPageLayoutProps
> = async () => {
  const profileConfig = await ContentSource.getContentDatabase().get(
      `${GEN3_COMMONS_NAME}/profile.json`,
    );

  return {
    props: {
      ...(await getNavPageLayoutPropsFromConfig()),
      ...{ profileConfig: profileConfig },
    },
  };
};
