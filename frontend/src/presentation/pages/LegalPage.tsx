import { Link } from "react-router-dom";
import { useI18n } from "../../controllers/I18nController";
import { LEGAL_DOCUMENTS, LEGAL_LAST_UPDATED, type LegalDocumentKind } from "../../domain/data/legal";
import { LEGAL_CONTACT_URL } from "../../config/constants";
import { localeFor } from "../../i18n/translate";
import { Card, CardContent } from "@/presentation/components/ui/card";
import PageHeader from "../components/PageHeader";

const OTHER: Record<LegalDocumentKind, { kind: LegalDocumentKind; path: string }> = {
  privacy: { kind: "terms", path: "/terms" },
  terms: { kind: "privacy", path: "/privacy" },
};

/** Privacy Policy (/privacy) or Terms of Service (/terms) — public, linked from registration and the landing page. */
export default function LegalPage({ kind }: { kind: LegalDocumentKind }) {
  const { lang, t } = useI18n();
  const docs = LEGAL_DOCUMENTS[lang];
  const doc = docs[kind];
  const other = OTHER[kind];
  const updated = new Date(`${LEGAL_LAST_UPDATED}T12:00:00`).toLocaleDateString(localeFor(lang), { dateStyle: "long" });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title={doc.title} description={t("legal.lastUpdated", { date: updated })} />
      <Card>
        <CardContent className="flex flex-col gap-6 text-sm leading-relaxed">
          <p className="text-pretty">{doc.intro}</p>
          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold">{section.heading}</h2>
              {section.blocks.map((block, i) =>
                typeof block === "string" ? (
                  <p key={i} className="text-pretty text-muted-foreground">
                    {block}
                  </p>
                ) : (
                  <ul key={i} className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {block.map((item) => (
                      <li key={item} className="text-pretty">
                        {item}
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </section>
          ))}
          <section className="space-y-2">
            <h2 className="text-base font-semibold">{t("legal.contactTitle")}</h2>
            <p className="text-pretty text-muted-foreground">
              {t("legal.contactBody")}{" "}
              <a
                href={LEGAL_CONTACT_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                {t("legal.contactLink")}
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
      <Link to={other.path} className="self-start text-sm font-medium underline-offset-4 hover:underline">
        {docs[other.kind].title} →
      </Link>
    </div>
  );
}
