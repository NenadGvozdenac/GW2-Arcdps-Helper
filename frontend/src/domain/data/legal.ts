// Texts of the Privacy Policy (/privacy) and Terms of Service (/terms), per language.
// Kept out of the i18n messages because they are long, structured documents rather than UI strings.
// When the content changes materially, update LEGAL_LAST_UPDATED as well.
import type { Language } from "../../i18n/i18n.types";

/** Date shown as "Last updated" on both documents (ISO, formatted per language on the page). */
export const LEGAL_LAST_UPDATED = "2026-10-02";

export interface LegalSection {
  heading: string;
  /** A string is a paragraph, an array of strings is a bulleted list. */
  blocks: (string | string[])[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalDocumentKind = "privacy" | "terms";

const en: Record<LegalDocumentKind, LegalDocument> = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "This policy explains what personal data GW2 ArcDPS Helper (“the service”, “we”) collects, why, who it is shared with and what your rights are. The service is a free, open-source hobby project maintained by its developer; it is not a company and is not affiliated with ArenaNet, NCSOFT, ArcDPS or dps.report.",
    sections: [
      {
        heading: "1. Data we collect",
        blocks: [
          "Account data you enter when registering:",
          [
            "email address — to sign you in, confirm your account and send password-reset links;",
            "Guild Wars 2 account name (Name.1234) — shown as your identity in the app and in Discord messages;",
            "password — stored only as a one-way (bcrypt) hash, never in readable form;",
            "the time you accepted these documents and the times confirmation / reset emails were sent.",
          ],
          "Optional settings: a Discord webhook URL and a dps.report user token, if you add them in Settings.",
          "Feedback: what you send on the Feedback page (category, title, description), linked to your account if you are signed in, or — as a guest — the email you choose to leave. We also store a one-way hash of your IP address (never the address itself) to limit how often feedback can be sent. Feedback is emailed to the developer.",
          "Logs and sessions: for every log you upload we store the dps.report link and data read from it — boss, result, duration, date, game build, who recorded it and the character names, account names and professions of the players in the squad. We also store the sessions you create and any share links you turn on.",
          "Browser storage: the website keeps your sign-in token, language and a few display preferences in your browser’s localStorage. We use no tracking cookies, no analytics and no advertising.",
          "Technical data: our hosting providers process IP addresses and request metadata as part of serving the website and API and protecting it against abuse.",
        ],
      },
      {
        heading: "2. Why we use it",
        blocks: [
          "We use your data only to provide the service you signed up for: storing and showing your logs, clears and sessions, sending account emails, uploading logs to dps.report and posting to your Discord webhook when you ask for it, and keeping the service secure. The legal basis is the performance of our agreement with you (Art. 6(1)(b) GDPR and the corresponding provision of the Serbian Law on Personal Data Protection) and our legitimate interest in security (Art. 6(1)(f)). We do not sell your data or use it for advertising or profiling.",
        ],
      },
      {
        heading: "3. Who receives data",
        blocks: [
          [
            "dps.report — log files you upload through the website, the desktop uploader or the Nexus addon are sent to dps.report, which publishes the report at its link. dps.report’s own terms and privacy policy apply there.",
            "Discord — if you connect a webhook, a summary of each new log (boss, result, who recorded it, link) is posted to that channel.",
            "Infrastructure providers — website and API hosting (Vercel), the PostgreSQL database host and the email (SMTP) provider process data on our behalf only to run the service.",
            "Anyone with a share link — a log or session you share is visible to everyone who has its link, until you turn sharing off.",
          ],
          "Some of these providers may process data outside Serbia and the EU/EEA; in that case they rely on the safeguards required by law, such as the EU Standard Contractual Clauses.",
        ],
      },
      {
        heading: "4. Other players in your logs",
        blocks: [
          "ArcDPS logs contain the character and account names of everyone in the squad. We show this data only to you and to people you share a link with. If you appear in someone else’s log and want your data removed, contact us (see below).",
        ],
      },
      {
        heading: "5. How long we keep it",
        blocks: [
          "Account data, logs and sessions are kept for as long as your account exists. You can delete logs and sessions yourself at any time. You can also delete your account yourself in Settings → Delete account: the account and everything linked to it are deleted right away; server and backup copies are overwritten within 30 days. Reports already published on dps.report are not controlled by us.",
        ],
      },
      {
        heading: "6. Your rights",
        blocks: [
          "You have the right to access your data, correct it, have it deleted, restrict or object to its processing and receive it in a portable format. You can also lodge a complaint with a data protection authority — in Serbia the Commissioner for Information of Public Importance and Personal Data Protection, in the EU the authority of your country.",
        ],
      },
      {
        heading: "7. Security",
        blocks: [
          "Traffic is encrypted with HTTPS, passwords are hashed and access to the database is restricted. No system is completely secure, so please use a password you don’t use anywhere else.",
        ],
      },
      {
        heading: "8. Children",
        blocks: ["The service is not intended for children under 16, and we do not knowingly collect their data."],
      },
      {
        heading: "9. Changes",
        blocks: [
          "If this policy changes, we will update this page and the date above. For significant changes we will let you know in the app or by email.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    intro:
      "These terms apply to your use of GW2 ArcDPS Helper (“the service”, “we”) — the website, the API, the desktop uploader and the Nexus addon. By creating an account you agree to them and to the Privacy Policy.",
    sections: [
      {
        heading: "1. The service",
        blocks: [
          "The service is a free tool for collecting, organizing and sharing Guild Wars 2 ArcDPS logs. It is a hobby project provided “as is” — features may change, be interrupted or be discontinued at any time without notice.",
        ],
      },
      {
        heading: "2. Your account",
        blocks: [
          [
            "Provide a real email address and your own GW2 account name.",
            "Keep your password secret — you are responsible for what happens under your account.",
            "One account is for one person; tell us if you think your account has been misused.",
          ],
        ],
      },
      {
        heading: "3. Acceptable use",
        blocks: [
          "You agree not to:",
          [
            "upload files that are not ArcDPS logs, or anything malicious or illegal;",
            "try to access other users’ data, bypass security or overload the service (including automated mass requests outside the official clients);",
            "use the service to harass or expose other players;",
            "use the service in a way that breaks the law or the terms of dps.report, Discord or Guild Wars 2.",
          ],
        ],
      },
      {
        heading: "4. Your content",
        blocks: [
          "Logs, sessions and settings you add remain yours. You give us permission to store, process and display them as needed to run the service — including uploading log files to dps.report and posting to the Discord webhook you set. You confirm you have the right to upload the logs you add.",
        ],
      },
      {
        heading: "5. Third-party services",
        blocks: [
          "The service works together with dps.report, Discord, ArcDPS, Nexus and Guild Wars 2, which have their own terms. We are not responsible for them. Guild Wars 2 is a trademark of ArenaNet, LLC and NCSOFT Corporation; the service is not affiliated with or endorsed by them.",
        ],
      },
      {
        heading: "6. Downloadable apps",
        blocks: [
          "The desktop uploader and the Nexus addon are open source and provided as-is. Using third-party tools with Guild Wars 2 is at your own risk and subject to ArenaNet’s rules on third-party programs.",
        ],
      },
      {
        heading: "7. No warranty and limitation of liability",
        blocks: [
          "To the extent permitted by law, the service is provided without any warranty, and we are not liable for lost data, lost logs, downtime or indirect damages resulting from its use. Keep your own copies of logs that matter to you. Nothing in these terms limits liability that cannot be limited by law.",
        ],
      },
      {
        heading: "8. Ending your use",
        blocks: [
          "You can stop using the service at any time and delete your account yourself in Settings. We may suspend or delete accounts that break these terms or harm the service.",
        ],
      },
      {
        heading: "9. Changes and applicable law",
        blocks: [
          "We may update these terms; the date above shows the latest version, and significant changes will be announced in the app or by email. Continuing to use the service after a change means you accept it. These terms are governed by the law of the Republic of Serbia, without affecting the mandatory consumer protection rules of the country you live in.",
        ],
      },
    ],
  },
};

const sr: Record<LegalDocumentKind, LegalDocument> = {
  privacy: {
    title: "Politika privatnosti",
    intro:
      "Ova politika objašnjava koje lične podatke GW2 ArcDPS Helper („servis“, „mi“) prikuplja, zašto, s kim ih deli i koja su vaša prava. Servis je besplatan hobi projekat otvorenog koda koji održava njegov autor; nije kompanija i nije povezan sa ArenaNet-om, NCSOFT-om, ArcDPS-om ni dps.report-om.",
    sections: [
      {
        heading: "1. Podaci koje prikupljamo",
        blocks: [
          "Podaci naloga koje unosite pri registraciji:",
          [
            "email adresa — za prijavu, potvrdu naloga i slanje linkova za reset lozinke;",
            "Guild Wars 2 nalog (Ime.1234) — prikazuje se kao vaš identitet u aplikaciji i u Discord porukama;",
            "lozinka — čuva se samo kao jednosmerni (bcrypt) heš, nikad u čitljivom obliku;",
            "vreme kada ste prihvatili ove dokumente i vremena slanja emailova za potvrdu / reset.",
          ],
          "Opciona podešavanja: Discord webhook URL i dps.report korisnički token, ako ih dodate u Podešavanjima.",
          "Feedback: ono što pošaljete na stranici Feedback (kategorija, naslov, opis), povezano sa vašim nalogom ako ste prijavljeni, ili — kao gost — mejl koji odlučite da ostavite. Čuvamo i jednosmerni heš vaše IP adrese (nikad samu adresu) da bismo ograničili koliko često se feedback može slati. Feedback se šalje mejlom developeru.",
          "Logovi i sesije: za svaki log koji otpremite čuvamo dps.report link i podatke pročitane iz njega — boss, ishod, trajanje, datum, verziju igre, ko ga je snimio i imena likova, naloge i profesije igrača u skvadu. Čuvamo i sesije koje napravite i linkove za deljenje koje uključite.",
          "Skladište pregledača: sajt u localStorage-u vašeg pregledača čuva token prijave, jezik i nekoliko podešavanja prikaza. Ne koristimo kolačiće za praćenje, analitiku ni reklame.",
          "Tehnički podaci: naši hosting provajderi obrađuju IP adrese i metapodatke zahteva kao deo rada sajta i API-ja i zaštite od zloupotrebe.",
        ],
      },
      {
        heading: "2. Zašto ih koristimo",
        blocks: [
          "Podatke koristimo samo da bismo pružili servis za koji ste se registrovali: čuvanje i prikaz vaših logova, clear-ova i sesija, slanje emailova za nalog, otpremanje logova na dps.report i slanje poruka na vaš Discord webhook kada to zatražite, i bezbednost servisa. Pravni osnov je izvršenje ugovora sa vama (čl. 12 st. 1 tač. 2 Zakona o zaštiti podataka o ličnosti, odnosno čl. 6(1)(b) GDPR-a) i naš legitimni interes za bezbednost. Ne prodajemo vaše podatke i ne koristimo ih za reklame ili profilisanje.",
        ],
      },
      {
        heading: "3. Ko dobija podatke",
        blocks: [
          [
            "dps.report — log fajlovi koje otpremite preko sajta, desktop uploadera ili Nexus addona šalju se na dps.report, koji objavljuje izveštaj na svom linku. Tamo važe uslovi i politika privatnosti dps.report-a.",
            "Discord — ako povežete webhook, rezime svakog novog loga (boss, ishod, ko je snimio, link) šalje se na taj kanal.",
            "Provajderi infrastrukture — hosting sajta i API-ja (Vercel), host PostgreSQL baze i email (SMTP) provajder obrađuju podatke u naše ime, samo radi rada servisa.",
            "Svako ko ima link za deljenje — log ili sesija koju podelite vidljiva je svima koji imaju link, dok ne isključite deljenje.",
          ],
          "Neki od ovih provajdera mogu obrađivati podatke van Srbije i EU/EEA; u tom slučaju oslanjaju se na zaštitne mere propisane zakonom, poput standardnih ugovornih klauzula EU.",
        ],
      },
      {
        heading: "4. Drugi igrači u vašim logovima",
        blocks: [
          "ArcDPS logovi sadrže imena likova i naloge svih u skvadu. Te podatke prikazujemo samo vama i onima s kojima podelite link. Ako se nalazite u tuđem logu i želite da se vaši podaci uklone, kontaktirajte nas (vidi ispod).",
        ],
      },
      {
        heading: "5. Koliko ih čuvamo",
        blocks: [
          "Podaci naloga, logovi i sesije čuvaju se dok nalog postoji. Logove i sesije možete sami obrisati u bilo kom trenutku. Nalog možete i sami obrisati u Podešavanjima → Brisanje naloga: nalog i sve povezano s njim briše se odmah; kopije na serveru i u rezervnim kopijama prepisuju se u roku od 30 dana. Izveštaji već objavljeni na dps.report-u nisu pod našom kontrolom.",
        ],
      },
      {
        heading: "6. Vaša prava",
        blocks: [
          "Imate pravo na pristup svojim podacima, ispravku, brisanje, ograničenje obrade, prigovor na obradu i prenosivost podataka. Možete podneti i pritužbu organu za zaštitu podataka — u Srbiji Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti, u EU nadležnom organu vaše zemlje.",
        ],
      },
      {
        heading: "7. Bezbednost",
        blocks: [
          "Saobraćaj je šifrovan HTTPS-om, lozinke su heširane, a pristup bazi je ograničen. Nijedan sistem nije potpuno bezbedan, zato koristite lozinku koju ne koristite nigde drugde.",
        ],
      },
      {
        heading: "8. Deca",
        blocks: ["Servis nije namenjen deci mlađoj od 16 godina i svesno ne prikupljamo njihove podatke."],
      },
      {
        heading: "9. Izmene",
        blocks: [
          "Ako se ova politika promeni, ažuriraćemo ovu stranicu i datum iznad. O značajnim izmenama obavestićemo vas u aplikaciji ili emailom.",
        ],
      },
    ],
  },
  terms: {
    title: "Uslovi korišćenja",
    intro:
      "Ovi uslovi važe za korišćenje GW2 ArcDPS Helper-a („servis“, „mi“) — sajta, API-ja, desktop uploadera i Nexus addona. Pravljenjem naloga prihvatate njih i Politiku privatnosti.",
    sections: [
      {
        heading: "1. Servis",
        blocks: [
          "Servis je besplatan alat za prikupljanje, organizovanje i deljenje Guild Wars 2 ArcDPS logova. To je hobi projekat koji se pruža „takav kakav jeste“ — funkcije se mogu promeniti, prekinuti ili ukinuti u bilo kom trenutku bez najave.",
        ],
      },
      {
        heading: "2. Vaš nalog",
        blocks: [
          [
            "Unesite pravu email adresu i svoj GW2 nalog.",
            "Čuvajte lozinku u tajnosti — odgovorni ste za ono što se dešava na vašem nalogu.",
            "Jedan nalog je za jednu osobu; javite nam ako mislite da je vaš nalog zloupotrebljen.",
          ],
        ],
      },
      {
        heading: "3. Dozvoljeno korišćenje",
        blocks: [
          "Slažete se da nećete:",
          [
            "otpremati fajlove koji nisu ArcDPS logovi, niti bilo šta zlonamerno ili nezakonito;",
            "pokušavati da pristupite tuđim podacima, zaobiđete zaštitu ili preopteretite servis (uključujući masovne automatizovane zahteve van zvaničnih klijenata);",
            "koristiti servis za uznemiravanje ili javno izlaganje drugih igrača;",
            "koristiti servis na način koji krši zakon ili uslove dps.report-a, Discorda ili Guild Wars 2.",
          ],
        ],
      },
      {
        heading: "4. Vaš sadržaj",
        blocks: [
          "Logovi, sesije i podešavanja koje dodate ostaju vaši. Dajete nam dozvolu da ih čuvamo, obrađujemo i prikazujemo koliko je potrebno za rad servisa — uključujući otpremanje log fajlova na dps.report i slanje poruka na Discord webhook koji podesite. Potvrđujete da imate pravo da otpremite logove koje dodajete.",
        ],
      },
      {
        heading: "5. Servisi trećih strana",
        blocks: [
          "Servis radi zajedno sa dps.report-om, Discordom, ArcDPS-om, Nexusom i Guild Wars 2, koji imaju svoje uslove. Nismo odgovorni za njih. Guild Wars 2 je zaštitni znak kompanija ArenaNet, LLC i NCSOFT Corporation; servis nije povezan s njima niti ga oni podržavaju.",
        ],
      },
      {
        heading: "6. Aplikacije za preuzimanje",
        blocks: [
          "Desktop uploader i Nexus addon su otvorenog koda i pružaju se „takvi kakvi jesu“. Korišćenje alata trećih strana uz Guild Wars 2 je na vaš rizik i podleže pravilima ArenaNet-a o programima trećih strana.",
        ],
      },
      {
        heading: "7. Bez garancije i ograničenje odgovornosti",
        blocks: [
          "U meri u kojoj zakon dozvoljava, servis se pruža bez ikakve garancije i nismo odgovorni za izgubljene podatke ili logove, prekide rada ili posrednu štetu nastalu korišćenjem. Čuvajte sopstvene kopije logova koji su vam važni. Ništa u ovim uslovima ne ograničava odgovornost koja se po zakonu ne može ograničiti.",
        ],
      },
      {
        heading: "8. Prestanak korišćenja",
        blocks: [
          "Možete prestati da koristite servis u bilo kom trenutku i sami obrisati nalog u Podešavanjima. Možemo suspendovati ili obrisati naloge koji krše ove uslove ili štete servisu.",
        ],
      },
      {
        heading: "9. Izmene i merodavno pravo",
        blocks: [
          "Ove uslove možemo ažurirati; datum iznad pokazuje poslednju verziju, a o značajnim izmenama obavestićemo vas u aplikaciji ili emailom. Nastavak korišćenja nakon izmene znači da je prihvatate. Na ove uslove primenjuje se pravo Republike Srbije, bez uticaja na obavezna pravila o zaštiti potrošača zemlje u kojoj živite.",
        ],
      },
    ],
  },
};

const de: Record<LegalDocumentKind, LegalDocument> = {
  privacy: {
    title: "Datenschutzerklärung",
    intro:
      "Diese Erklärung beschreibt, welche personenbezogenen Daten GW2 ArcDPS Helper („der Dienst“, „wir“) erhebt, wozu, an wen sie weitergegeben werden und welche Rechte du hast. Der Dienst ist ein kostenloses Open-Source-Hobbyprojekt seines Entwicklers; er ist kein Unternehmen und steht in keiner Verbindung zu ArenaNet, NCSOFT, ArcDPS oder dps.report.",
    sections: [
      {
        heading: "1. Welche Daten wir erheben",
        blocks: [
          "Kontodaten, die du bei der Registrierung angibst:",
          [
            "E-Mail-Adresse — zum Anmelden, zur Bestätigung des Kontos und für Links zum Zurücksetzen des Passworts;",
            "Guild-Wars-2-Account (Name.1234) — wird in der App und in Discord-Nachrichten als deine Identität angezeigt;",
            "Passwort — wird nur als Einweg-Hash (bcrypt) gespeichert, nie im Klartext;",
            "der Zeitpunkt, zu dem du diese Dokumente akzeptiert hast, und wann Bestätigungs- / Reset-E-Mails versendet wurden.",
          ],
          "Optionale Einstellungen: eine Discord-Webhook-URL und ein dps.report-Benutzertoken, wenn du sie in den Einstellungen hinterlegst.",
          "Feedback: was du auf der Feedback-Seite sendest (Kategorie, Titel, Beschreibung), verknüpft mit deinem Konto, wenn du angemeldet bist, oder — als Gast — die E-Mail, die du freiwillig angibst. Außerdem speichern wir einen Einweg-Hash deiner IP-Adresse (nie die Adresse selbst), um zu begrenzen, wie oft Feedback gesendet werden kann. Feedback wird per E-Mail an den Entwickler geschickt.",
          "Logs und Sessions: Zu jedem hochgeladenen Log speichern wir den dps.report-Link und daraus gelesene Daten — Boss, Ergebnis, Dauer, Datum, Spiel-Build, wer es aufgezeichnet hat sowie Charakternamen, Accountnamen und Klassen der Spieler im Squad. Außerdem speichern wir deine Sessions und aktivierte Freigabelinks.",
          "Browserspeicher: Die Website legt dein Anmeldetoken, die Sprache und einige Anzeigeeinstellungen im localStorage deines Browsers ab. Wir verwenden keine Tracking-Cookies, keine Analyse-Tools und keine Werbung.",
          "Technische Daten: Unsere Hosting-Anbieter verarbeiten IP-Adressen und Anfrage-Metadaten, um Website und API bereitzustellen und vor Missbrauch zu schützen.",
        ],
      },
      {
        heading: "2. Wozu wir sie verwenden",
        blocks: [
          "Wir verwenden deine Daten nur, um den Dienst bereitzustellen, für den du dich registriert hast: Speichern und Anzeigen deiner Logs, Clears und Sessions, Versand von Konto-E-Mails, Hochladen von Logs zu dps.report und Posten an deinen Discord-Webhook, wenn du das möchtest, sowie die Sicherheit des Dienstes. Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) und unser berechtigtes Interesse an Sicherheit (Art. 6 Abs. 1 lit. f DSGVO). Wir verkaufen deine Daten nicht und nutzen sie weder für Werbung noch für Profiling.",
        ],
      },
      {
        heading: "3. Empfänger",
        blocks: [
          [
            "dps.report — Logdateien, die du über die Website, den Desktop-Uploader oder das Nexus-Addon hochlädst, werden an dps.report gesendet, das den Bericht unter seinem Link veröffentlicht. Dort gelten die Bedingungen und die Datenschutzerklärung von dps.report.",
            "Discord — wenn du einen Webhook verbindest, wird zu jedem neuen Log eine Zusammenfassung (Boss, Ergebnis, Aufzeichner, Link) in diesem Kanal gepostet.",
            "Infrastruktur-Anbieter — Hosting von Website und API (Vercel), der Host der PostgreSQL-Datenbank und der E-Mail-(SMTP-)Anbieter verarbeiten Daten in unserem Auftrag und nur zum Betrieb des Dienstes.",
            "Alle mit einem Freigabelink — ein freigegebenes Log oder eine freigegebene Session ist für jeden mit dem Link sichtbar, bis du die Freigabe beendest.",
          ],
          "Einige dieser Anbieter können Daten außerhalb Serbiens und der EU/des EWR verarbeiten; sie stützen sich dann auf die gesetzlich vorgeschriebenen Garantien, etwa die EU-Standardvertragsklauseln.",
        ],
      },
      {
        heading: "4. Andere Spieler in deinen Logs",
        blocks: [
          "ArcDPS-Logs enthalten die Charakter- und Accountnamen aller Squad-Mitglieder. Wir zeigen diese Daten nur dir und denen, mit denen du einen Link teilst. Wenn du in einem fremden Log vorkommst und deine Daten entfernt haben möchtest, kontaktiere uns (siehe unten).",
        ],
      },
      {
        heading: "5. Speicherdauer",
        blocks: [
          "Kontodaten, Logs und Sessions werden gespeichert, solange dein Konto besteht. Logs und Sessions kannst du jederzeit selbst löschen. Dein Konto kannst du auch selbst unter Einstellungen → Konto löschen löschen: Das Konto und alle zugehörigen Daten werden sofort gelöscht; Kopien auf Servern und in Backups werden innerhalb von 30 Tagen überschrieben. Bereits auf dps.report veröffentlichte Berichte liegen nicht in unserer Hand.",
        ],
      },
      {
        heading: "6. Deine Rechte",
        blocks: [
          "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch und Datenübertragbarkeit. Außerdem kannst du dich bei einer Datenschutzaufsichtsbehörde beschweren — in der EU bei der Behörde deines Landes, in Serbien beim Beauftragten für Informationen von öffentlicher Bedeutung und den Schutz personenbezogener Daten.",
        ],
      },
      {
        heading: "7. Sicherheit",
        blocks: [
          "Die Verbindung ist per HTTPS verschlüsselt, Passwörter werden gehasht und der Zugriff auf die Datenbank ist beschränkt. Kein System ist vollkommen sicher — verwende daher ein Passwort, das du nirgendwo sonst nutzt.",
        ],
      },
      {
        heading: "8. Kinder",
        blocks: ["Der Dienst richtet sich nicht an Kinder unter 16 Jahren, und wir erheben wissentlich keine Daten von ihnen."],
      },
      {
        heading: "9. Änderungen",
        blocks: [
          "Wenn sich diese Erklärung ändert, aktualisieren wir diese Seite und das Datum oben. Über wesentliche Änderungen informieren wir dich in der App oder per E-Mail.",
        ],
      },
    ],
  },
  terms: {
    title: "Nutzungsbedingungen",
    intro:
      "Diese Bedingungen gelten für die Nutzung von GW2 ArcDPS Helper („der Dienst“, „wir“) — Website, API, Desktop-Uploader und Nexus-Addon. Mit dem Erstellen eines Kontos stimmst du ihnen und der Datenschutzerklärung zu.",
    sections: [
      {
        heading: "1. Der Dienst",
        blocks: [
          "Der Dienst ist ein kostenloses Werkzeug zum Sammeln, Ordnen und Teilen von Guild-Wars-2-ArcDPS-Logs. Er ist ein Hobbyprojekt und wird „wie besehen“ bereitgestellt — Funktionen können sich jederzeit ohne Ankündigung ändern, unterbrochen oder eingestellt werden.",
        ],
      },
      {
        heading: "2. Dein Konto",
        blocks: [
          [
            "Gib eine echte E-Mail-Adresse und deinen eigenen GW2-Account an.",
            "Halte dein Passwort geheim — du bist für alles verantwortlich, was über dein Konto geschieht.",
            "Ein Konto gehört einer Person; sag uns Bescheid, wenn du einen Missbrauch deines Kontos vermutest.",
          ],
        ],
      },
      {
        heading: "3. Zulässige Nutzung",
        blocks: [
          "Du verpflichtest dich, Folgendes zu unterlassen:",
          [
            "Dateien hochzuladen, die keine ArcDPS-Logs sind, oder schädliche bzw. rechtswidrige Inhalte;",
            "auf Daten anderer Nutzer zuzugreifen, Sicherheitsmaßnahmen zu umgehen oder den Dienst zu überlasten (auch durch automatisierte Massenanfragen außerhalb der offiziellen Clients);",
            "den Dienst zu nutzen, um andere Spieler zu belästigen oder bloßzustellen;",
            "den Dienst in einer Weise zu nutzen, die gegen Gesetze oder die Bedingungen von dps.report, Discord oder Guild Wars 2 verstößt.",
          ],
        ],
      },
      {
        heading: "4. Deine Inhalte",
        blocks: [
          "Logs, Sessions und Einstellungen, die du hinzufügst, bleiben deine. Du erlaubst uns, sie zu speichern, zu verarbeiten und anzuzeigen, soweit es für den Betrieb des Dienstes nötig ist — einschließlich des Hochladens von Logdateien zu dps.report und des Postens an den von dir eingerichteten Discord-Webhook. Du bestätigst, dass du berechtigt bist, die Logs hochzuladen.",
        ],
      },
      {
        heading: "5. Dienste Dritter",
        blocks: [
          "Der Dienst arbeitet mit dps.report, Discord, ArcDPS, Nexus und Guild Wars 2 zusammen, für die eigene Bedingungen gelten. Für diese sind wir nicht verantwortlich. Guild Wars 2 ist eine Marke von ArenaNet, LLC und NCSOFT Corporation; der Dienst ist weder mit ihnen verbunden noch von ihnen unterstützt.",
        ],
      },
      {
        heading: "6. Apps zum Herunterladen",
        blocks: [
          "Der Desktop-Uploader und das Nexus-Addon sind Open Source und werden „wie besehen“ bereitgestellt. Die Nutzung von Drittanbieter-Tools mit Guild Wars 2 erfolgt auf eigenes Risiko und unterliegt den Regeln von ArenaNet zu Drittanbieterprogrammen.",
        ],
      },
      {
        heading: "7. Keine Gewährleistung und Haftungsbeschränkung",
        blocks: [
          "Soweit gesetzlich zulässig, wird der Dienst ohne Gewährleistung bereitgestellt, und wir haften nicht für verlorene Daten oder Logs, Ausfälle oder mittelbare Schäden aus der Nutzung. Bewahre eigene Kopien wichtiger Logs auf. Eine Haftung, die gesetzlich nicht beschränkt werden kann, bleibt unberührt.",
        ],
      },
      {
        heading: "8. Beendigung",
        blocks: [
          "Du kannst die Nutzung jederzeit beenden und dein Konto selbst in den Einstellungen löschen. Wir können Konten sperren oder löschen, die gegen diese Bedingungen verstoßen oder dem Dienst schaden.",
        ],
      },
      {
        heading: "9. Änderungen und anwendbares Recht",
        blocks: [
          "Wir können diese Bedingungen aktualisieren; das Datum oben zeigt die aktuelle Fassung, wesentliche Änderungen kündigen wir in der App oder per E-Mail an. Wer den Dienst nach einer Änderung weiter nutzt, akzeptiert sie. Es gilt das Recht der Republik Serbien; zwingende Verbraucherschutzvorschriften deines Wohnsitzlandes bleiben unberührt.",
        ],
      },
    ],
  },
};

export const LEGAL_DOCUMENTS: Record<Language, Record<LegalDocumentKind, LegalDocument>> = { en, sr, de };
