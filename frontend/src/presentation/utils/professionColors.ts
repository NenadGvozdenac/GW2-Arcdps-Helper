const PROFESSION_BY_SPEC: Record<string, string> = {
  Guardian: "Guardian", Dragonhunter: "Guardian", Firebrand: "Guardian", Willbender: "Guardian", Luminary: "Guardian",
  Warrior: "Warrior", Berserker: "Warrior", Spellbreaker: "Warrior", Bladesworn: "Warrior", Paragon: "Warrior",
  Revenant: "Revenant", Herald: "Revenant", Renegade: "Revenant", Vindicator: "Revenant", Conduit: "Revenant",
  Engineer: "Engineer", Scrapper: "Engineer", Holosmith: "Engineer", Mechanist: "Engineer", Amalgam: "Engineer",
  Ranger: "Ranger", Druid: "Ranger", Soulbeast: "Ranger", Untamed: "Ranger", Galeshot: "Ranger",
  Thief: "Thief", Daredevil: "Thief", Deadeye: "Thief", Specter: "Thief", Antiquary: "Thief",
  Elementalist: "Elementalist", Tempest: "Elementalist", Weaver: "Elementalist", Catalyst: "Elementalist", Evoker: "Elementalist",
  Mesmer: "Mesmer", Chronomancer: "Mesmer", Mirage: "Mesmer", Virtuoso: "Mesmer", Troubadour: "Mesmer",
  Necromancer: "Necromancer", Reaper: "Necromancer", Scourge: "Necromancer", Harbinger: "Necromancer", Ritualist: "Necromancer",
};

const PROFESSION_COLOR: Record<string, string> = {
  Guardian: "#72C1D9",
  Warrior: "#FFD166",
  Revenant: "#D16E5A",
  Engineer: "#D09C59",
  Ranger: "#8CDC82",
  Thief: "#C08F95",
  Elementalist: "#F68A87",
  Mesmer: "#B679D5",
  Necromancer: "#52A76F",
};

export const professionColor = (spec: string) => PROFESSION_COLOR[PROFESSION_BY_SPEC[spec] ?? ""] ?? "#9aa0a6";
