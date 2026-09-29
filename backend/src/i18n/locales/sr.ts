import type { EmailMessages } from "./en";

export const sr: EmailMessages = {
  greeting: "Zdravo {account},",
  linkHint: "Dugme ne radi? Nalepi ovaj link u browser:",
  tagline: "Svaki boss. Svaki pokušaj. Na jednom mestu.",
  disclaimer: "Fan projekat, nije povezan sa ArenaNetom, ArcDPS-om niti dps.reportom.",
  verification: {
    subject: "Potvrdi email — GW2 ArcDPS Helper",
    preheader: "Jedan klik i nalog je spreman.",
    eyebrow: "Dobrodošao",
    heading: "Potvrdi email adresu",
    body: "Hvala što si napravio GW2 ArcDPS Helper nalog! Klikni na dugme ispod da potvrdiš email adresu — odmah ćeš biti prijavljen i možeš da počneš da skupljaš logove.",
    button: "Potvrdi email",
    footer: "Link važi 24 sata. Ako nisi ti napravio nalog, slobodno ignoriši ovaj email.",
  },
  passwordReset: {
    subject: "Resetuj lozinku — GW2 ArcDPS Helper",
    preheader: "Izaberi novu lozinku za svoj nalog.",
    eyebrow: "Bezbednost naloga",
    heading: "Resetuj lozinku",
    body: "Neko (nadamo se ti) je zatražio reset lozinke za tvoj nalog. Klikni na dugme ispod da izabereš novu — odmah ćeš biti prijavljen sa njom.",
    button: "Izaberi novu lozinku",
    footer:
      "Link važi 1 sat i može se iskoristiti jednom. Ako nisi ti tražio reset, ignoriši ovaj email — lozinka ostaje ista.",
  },
};
