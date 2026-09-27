#pragma once

#include <functional>
#include <string>

/**
 * Watches the ArcDPS log folder recursively (ArcDPS uses one sub-folder per boss) on its own thread and reports
 * each new .zevtc / .evtc / .evtc.zip once.
 */
namespace Watcher
{
	using Callback = std::function<void(const std::wstring& filePath)>;

	/** Returns false when the folder cannot be opened. Restarts if already running. */
	bool Start(const std::string& folder, Callback onNewFile);
	void Stop();
	bool IsRunning();

	bool IsLogFile(const std::wstring& path);
}
