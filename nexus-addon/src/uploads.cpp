#include "uploads.h"

#include <windows.h>

#include <algorithm>
#include <condition_variable>
#include <deque>
#include <mutex>
#include <thread>

#include "nlohmann/json.hpp"

#include "account.h"
#include "api.h"
#include "globals.h"
#include "settings.h"
#include "util.h"

using json = nlohmann::json;

namespace
{
	constexpr int DPS_REPORT_ATTEMPTS = 3;
	constexpr int64_t FILE_STABLE_MS = 2000;
	constexpr int64_t FILE_WAIT_TIMEOUT_MS = 120000;
	constexpr size_t MAX_KEPT = 50;

	struct Job
	{
		uint64_t id;
		bool waitForFile;
	};

	std::mutex g_mutex;
	std::condition_variable g_cv;
	std::vector<Upload> g_uploads; // newest first
	std::deque<Job> g_queue;
	uint64_t g_nextId = 1;
	bool g_stop = false;
	std::thread g_worker;
	std::wstring g_historyPath;

	bool IsPending(const Upload& u)
	{
		return u.stage != Stage::Done && u.stage != Stage::Failed;
	}

	/** Sleeps unless Stop() is called first; returns false when stopping. */
	bool SleepOrStop(int64_t ms)
	{
		std::unique_lock lock(g_mutex);
		return !g_cv.wait_for(lock, std::chrono::milliseconds(ms), [] { return g_stop; });
	}

	bool Stopping()
	{
		std::lock_guard lock(g_mutex);
		return g_stop;
	}

	std::optional<Upload> Find(uint64_t id)
	{
		std::lock_guard lock(g_mutex);
		for (const auto& u : g_uploads) if (u.id == id) return u;
		return std::nullopt;
	}

	void SaveLocked()
	{
		json list = json::array();
		for (const auto& u : g_uploads)
		{
			if (IsPending(u) || list.size() >= MAX_KEPT) continue;
			list.push_back({
				{ "path", Util::Narrow(u.path) }, { "fileName", u.fileName }, { "detectedAt", u.detectedAt },
				{ "failed", u.stage == Stage::Failed }, { "error", u.error }, { "permalink", u.permalink },
				{ "boss", u.boss }, { "success", u.success ? json(*u.success) : json(nullptr) }, { "isCM", u.isCM },
				{ "durationMs", u.durationMs }, { "sessionId", u.sessionId }, { "synced", u.synced },
			});
		}
		Util::WriteFileAtomic(g_historyPath, list.dump());
	}

	void LoadLocked()
	{
		std::string text;
		if (!Util::ReadFile(g_historyPath, text)) return;
		json list = json::parse(text, nullptr, false);
		if (!list.is_array()) return;
		for (const auto& j : list)
		{
			if (!j.is_object()) continue;
			Upload u;
			u.id = g_nextId++;
			u.path = Util::Widen(j.value("path", ""));
			u.fileName = j.value("fileName", "");
			u.detectedAt = j.value("detectedAt", (int64_t)0);
			u.stage = j.value("failed", false) ? Stage::Failed : Stage::Done;
			u.error = j.value("error", "");
			u.permalink = j.value("permalink", "");
			u.boss = j.value("boss", "");
			if (j.contains("success") && j["success"].is_boolean()) u.success = j["success"].get<bool>();
			u.isCM = j.value("isCM", false);
			u.durationMs = j.value("durationMs", (int64_t)0);
			u.sessionId = j.value("sessionId", "");
			u.synced = j.value("synced", false);
			g_uploads.push_back(std::move(u));
		}
	}

	template <typename F>
	void Modify(uint64_t id, F&& change)
	{
		std::lock_guard lock(g_mutex);
		for (auto& u : g_uploads)
		{
			if (u.id != id) continue;
			change(u);
			if (!IsPending(u)) SaveLocked();
			return;
		}
	}

