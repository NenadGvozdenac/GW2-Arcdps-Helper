#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

enum class Stage { Queued, Waiting, Uploading, Syncing, Done, Failed };

struct Upload
{
	uint64_t id = 0;
	std::wstring path;
	std::string fileName;
	int64_t detectedAt = 0; // unix ms

	Stage stage = Stage::Queued;
	std::string error;

	std::string permalink;
	std::string boss;
	std::optional<bool> success;
	bool isCM = false;
	int64_t durationMs = 0;

	std::string sessionId; // session that was recording when the log appeared
	bool synced = false;   // saved to GW2 ArcDPS Helper (false = dps.report only, e.g. not signed in)
};

/**
 * Upload pipeline on one worker thread (one log at a time keeps dps.report happy and the order stable):
 * wait until ArcDPS finished writing -> dps.report (3 attempts) -> GW2 ArcDPS Helper (when signed in).
 * History is kept in uploads.json.
 */
namespace Uploads
{
	void Start(const std::wstring& addonDir);
	void Stop();

	void Enqueue(const std::wstring& path, bool waitForFile = true);
	void ClearFinished();

	std::vector<Upload> Snapshot();
	bool HasPending(const std::string& sessionId);
	size_t PendingCount();
}
