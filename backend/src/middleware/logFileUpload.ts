import multer from "multer";
import { LOG_FILE_EXTENSIONS, MAX_LOG_FILE_BYTES } from "../config/constants";
import { invalidLogFile } from "../utils/httpError";

/**
 * Accepts one ArcDPS log file in the multipart field "file", kept in memory (it is forwarded to dps.report
 * right away, never written to disk). Too-large files and multer's own errors are mapped in errorHandler.
 */
export const logFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOG_FILE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    if (LOG_FILE_EXTENSIONS.some((ext) => name.endsWith(ext))) cb(null, true);
    else cb(invalidLogFile());
  },
}).single("file");
