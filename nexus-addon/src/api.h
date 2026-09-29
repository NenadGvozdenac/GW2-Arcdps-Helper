#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

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
		std::string category; // raid, fractal, strike, other
		std::optional<bool> success;
		bool isCM = false;
		bool duplicate = false;
	};

	struct ClearBoss
	{
		std::string name;
		bool cleared = false; // killed since the weekly reset
	};

	struct ClearGroup
	{
		std::string category;  // raid or strike
		std::string shortName; // W1, VoE, IBS, ...
		std::string name;
		std::vector<ClearBoss> bosses;
	};

	/** Raid and strike bosses killed since the weekly reset (Monday 07:30 UTC), from every source (addon, uploader, website). */
	struct WeeklyClears
	{
		int64_t nextResetMs = 0;
		std::vector<ClearGroup> groups;
	};

	bool UploadToDpsReport(const std::wstring& filePath, const std::string& userToken, DpsReportLog& out, Error& err);

	bool Login(const std::string& email, const std::string& password, std::string& token, User& user, Error& err);
	bool Me(const std::string& token, User& user, Error& err);
	/** Imports one dps.report link; with a sessionId the log is attached to that session. */
	bool SubmitLog(const std::string& token, const std::string& permalink, const std::string& sessionId, SubmitResult& out, Error& err);

	bool GetActiveSession(const std::string& token, std::optional<Session>& out, Error& err);
	bool StartSession(const std::string& token, const std::string& name, Session& out, Error& err);
	bool RenameSession(const std::string& token, const std::string& id, const std::string& name, Session& out, Error& err);
	bool EndSession(const std::string& token, const std::string& id, Error& err);

	bool GetWeeklyClears(const std::string& token, WeeklyClears& out, Error& err);
}
