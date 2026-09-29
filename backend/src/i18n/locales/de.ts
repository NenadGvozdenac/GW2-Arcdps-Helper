import type { EmailMessages } from "./en";

export const de: EmailMessages = {
  greeting: "Hallo {account},",
  verification: {
    subject: "Bestätige deine E-Mail — GW2 ArcDPS Helper",
    body: "Klick auf den Button unten, um deine E-Mail-Adresse zu bestätigen und dein Konto fertig zu erstellen.",
    button: "E-Mail bestätigen",
    footer: "Der Link ist 24 Stunden gültig. Falls du kein Konto erstellt hast, ignoriere diese E-Mail.",
  },
  passwordReset: {
    subject: "Setz dein Passwort zurück — GW2 ArcDPS Helper",
    body: "Jemand (hoffentlich du) hat das Zurücksetzen des Passworts für dein Konto angefordert. Klick auf den Button unten, um ein neues zu wählen.",
    button: "Passwort zurücksetzen",
    footer:
      "Der Link ist 1 Stunde gültig und funktioniert einmal. Falls du das nicht angefordert hast, ignoriere diese E-Mail — dein Passwort bleibt gleich.",
  },
};