	void Remove(uint64_t id)
	{
		std::lock_guard lock(g_mutex);
		g_uploads.erase(std::remove_if(g_uploads.begin(), g_uploads.end(), [&](const Upload& u) { return u.id == id; }), g_uploads.end());
		SaveLocked();
	}

	void Fail(uint64_t id, const std::string& error)
	{
		Modify(id, [&](Upload& u) { u.stage = Stage::Failed; u.error = error; });
		auto u = Find(id);
		LogWarn("Upload failed: " + (u ? u->fileName : "") + ": " + error);
	}

	/** Waits until the file size stops changing (ArcDPS finished writing and compressing). */
	bool WaitUntilWritten(const std::wstring& path, std::string& error)
	{
		int64_t deadline = Util::NowMs() + FILE_WAIT_TIMEOUT_MS;
		int64_t lastSize = -1, stableSince = 0;
		while (Util::NowMs() < deadline)
		{
			WIN32_FILE_ATTRIBUTE_DATA data{};
			if (!GetFileAttributesExW(path.c_str(), GetFileExInfoStandard, &data))
			{
				error = "The log file disappeared.";
				return false;
			}
			int64_t size = ((int64_t)data.nFileSizeHigh << 32) | data.nFileSizeLow;
			if (size > 0 && size == lastSize)
			{
				if (Util::NowMs() - stableSince >= FILE_STABLE_MS) return true;
			}
			else
			{
				lastSize = size;
				stableSince = Util::NowMs();
			}
			if (!SleepOrStop(500))
			{
				error = "Interrupted";
				return false;
			}
		}
		error = "Timed out waiting for ArcDPS to finish writing the log.";
		return false;
	}

	bool UploadToDpsReport(uint64_t id, const std::wstring& path)
	{
		Modify(id, [](Upload& u) { u.stage = Stage::Uploading; u.error.clear(); });
		// Stored on the account (website); read fresh for every log.
		std::string userToken = Account::CurrentDpsReportToken();

		for (int attempt = 1;; attempt++)
		{
			Api::DpsReportLog log;
			Api::Error err;
			if (Api::UploadToDpsReport(path, userToken, log, err))
			{
				Modify(id, [&](Upload& u) {
					u.permalink = log.permalink;
					u.boss = log.boss;
					u.success = log.success;
					u.isCM = log.isCM;
					u.durationMs = log.durationMs;
				});
				LogInfo("Uploaded to dps.report: " + log.permalink);
				return true;
			}
			if (attempt >= DPS_REPORT_ATTEMPTS || !err.Retryable() || Stopping())
			{
				Fail(id, err.message);
				return false;
			}
			LogWarn("dps.report attempt " + std::to_string(attempt) + " failed, retrying: " + err.message);
			if (!SleepOrStop(5000ll * attempt))
			{
				Fail(id, "Interrupted");
				return false;
			}
		}
	}

	/**
	 * Sends the permalink to GW2 ArcDPS Helper, which fetches the full log and stores it for the web app.
	 * Returns false when it failed, or when the backend skipped the log (an empty log from the ArcDPS bug) — that
	 * entry is removed from the list, so no "uploaded" alert is shown for it.
	 */
	bool SyncToWeb(uint64_t id, const std::string& permalink, const std::string& sessionId)
	{
		Settings s = Config::Get();
		if (s.token.empty()) return true; // not signed in: dps.report only

		Modify(id, [](Upload& u) { u.stage = Stage::Syncing; u.error.clear(); });
		Api::SubmitResult result;
		Api::Error err;
		bool ok = Api::SubmitLog(s.token, permalink, sessionId, result, err);
		// The session was deleted on the website meanwhile: save the log without it.
		if (!ok && err.code == "SESSION_NOT_FOUND") ok = Api::SubmitLog(s.token, permalink, "", result, err);

		if (!ok)
		{
			if (err.code == "UNAUTHORIZED")
			{
				Account::HandleUnauthorized();
				Fail(id, "Your sign-in expired. Sign in again (Nexus options) and retry.");
			}
			else
			{
				Fail(id, err.message);
			}
			return false;
		}
		if (result.skipped)
		{
			LogInfo("Skipped empty log: " + permalink);
			Remove(id);
			return false;
		}
		Modify(id, [&](Upload& u) {
			u.synced = true;
			if (!result.boss.empty()) u.boss = result.boss;
			if (result.success) u.success = result.success;
			u.isCM = result.isCM;
		});
		if (result.success.value_or(false) && (result.category == "raid" || result.category == "strike")) Account::RefreshClears();
		return true;
	}

