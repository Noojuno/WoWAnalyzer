import ITEMS from 'common/ITEMS';
import SPELLS from 'common/SPELLS';
import { TALENTS_SHAMAN } from 'common/TALENTS';

const spells: number[] = [
  /**
   * This can consist of boss mechanics marked as casts, buff applications marked
   * as separate casts from the normal ability, toy casts that some people macro
   * into their abilities and so forth
   */
  SPELLS.MELEE.id, // Auto attack
  SPELLS.CHI_BURST_HEAL.id, // this is the "tick" when you hit a player, the actual cast has a different id
  SPELLS.REFRESHING_JADE_WIND_HEAL.id, // this is the "tick" when you hit a player, the actual cast has a different id
  SPELLS.SHADOWY_APPARITION.id,
  SPELLS.SHADOWY_APPARITION_CAST.id, // Shadow priest shadow apparitions passive
  SPELLS.PRIMAL_FURY.id, // Feral Druid "extra CP on crit" proc causes a cast event
  SPELLS.BLOW_DARKMOON_WHISTLE.id, //Darkmoon Whistle active that some people macro into abilities
  SPELLS.DARKMOON_FIREWORK.id, //Darkmoon Firework toy
  SPELLS.BIG_RED_RAYS.id, //Big Red Raygun active effect
  SPELLS.MUTILATE_OFFHAND.id, // Mutilate off hand
  SPELLS.DIVINE_HYMN_HEAL.id, //The heal component of divine hymn
  SPELLS.CHARGE_2.id, // The damage component of charge
  SPELLS.CLOUDBURST_TOTEM_RECALL.id, // Cloudburst reactivation
  TALENTS_SHAMAN.SPIRITWALKERS_GRACE_TALENT.id,

  //region Boss abilities
  SPELLS.RIONTHUS_DISINTEGRATE.id, // targeted player is shown as 'casting' this spell
  //endregion

  //region Consumables
  //endregion

  //region Enchants
  //endregion

  //region Death Knight
  SPELLS.BREATH_OF_SINDRAGOSA_TALENT_DAMAGE_TICK.id,
  SPELLS.RUNE_1.id,
  SPELLS.RUNE_2.id,
  SPELLS.RUNE_3.id,
  SPELLS.ABOMINATION_LIMB_TICK.id,
  SPELLS.ABOMINATION_LIMB_GRIP_TICK.id,
  //endregion

  //region Evoker
  SPELLS.VERDANT_EMBRACE_HEAL.id,
  //endregion

  //region Hunter
  SPELLS.BARBED_SHOT_PET_BUFF.id, //The buff applied to BM Hunter pet when casting Barbed Shot
  SPELLS.DIRE_BEAST_SUMMON.id, //Additional cast event associated with summoning a Dire Beast
  SPELLS.DIRE_BEAST_GLYPHED.id, //Additional cast event associated with summoning a Dire Beast with Glyph of Dire Stable
  //endregion

  //region Mage
  SPELLS.SHIFTING_POWER_TICK.id,
  //endregion

  //region Demon Hunter
  SPELLS.FRACTURE_MAIN_HAND.id, // Fracture main hand damage ability
  SPELLS.FRACTURE_OFF_HAND.id, // Fracture off hand damage ability
  SPELLS.SOUL_FRAGMENT_KILLING_BLOW.id, // Soul Fragment that are sometimes generated by killing blows (it does not affect much of a rotation, because it's usually ~1:200, comparing to usual soul fragment generation)
  SPELLS.FELBLADE_DAMAGE.id, // The spell that generates fury when casting
  SPELLS.THE_HUNT_CHARGE.id, // The impact from The Hunt
  SPELLS.SOUL_CARVER_OFF_HAND.id, // Soul Carver off hand damage ability
  SPELLS.THROW_GLAIVE_VENGEANCE_DAMAGE.id, // Vengeance Throw Glaive damage ability
  //endregion

  //region druid
  SPELLS.TRANQUILITY_HEAL.id,
  //endregion

  //region monk
  SPELLS.ESCAPE_FROM_REALITY_CAST.id,
  //endregion

  //region paladin
  SPELLS.RECLAMATION_CAST.id,
  //endregion

  //region warrior
  SPELLS.RAMPAGE_1.id,
  SPELLS.RAMPAGE_2.id,
  SPELLS.RAMPAGE_3.id,
  SPELLS.RAMPAGE_4.id,
  SPELLS.HACK_AND_SLASH.id,
  SPELLS.WRATH_AND_FURY.id,
  //endregion

  //region trinket
  //endregion
  //region Embellishments
  ITEMS.HEALING_DART_CAST.id,
  //endregion
];

export default spells;
