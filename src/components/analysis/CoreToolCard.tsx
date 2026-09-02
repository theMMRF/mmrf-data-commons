import React, { useContext } from "react";
import { Text } from "@mantine/core";
import { PlayIcon } from "src/commonIcons";
import { AppContext } from "./context";
import { AppRegistrationEntry } from "./types";

export interface CoreToolCardProps {
  entry: AppRegistrationEntry;
}

const CoreToolCard: React.FC<CoreToolCardProps> = ({
  entry,
}: CoreToolCardProps) => {
  const { Link } = useContext(AppContext);

  return (
    <Link
      href={{
        pathname: "/analysis_page",
        query: {
          app: entry.id,
        },
      }}
      className="group"
    >
      <div className="grid grid-cols-12 border-secondary-darkest border h-full w-full rounded-md">
        <div className="col-span-2 self-center p-2">
          {entry.icon}
        </div>
        <div className="col-span-8 text-base-content-darkest p-2">
          <Text size="sm" className="font-heading font-bold">
            {entry.name}
          </Text>
          <Text size="xs" className="font-content leading-5">
            {entry.description}
          </Text>
        </div>
        <div className="col-span-2 flex justify-end">
          <div className="bg-secondary w-12 h-full p-0 group-hover:bg-secondary-darker group-focus:bg-secondary-darker rounded-none rounded-r flex justify-center items-center">
            <PlayIcon size={30} color="white" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CoreToolCard;
