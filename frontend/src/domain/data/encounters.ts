// KEEP IN SYNC with backend/src/data/encounters.ts
// Static catalogue of raid wings, fractal CMs and strikes.
import type { Encounter, EncounterGroup } from "../types/encounter.types";

export const GROUPS: EncounterGroup[] = [
  // Raids
  { id: "w1", short: "W1", name: "Spirit Vale", category: "raid" },
  { id: "w2", short: "W2", name: "Salvation Pass", category: "raid" },
  { id: "w3", short: "W3", name: "Stronghold of the Faithful", category: "raid" },
  { id: "w4", short: "W4", name: "Bastion of the Penitent", category: "raid" },
  { id: "w5", short: "W5", name: "Hall of Chains", category: "raid" },
  { id: "w6", short: "W6", name: "Mythwright Gambit", category: "raid" },
  { id: "w7", short: "W7", name: "The Key of Ahdashim", category: "raid" },
  { id: "w8", short: "W8", name: "Mount Balrior", category: "raid" },
  { id: "voe", short: "VoE", name: "Visions of Eternity", category: "raid" },
  // Fractals (CM bosses)
  { id: "lonelytower", short: "100 CM", name: "Lonely Tower", category: "fractal" },
  { id: "silentsurf", short: "99 CM", name: "Silent Surf", category: "fractal" },
  { id: "sunqua", short: "98 CM", name: "Sunqua Peak", category: "fractal" },
  { id: "shattered", short: "97 CM", name: "Shattered Observatory", category: "fractal" },
  { id: "nightmare", short: "96 CM", name: "Nightmare", category: "fractal" },
  { id: "kinfall", short: "95 CM", name: "Kinfall", category: "fractal" },
  { id: "solitarythrone", short: "94 CM", name: "Solitary Throne", category: "fractal" },
  // Strikes
  { id: "ibs", short: "IBS", name: "Icebrood Saga", category: "strike" },
  { id: "eod", short: "EoD", name: "End of Dragons", category: "strike" },
  { id: "soto", short: "SotO", name: "Secrets of the Obscure", category: "strike" },
  { id: "festival", short: "Fest", name: "Festival", category: "strike" },
];

