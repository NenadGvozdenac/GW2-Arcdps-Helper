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
		bool skipped = false; // not saved on purpose: an empty log from the ArcDPS bug, and the user skips those
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

	/** A "Sign in with the browser" request: the website approves it, the addon polls it with the secret. */
	struct AppLogin
	{
		std::string id;
		std::string secret; // never leaves the addon; the website link only carries the id
		std::string code;   // shown here and on the website, so the user can check they approve this addon
	};

	struct AppLoginPoll
	{
		std::string status; // pending, approved, denied, expired
		std::string token;  // approved only
		User user;          // approved only
	};

	bool CreateAppLogin(AppLogin& out, Error& err);
	bool PollAppLogin(const AppLogin& request, AppLoginPoll& out, Error& err);
	bool Me(const std::string& token, User& user, Error& err);
	/** Imports one dps.report link; with a sessionId the log is attached to that session. */
	bool SubmitLog(const std::string& token, const std::string& permalink, const std::string& sessionId, SubmitResult& out, Error& err);

	bool GetActiveSession(const std::string& token, std::optional<Session>& out, Error& err);
	bool StartSession(const std::string& token, const std::string& name, Session& out, Error& err);
	bool RenameSession(const std::string& token, const std::string& id, const std::string& name, Session& out, Error& err);
	bool EndSession(const std::string& token, const std::string& id, Error& err);

	bool GetWeeklyClears(const std::string& token, WeeklyClears& out, Error& err);

	/**
	 * Feedback to the developer (saved and emailed). category: addon, uploader, website or other. With a token it is
	 * linked to the account; without one (signed out) contactEmail may say where to answer.
	 */
	bool SendFeedback(const std::string& token, const std::string& category, const std::string& title,
		const std::string& description, const std::string& contactEmail, Error& err);
}
