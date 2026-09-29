import type { EmailMessages } from "./en";

export const sr: EmailMessages = {
  greeting: "Zdravo {account},",
  verification: {
    subject: "Potvrdi email — GW2 ArcDPS Helper",
    body: "Klikni na dugme ispod da potvrdiš email adresu i završiš pravljenje naloga.",
    button: "Potvrdi email",
    footer: "Link važi 24 sata. Ako nisi ti napravio nalog, ignoriši ovaj email.",
  },
  passwordReset: {
    subject: "Resetuj lozinku — GW2 ArcDPS Helper",
    body: "Neko (nadamo se ti) je zatražio reset lozinke za tvoj nalog. Klikni na dugme ispod da izabereš novu.",
    button: "Resetuj lozinku",
    footer:
      "Link važi 1 sat i može se iskoristiti jednom. Ako nisi ti tražio reset, ignoriši ovaj email — lozinka ostaje ista.",
  },
};
