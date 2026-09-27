#pragma once

#include <optional>
#include <string>

// Clients for dps.report and the GW2 ArcDPS Helper backend (same endpoints the desktop uploader uses).
namespace Api
{
	struct Error
	{
		std::string code;    // e.g. NETWORK_ERROR, DPS_REPORT_FAILED, SESSION_NOT_FOUND, UNAUTHORIZED
		std::string message;
		int status = 0;

		/** Network failures and 5xx; the service's own rejections (e.g. "log too short") are final. */
		bool Retryable() const { return code == "NETWORK_ERROR" || status >= 500; }
	};

	struct DpsReportLog
	{
		std::string permalink;
		std::string boss;
		std::optional<bool> success;
		bool isCM = false;
		int64_t durationMs = 0;
	};

	struct User
	{
		std::string email;
		std::string gw2Account;
		std::string dpsReportToken; // set on the website (Profile); empty = anonymous uploads
	};

	struct Session
	{
		std::string id;
		std::string name;
		std::string startedAt; // ISO
	};

	struct SubmitResult
	{
		std::string boss;
		std::optional<bool> success;
		bool isCM = false;
		bool duplicate = false;
	};

	bool UploadToDpsReport(const std::wstring& filePath, const std::string& userToken, DpsReportLog& out, Error& err);

	bool Login(const std::string& email, const std::string& password, std::string& token, User& user, Error& err);
	bool Me(const std::string& token, User& user, Error& err);
	/** Only moves a token saved by an older version to the account; it is edited on the website. */
	bool SetDpsReportToken(const std::string& token, const std::string& dpsReportToken, User& user, Error& err);

	/** Imports one dps.report link; with a sessionId the log is attached to that session. */
	bool SubmitLog(const std::string& token, const std::string& permalink, const std::string& sessionId, SubmitResult& out, Error& err);

	bool GetActiveSession(const std::string& token, std::optional<Session>& out, Error& err);
	bool StartSession(const std::string& token, const std::string& name, Session& out, Error& err);
	bool EndSession(const std::string& token, const std::string& id, Error& err);
}