	void Process(const Job& job)
	{
		auto entry = Find(job.id);
		if (!entry) return;

		if (entry->permalink.empty())
		{
			if (job.waitForFile)
			{
				Modify(job.id, [](Upload& u) { u.stage = Stage::Waiting; });
				std::string error;
				if (!WaitUntilWritten(entry->path, error)) return Fail(job.id, error);
			}
			if (!UploadToDpsReport(job.id, entry->path)) return;
			entry = Find(job.id);
			if (!entry) return;
		}

		if (!SyncToWeb(job.id, entry->permalink, entry->sessionId)) return;

		Modify(job.id, [](Upload& u) { u.stage = Stage::Done; });
		if (auto u = Find(job.id); u && Config::Get().showAlerts)
		{
			std::string result = !u->success ? "" : *u->success ? " - Kill" : " - Wipe";
			Alert((u->boss.empty() ? u->fileName : u->boss) + result + " uploaded");
		}
	}

	void WorkerLoop()
	{
		for (;;)
		{
			Job job{};
			{
				std::unique_lock lock(g_mutex);
				g_cv.wait(lock, [] { return g_stop || !g_queue.empty(); });
				if (g_stop) return;
				job = g_queue.front();
				g_queue.pop_front();
			}
			try
			{
				Process(job);
			}
			catch (const std::exception& e)
			{
				Fail(job.id, e.what());
			}
		}
	}
}

namespace Uploads
{
	void Start(const std::wstring& addonDir)
	{
		{
			std::lock_guard lock(g_mutex);
			g_historyPath = addonDir + L"\\uploads.json";
			g_uploads.clear();
			g_queue.clear();
			g_stop = false;
			LoadLocked();
		}
		g_worker = std::thread(WorkerLoop);
	}

	void Stop()
	{
		{
			std::lock_guard lock(g_mutex);
			g_stop = true;
		}
		g_cv.notify_all();
		if (g_worker.joinable()) g_worker.join();
	}

	void Enqueue(const std::wstring& path, bool waitForFile)
	{
		Upload u;
		u.path = path;
		u.fileName = Util::Narrow(path.substr(path.find_last_of(L"\\/") + 1));
		u.detectedAt = Util::NowMs();
		u.sessionId = Account::ActiveSessionId();
		{
			std::lock_guard lock(g_mutex);
			u.id = g_nextId++;
			g_queue.push_back({ u.id, waitForFile });
			g_uploads.insert(g_uploads.begin(), std::move(u));
		}
		g_cv.notify_all();
	}

	void ClearFinished()
	{
		std::lock_guard lock(g_mutex);
		g_uploads.erase(std::remove_if(g_uploads.begin(), g_uploads.end(), [](const Upload& u) { return !IsPending(u); }), g_uploads.end());
		SaveLocked();
	}

	std::vector<Upload> Snapshot()
	{
		std::lock_guard lock(g_mutex);
		return g_uploads;
	}

	bool HasPending(const std::string& sessionId)
	{
		std::lock_guard lock(g_mutex);
		return std::any_of(g_uploads.begin(), g_uploads.end(), [&](const Upload& u) { return u.sessionId == sessionId && IsPending(u); });
	}

	size_t PendingCount()
	{
		std::lock_guard lock(g_mutex);
		return std::count_if(g_uploads.begin(), g_uploads.end(), IsPending);
	}
}
