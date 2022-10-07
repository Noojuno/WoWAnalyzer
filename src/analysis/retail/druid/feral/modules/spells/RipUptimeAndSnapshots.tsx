import SPELLS from 'common/SPELLS';
import { Options } from 'parser/core/Analyzer';
import { ApplyDebuffEvent, RefreshDebuffEvent } from 'parser/core/Events';
import Enemies from 'parser/shared/modules/Enemies';
import uptimeBarSubStatistic, { SubPercentageStyle } from 'parser/ui/UptimeBarSubStatistic';

import {
  getPrimalWrathDuration,
  getRipDuration,
  getRipFullDuration,
  RIP_DURATION_BASE,
  SNAPSHOT_DOWNGRADE_BUFFER,
} from 'analysis/retail/druid/feral/constants';
import {
  getHardcast,
  getPrimalWrath,
} from 'analysis/retail/druid/feral/normalizers/CastLinkNormalizer';
import Snapshots, {
  BLOODTALONS_SPEC,
  SnapshotSpec,
  TIGERS_FURY_SPEC,
} from 'analysis/retail/druid/feral/modules/core/Snapshots';
import { TALENTS_DRUID } from 'common/TALENTS';
import getResourceSpent from 'parser/core/getResourceSpent';
import RESOURCE_TYPES from 'game/RESOURCE_TYPES';
import { QualitativePerformance } from 'parser/ui/QualitativePerformance';
import { SubSection } from 'interface/guide';
import { SpellLink } from 'interface';
import { PerformanceBoxRow } from 'parser/ui/PerformanceBoxRow';

class RipUptimeAndSnapshots extends Snapshots {
  static dependencies = {
    ...Snapshots.dependencies,
    enemies: Enemies,
  };

  protected enemies!: Enemies;

  castLog: RipCast[] = [];

  constructor(options: Options) {
    super(SPELLS.RIP, SPELLS.RIP, [TIGERS_FURY_SPEC, BLOODTALONS_SPEC], options);
  }

  getDotExpectedDuration(event: ApplyDebuffEvent | RefreshDebuffEvent): number {
    const fromHardcast = getHardcast(event);
    if (fromHardcast) {
      getRipDuration(fromHardcast, this.selectedCombatant);
    }
    const fromPrimalWrath = getPrimalWrath(event);
    if (fromPrimalWrath) {
      getPrimalWrathDuration(fromPrimalWrath, this.selectedCombatant);
    }

    console.warn(
      "Couldn't find what cast produced Rip application - assuming base duration",
      event,
    );
    return RIP_DURATION_BASE;
  }

  getDotFullDuration(): number {
    return getRipFullDuration(this.selectedCombatant);
  }

  getTotalDotUptime(): number {
    return this.enemies.getBuffUptime(SPELLS.RIP.id);
  }

  handleApplication(
    application: ApplyDebuffEvent | RefreshDebuffEvent,
    snapshots: SnapshotSpec[],
    prevSnapshots: SnapshotSpec[] | null,
    power: number,
    prevPower: number,
    remainingOnPrev: number,
    clipped: number,
  ) {
    const ripCast = getHardcast(application);
    const pwCast = getPrimalWrath(application);
    if (ripCast) {
      // log the cast
      const timestamp = ripCast.timestamp;
      const targetName = this.enemies.getEntity(ripCast)?.name;
      const cpsUsed = getResourceSpent(ripCast, RESOURCE_TYPES.COMBO_POINTS);
      const snapshotNames = snapshots.map((ss) => ss.name);
      const prevSnapshotNames = prevSnapshots === null ? null : prevSnapshots.map((ss) => ss.name);
      const wasUnacceptableDowngrade =
        prevPower > power && remainingOnPrev > SNAPSHOT_DOWNGRADE_BUFFER;
      const wasUpgrade = prevPower < power;

      this.castLog.push({
        timestamp,
        targetName,
        cpsUsed,
        remainingOnPrev,
        clipped,
        snapshotNames,
        prevSnapshotNames,
        wasUnacceptableDowngrade,
        wasUpgrade,
      });
    } else if (pwCast) {
      // TODO handle PW cast
    } else {
      console.warn("Couldn't find cast linked to Rip application", application);
    }

    if (prevPower >= power && clipped > 0) {
      const cast = getHardcast(application);
      if (cast) {
        cast.meta = {
          isInefficientCast: true,
          inefficientCastReason: `This cast clipped ${(clipped / 1000).toFixed(
            1,
          )} seconds of Rip time without upgrading the snapshot.
          Try to wait until the last 30% of Rip's duration before refreshing`,
        };
      }
    }
  }

