import { BadColor, OkColor, PerformanceMark, SubSection, useInfo } from 'interface/guide';
import styled from '@emotion/styled';
import { Highlight } from 'analysis/retail/monk/brewmaster/modules/spells/Shuffle/GuideSection';
import {
  ComponentPropsWithoutRef,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import ExplanationRow from 'interface/guide/components/ExplanationRow';
import Explanation from 'interface/guide/components/Explanation';
import { TooltipElement } from 'interface';
import { BoxRowEntry, PerformanceBoxRow } from 'interface/guide/components/PerformanceBoxRow';

import { SpellUse, useSpellUsageContext } from './core';
import { RoundedPanel } from 'interface/guide/components/GuideDivs';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { formatDuration } from 'common/format';

const NoData = styled.div`
  color: #999;
`;

const SpellUsageDetailsContainer = styled.div`
  display: grid;
  grid-template-rows: max-content max-content max-content max-content 1fr;
`;

const SpellDetailsContainer = styled.div`
  display: grid;
  margin-top: 1rem;
  grid-template-areas: 'talent source';
  grid-template-columns: 10% auto;
  grid-template-rows: 1fr;

  gap: 1rem;
  height: 100%;
  align-items: center;

  ${NoData} {
    justify-self: center;
    align-self: center;
    grid-column: 1 / -1;
  }

  ${RoundedPanel} {
    grid-column: 1 / -1;
  }

  > *:nth-child(odd):not(${RoundedPanel}) {
    justify-self: center;
  }
`;

interface SpellUseDetailsProps {
  performance?: BoxRowEntry;
  spellUse?: SpellUse;
}

/**
 * Displays the details of a given {@link SpellUse}, displaying a fallback if none is provided.
 * If {@link SpellUseDetailsProps#performance} is provided but {@link SpellUseDetailsProps#spellUse}
 * is not, then a message will be displayed describing a potential spell cast.
 */
const SpellUseDetails = ({ performance, spellUse }: SpellUseDetailsProps) => {
  const info = useInfo();
  if (!info) {
    return null;
  }

  if (!spellUse) {
    // Realisitically, this should only happen for missed casts
    if (performance) {
      if (performance.value === QualitativePerformance.Fail) {
        return (
          <SpellDetailsContainer>
            <NoData>This was a potential spell cast that went unused.</NoData>
          </SpellDetailsContainer>
        );
      }
      if (performance.value === QualitativePerformance.Ok) {
        return (
          <SpellDetailsContainer>
            <NoData>
              This was a potential spell cast that went unused, but you might have intentionally
              saved it to handle a mechanic.
            </NoData>
          </SpellDetailsContainer>
        );
      }
      return (
        <SpellDetailsContainer>
          <NoData>
            This was a spell cast performance that was reported without an associated spell cast.
            You should report this on the Discord.
          </NoData>
        </SpellDetailsContainer>
      );
    } else {
      return (
        <SpellDetailsContainer>
          <NoData>Click on a box in the cast breakdown to view details.</NoData>
        </SpellDetailsContainer>
      );
    }
  }

  if (spellUse.checklistItems.length === 0) {
    return (
      <SpellDetailsContainer>
        <NoData>
          There were no checks for this cast. This is either a bug or means this was a good cast.
        </NoData>
      </SpellDetailsContainer>
    );
  }

  return (
    <SpellDetailsContainer>
      <strong>Time</strong>
      <div>{formatDuration(spellUse.event.timestamp - info.fightStart)}</div>
      <strong>Perf.</strong>
      <strong>Explanation</strong>
      {spellUse.checklistItems.map((checklistItem) => (
        <Fragment key={checklistItem.check}>
          <PerformanceMark perf={checklistItem.performance} />
          {checklistItem.details}
        </Fragment>
      ))}
      {spellUse.extraDetails ? (
        <RoundedPanel>
          <div>
            <strong>Extra Details</strong>
          </div>
          {spellUse.extraDetails}
        </RoundedPanel>
      ) : null}
    </SpellDetailsContainer>
  );
};

const CastPerformanceDefaultCastBreakdownSmallText = () => (
  <>
    - These boxes represent each cast, colored by how good the usage was. Missed casts are also
    shown in{' '}
    <TooltipElement content="Used for casts that may have been skipped in order to save for crucial moments.">
      <Highlight color={OkColor} textColor="black">
        yellow
      </Highlight>
    </TooltipElement>{' '}
    or{' '}
    <TooltipElement content="Used for casts that could have been used without impacting your other usage.">
      <Highlight color={BadColor} textColor="white">
        red
      </Highlight>
    </TooltipElement>
    .
  </>
);

const NoCastsDisplay = () => {
  const { hideGoodCasts } = useSpellUsageContext();
  if (hideGoodCasts) {
    return (
      <SpellDetailsContainer>
        <NoData>All of your casts of this spell were good!</NoData>
      </SpellDetailsContainer>
    );
  }
  return (
    <SpellDetailsContainer>
      <NoData>You did not cast this spell at all.</NoData>
    </SpellDetailsContainer>
  );
};

type SpellUsageSubSectionProps = Omit<ComponentPropsWithoutRef<typeof SubSection>, 'children'> & {
  abovePerformanceDetails?: ReactNode;
  belowPerformanceDetails?: ReactNode;
  castBreakdownSmallText?: ReactNode;
  explanation: ReactNode;
  performances: BoxRowEntry[];
  uses: SpellUse[];
  onPerformanceBoxClick?: (use: SpellUse | undefined) => void;
  spellUseToPerformance?: (use: SpellUse) => BoxRowEntry;
};

/**
 * Creates a SubSection that features an explanation and a performance box row. When boxes
 * in the performance box row are clicked, any details available about the cast associated
 * with the clicked box will be displayed below the row of boxes.
 */
const SpellUsageSubSection = ({
  abovePerformanceDetails,
  belowPerformanceDetails,
  castBreakdownSmallText,
  explanation,
  performances,
  uses,
  onPerformanceBoxClick,
  spellUseToPerformance,
  ...others
}: SpellUsageSubSectionProps) => {
  const [selectedUse, setSelectedUse] = useState<number | undefined>();
  const { hideGoodCasts } = useSpellUsageContext();
  const info = useInfo();

  const onClickBox = useCallback(
    (index) => {
      if (index >= performances.length) {
        setSelectedUse(undefined);
        onPerformanceBoxClick?.(undefined);
      } else {
        setSelectedUse(index);
        onPerformanceBoxClick?.(index);
      }
    },
    [onPerformanceBoxClick, performances.length],
  );

  // hideGoodCasts is in the dependency list because we want this to run whenever
  // we toggle the "Hide Good Casts" toggle.
  // This isn't in HideGoodCastsSpellUsageSubSection because "selectedUse" lives here.
  useEffect(() => {
    setSelectedUse(undefined);
    onPerformanceBoxClick?.(undefined);
  }, [hideGoodCasts, onPerformanceBoxClick]);

  if (!info) {
    return null;
  }

  return (
    <SubSection style={{ paddingBottom: 20 }} {...others}>
      <ExplanationRow>
        <Explanation>{explanation}</Explanation>
        <SpellUsageDetailsContainer>
          {abovePerformanceDetails ?? <div />}
          <div>
            <strong>Cast Breakdown</strong>{' '}
            <small>
              {castBreakdownSmallText ? (
                castBreakdownSmallText
              ) : (
                <CastPerformanceDefaultCastBreakdownSmallText />
              )}
            </small>
          </div>
          <PerformanceBoxRow
            values={performances.map((p, idx) =>
              idx === selectedUse ? { ...p, className: 'selected' } : p,
            )}
            onClickBox={onClickBox}
          />
          {uses.length === 0 ? (
            <NoCastsDisplay />
          ) : (
            <SpellUseDetails
              spellUse={
                selectedUse !== undefined && selectedUse < uses.length
                  ? uses[selectedUse]
                  : undefined
              }
              performance={
                selectedUse !== undefined && selectedUse < performances.length
                  ? performances[selectedUse]
                  : undefined
              }
            />
          )}
          {belowPerformanceDetails}
        </SpellUsageDetailsContainer>
      </ExplanationRow>
    </SubSection>
  );
};

export const logSpellUseEvent = (use: SpellUse | undefined) => {
  if (use) {
    console.log(use.event);
  }
};

export default SpellUsageSubSection;