export const ENCOUNTERS: Encounter[] = [
  // W1
  { key: "vg", name: "Vale Guardian", group: "w1", ids: [15438], aliases: ["vale guardian"] },
  { key: "spiritrace", name: "Spirit Woods", group: "w1", ids: [50], aliases: ["spirit race", "spirit woods"] },
  { key: "gors", name: "Gorseval", group: "w1", ids: [15429], aliases: ["gorseval"] },
  { key: "sab", name: "Sabetha", group: "w1", ids: [15375], aliases: ["sabetha"] },
  // W2
  { key: "sloth", name: "Slothasor", group: "w2", ids: [16123], aliases: ["slothasor"] },
  { key: "trio", name: "Bandit Trio", group: "w2", ids: [16088, 16137, 16125], aliases: ["bandit trio", "berg", "zane", "narella"] },
  { key: "matt", name: "Matthias Gabrel", group: "w2", ids: [16115], aliases: ["matthias"] },
  // W3
  { key: "esc", name: "Escort", group: "w3", ids: [16253], aliases: ["escort", "mcleod", "siege the stronghold"] },
  { key: "kc", name: "Keep Construct", group: "w3", ids: [16235], aliases: ["keep construct"] },
  { key: "tc", name: "Twisted Castle", group: "w3", ids: [16247], aliases: ["twisted castle"] },
  { key: "xera", name: "Xera", group: "w3", ids: [16246, 16286], aliases: ["xera"] },
  // W4
  { key: "cairn", name: "Cairn", group: "w4", ids: [17194], aliases: ["cairn"] },
  { key: "mo", name: "Mursaat Overseer", group: "w4", ids: [17172], aliases: ["mursaat overseer"] },
  { key: "sam", name: "Samarog", group: "w4", ids: [17188], aliases: ["samarog"] },
  { key: "dei", name: "Deimos", group: "w4", ids: [17154], aliases: ["deimos"] },
  // W5
  { key: "sh", name: "Soulless Horror", group: "w5", ids: [19767], aliases: ["soulless horror", "desmina"] },
  { key: "rr", name: "River of Souls", group: "w5", ids: [19828], aliases: ["river of souls"] },
  { key: "bk", name: "Broken King", group: "w5", ids: [19691], aliases: ["broken king"] },
  { key: "eos", name: "Eater of Souls", group: "w5", ids: [19536], aliases: ["eater of souls", "soul eater"] },
  { key: "eyes", name: "Statue of Darkness", group: "w5", ids: [19651, 19844], aliases: ["statue of darkness", "eye of judgment", "eye of fate"] },
  { key: "dhuum", name: "Dhuum", group: "w5", ids: [19450], aliases: ["dhuum"] },
  // W6
  { key: "ca", name: "Conjured Amalgamate", group: "w6", ids: [43974, 37464], aliases: ["conjured amalgamate"] },
  { key: "twins", name: "Twin Largos", group: "w6", ids: [21105, 21089], aliases: ["twin largos", "nikare", "kenut"] },
  { key: "qadim", name: "Qadim", group: "w6", ids: [20934], aliases: ["qadim"] },
  // W7
  { key: "adina", name: "Cardinal Adina", group: "w7", ids: [22006], aliases: ["adina"] },
  { key: "sabir", name: "Cardinal Sabir", group: "w7", ids: [21964], aliases: ["sabir"] },
  { key: "qpeer", name: "Qadim the Peerless", group: "w7", ids: [22000], aliases: ["qadim the peerless"] },
  // W8
  { key: "greer", name: "Greer, the Blightbringer", group: "w8", ids: [26725], aliases: ["greer"] },
  { key: "decima", name: "Decima, the Stormsinger", group: "w8", ids: [26774], aliases: ["decima"] },
  { key: "ura", name: "Ura, the Steamshrieker", group: "w8", ids: [26712], aliases: ["ura, the", "ura the steamshrieker", "steamshrieker"] },
  // Visions of Eternity (standalone raid encounters, not a numbered wing)
  { key: "kela", name: "Kela, Seneschal of Waves", group: "voe", ids: [27124], aliases: ["kela", "guardian's glade", "guardians glade"] },
  { key: "vloxx", name: "Vloxx", group: "voe", ids: [28106], aliases: ["vloxx", "nexus of eternity"] },

  // Fractals
  { key: "mama", name: "MAMA", group: "nightmare", ids: [17021], aliases: ["mama", "m.a.m.a"] },
  { key: "siax", name: "Siax the Corrupted", group: "nightmare", ids: [17028], aliases: ["siax"] },
  { key: "enso", name: "Ensolyss of the Endless Torment", group: "nightmare", ids: [16948], aliases: ["ensolyss"] },
  { key: "skor", name: "Skorvald", group: "shattered", ids: [17632], aliases: ["skorvald"] },
  { key: "arts", name: "Artsariiv", group: "shattered", ids: [17949], aliases: ["artsariiv"] },
  { key: "arkk", name: "Arkk", group: "shattered", ids: [17759], aliases: ["arkk"] },
  { key: "ai", name: "Ai, Keeper of the Peak", group: "sunqua", ids: [23254], aliases: ["ai, keeper", "keeper of the peak", "dark ai", "elemental ai"] },
  { key: "kana", name: "Kanaxai, Scythe of House Aurkus", group: "silentsurf", ids: [25577, 25572], aliases: ["kanaxai"] },
  { key: "eparch", name: "Eparch", group: "lonelytower", ids: [26231], aliases: ["eparch", "cerus and deimos"] },
  { key: "whisp", name: "Whispering Shadow", group: "kinfall", ids: [27010], aliases: ["whispering shadow"] },
  { key: "tyrant", name: "The Eternal Tyrant", group: "solitarythrone", ids: [28051], aliases: ["eternal tyrant", "solitary throne"] },

  // Strikes — Icebrood Saga
  { key: "ice", name: "Icebrood Construct", group: "ibs", ids: [22154], aliases: ["icebrood construct", "shiverpeaks pass"] },
  { key: "fraenir", name: "Fraenir of Jormag", group: "ibs", ids: [22492], aliases: ["fraenir"] },
  { key: "vc", name: "Voice & Claw of the Fallen", group: "ibs", ids: [22343], aliases: ["voice of the fallen", "claw of the fallen", "voice and claw", "super kodan"] },
  { key: "bone", name: "Boneskinner", group: "ibs", ids: [22521], aliases: ["boneskinner"] },
  { key: "woj", name: "Whisper of Jormag", group: "ibs", ids: [22711], aliases: ["whisper of jormag"] },
  { key: "cw", name: "Cold War", group: "ibs", ids: [22836], aliases: ["cold war", "varinia stormsounder"] },
  { key: "fs", name: "Forging Steel", group: "ibs", ids: [22436], aliases: ["forging steel"] },
  // Strikes — End of Dragons
  { key: "ah", name: "Aetherblade Hideout", group: "eod", ids: [24033], aliases: ["aetherblade hideout", "mai trin"] },
  { key: "xjj", name: "Xunlai Jade Junkyard", group: "eod", ids: [23957], aliases: ["xunlai jade junkyard", "ankka"] },
  { key: "ko", name: "Kaineng Overlook", group: "eod", ids: [24485], aliases: ["kaineng overlook", "minister li"] },
  { key: "ht", name: "Harvest Temple", group: "eod", ids: [24375, 43488], aliases: ["harvest temple", "the dragonvoid", "dragonvoid"] },
  { key: "olc", name: "Old Lion's Court", group: "eod", ids: [25413, 25414, 25415], aliases: ["old lion's court", "old lions court", "prototype vermilion", "prototype arsenite", "prototype indigo"] },
  // Strikes — SotO
  { key: "co", name: "Cosmic Observatory", group: "soto", ids: [25705], aliases: ["cosmic observatory", "dagda"] },
  { key: "tof", name: "Temple of Febe", group: "soto", ids: [25989], aliases: ["temple of febe", "cerus"] },
  // Festival
  { key: "freezie", name: "Freezie", group: "festival", ids: [21333], aliases: ["freezie"] },
];
