import { useI18n } from "../../controllers/I18nController";
import PageHeader from "../components/PageHeader";
import UploadBox from "../components/UploadBox";

export default function UploadPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={t("upload.pageTitle")}
        description={
          <>
            {t("upload.pageIntroBefore")}{" "}
            <a href="https://dps.report" target="_blank" rel="noreferrer" className="font-medium text-foreground underline underline-offset-4">
              dps.report
            </a>{" "}
            {t("upload.pageIntroAfter")}
          </>
        }
      />
      <UploadBox />
    </div>
  );
}