  /** Subsection explaining the use of Rip and providing performance statistics */
  get guideSubsection(): JSX.Element {
    const hasPw = this.selectedCombatant.hasTalent(TALENTS_DRUID.PRIMAL_WRATH_TALENT);
    const hasBt = this.selectedCombatant.hasTalent(TALENTS_DRUID.BLOODTALONS_TALENT);
    const castPerfBoxes = this.castLog.map((cast) => {
      const value: QualitativePerformance = 'good'; // TODO
      const tooltip = 'GREAT JOB NERD'; // TODO
      return { value, tooltip };
    });

    return (
      <SubSection>
        <p>
          <b>
            <SpellLink id={SPELLS.RIP.id} />
          </b>{' '}
          is your highest damage-per-energy single target spender. Try to maintain 100% uptime.{' '}
          {hasPw ? (
            <>
              Use <SpellLink id={TALENTS_DRUID.PRIMAL_WRATH_TALENT.id} /> to apply it when you can
              hit more than one target.
            </>
          ) : (
            <>
              You can even keep it active on multiple targets, though if a fight will frequently
              have multiple targets consider speccing for{' '}
              <SpellLink id={TALENTS_DRUID.PRIMAL_WRATH_TALENT.id} />.
            </>
          )}{' '}
          Don't refresh early, and try to always snapshot <SpellLink id={SPELLS.TIGERS_FURY.id} />
          {hasBt && (
            <>
              {' '}
              and <SpellLink id={TALENTS_DRUID.BLOODTALONS_TALENT.id} />
            </>
          )}
          .
        </p>
        <strong>Rip uptime / snapshots</strong>
        <small> - Try to get as close to 100% as the encounter allows!</small>
        {this.subStatistic()}
        <strong>Rip casts</strong>
        <small> - Text goes here lol. Mouseover for more details.</small>
        <PerformanceBoxRow values={castPerfBoxes} />
      </SubSection>
    );
  }

  get uptimeHistory() {
    return this.enemies.getDebuffHistory(SPELLS.RIP.id);
  }

  subStatistic() {
    return uptimeBarSubStatistic(
      this.owner.fight,
      {
        spells: [SPELLS.RIP],
        uptimes: this.uptimeHistory,
      },
      this.snapshotUptimes,
      SubPercentageStyle.RELATIVE,
    );
  }
}

/** Tracking object for each Rip cast */
type RipCast = {
  /** Cast's timestamp */
  timestamp: number;
  /** Name of cast's target */
  targetName?: string;
  /** Number of Combo Points consumed */
  cpsUsed: number;
  /** Time remaining on previous Rip */
  remainingOnPrev: number;
  /** Time clipped from previous Rip */
  clipped: number;
  /** Name of snapshots on new cast */
  snapshotNames: string[];
  /** Name of snapshots on prev cast (or null for fresh application) */
  prevSnapshotNames: string[] | null;
  /** True iff snapshots were downgraded with more than buffer time remaining */
  wasUnacceptableDowngrade: boolean;
  /** True iff the snapshot got stronger */
  wasUpgrade: boolean;
};

export default RipUptimeAndSnapshots;
