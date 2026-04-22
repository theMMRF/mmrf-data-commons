import React, { useRef, FC } from "react";
import { useDeepCompareEffect } from "use-deep-compare";
import { bindProteinPaint } from "@sjcrh/proteinpaint-client";
import { useIsDemoApp } from "@/hooks/useIsDemoApp";
import {
  useCoreSelector,
  FilterSet,
  //PROTEINPAINT_API,
  useFetchUserDetailsQuery,
  convertFilterSetToGqlFilter as buildCohortGqlOperator
} from "@gen3/core";
import { isEqual, cloneDeep } from "lodash";
import { DemoText } from "@/components/tailwindComponents";
import { selectCurrentCohortCaseFilters } from "@/core/utils";
import { COHORT_FILTER_INDEX, PROTEINPAINT_API } from '@/core';

const basepath = PROTEINPAINT_API;

interface PpProps {
  basepath?: string;
}

export const DEwrapper: FC<PpProps> = (props: PpProps) => {
  const isDemoMode = useIsDemoApp();
  const currentCohort = useCoreSelector((state) =>
    selectCurrentCohortCaseFilters(state, COHORT_FILTER_INDEX),
  );
  const filter0 = isDemoMode ? null : buildCohortGqlOperator(currentCohort);
  const userDetails = useFetchUserDetailsQuery()

  // to track reusable instance for mds3 skewer track
  const prevArg = useRef<any>({});
  const divRef = useRef<HTMLDivElement>(null);

  useDeepCompareEffect(
    () => {
      const rootElem = divRef.current;
      const data = getDEtrack(props, filter0);
      if (!data) return;
      /*if (isDemoMode) {
        data.geneSymbol = props.hardcodeCnvOnly
          ? "chr8:127682515-127792250"
          : "MYC";
      }*/

      // compare the argument to runpp to avoid unnecessary render
      if ((data || prevArg.current) && isEqual(prevArg.current, data)) return;
      prevArg.current = data

      const toolContainer = rootElem?.parentNode?.parentNode?.parentNode as HTMLElement;
      if (!toolContainer) return
      toolContainer.style.backgroundColor = "#fff";

      const arg = Object.assign(
        { holder: rootElem, noheader: true, nobox: true },
        cloneDeep(data),
      ) as Mds3Arg;

      // bindProteinPaint() handles rapid update requests/race condition,
      // so no need to include debouncing and promise code in this wrapper
      // TODO: will revert to using runproteinpaint() once these advanced capabilities
      // are merged into it
      bindProteinPaint({
        rootElem,
        initArgs: arg,
        updateArgs: arg,
        isStale() {
          // new data has replaced this one, will prevent unnecessary render
          // in case of race condition
          return prevArg.current != data;
        },
      });
    },

    [ isDemoMode, filter0, userDetails.currentData ],
  );
  return (
    <div>
      {isDemoMode && <DemoText>Showing cases in demo cohort.</DemoText>}
      <div ref={divRef} className="sjpp-wrapper-root-div" />
    </div>
  );
};

interface Mds3Arg {
  dslabel?: string;
  holder?: HTMLElement;
  noheader?: boolean;
  nobox?: boolean;
  hide_dsHandles?: boolean;
  host: string;
  filter0?: FilterSet;
  launchGdcDE?: boolean;
}

function getDEtrack(
  props: PpProps,
  filter0: any
) {
  const arg: Mds3Arg = {
    dslabel: 'MMRF',
    // host in gdc is just a relative url path,
    // using the same domain as the GDC portal where PP is embedded
    host: props.basepath || (basepath as string),
    launchGdcDE: true,
    filter0,
  };

  return arg;
}
