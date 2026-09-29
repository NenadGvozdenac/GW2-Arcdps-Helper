import type { EmailMessages } from "./en";

export const de: EmailMessages = {
  greeting: "Hallo {account},",
  linkHint: "Der Button funktioniert nicht? Kopiere diesen Link in deinen Browser:",
  tagline: "Jeder Boss. Jeder Versuch. Ein Ort.",
  disclaimer: "Ein Fan-Projekt, nicht verbunden mit ArenaNet, ArcDPS oder dps.report.",
  verification: {
    subject: "Bestätige deine E-Mail — GW2 ArcDPS Helper",
    preheader: "Ein Klick und dein Konto ist bereit.",
    eyebrow: "Willkommen an Bord",
    heading: "Bestätige deine E-Mail",
    body: "Danke, dass du ein GW2 ArcDPS Helper-Konto erstellt hast! Klick auf den Button unten, um deine E-Mail-Adresse zu bestätigen — du wirst sofort angemeldet und kannst deine Logs sammeln.",
    button: "E-Mail bestätigen",
    footer: "Der Link ist 24 Stunden gültig. Falls du kein Konto erstellt hast, kannst du diese E-Mail ignorieren.",
  },
  passwordReset: {
    subject: "Setz dein Passwort zurück — GW2 ArcDPS Helper",
    preheader: "Wähl ein neues Passwort für dein Konto.",
    eyebrow: "Kontosicherheit",
    heading: "Passwort zurücksetzen",
    body: "Jemand (hoffentlich du) hat das Zurücksetzen des Passworts für dein Konto angefordert. Klick auf den Button unten, um ein neues zu wählen — du wirst damit sofort angemeldet.",
    button: "Neues Passwort wählen",
    footer:
      "Der Link ist 1 Stunde gültig und funktioniert einmal. Falls du das nicht angefordert hast, ignoriere diese E-Mail — dein Passwort bleibt gleich.",
  },
};
