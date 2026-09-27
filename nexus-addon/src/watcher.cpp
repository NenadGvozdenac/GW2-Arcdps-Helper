#include "watcher.h"

#include <windows.h>

#include <algorithm>
#include <atomic>
#include <cwctype>
#include <set>
#include <thread>
#include <vector>

#include "globals.h"
#include "util.h"

namespace
{
	std::thread g_thread;
	HANDLE g_stopEvent = nullptr;
	HANDLE g_dir = INVALID_HANDLE_VALUE;
	std::atomic<bool> g_alive{ false }; // false once the thread gave up (e.g. the folder was deleted)

	bool EndsWith(const std::wstring& s, const std::wstring& suffix)
	{
		return s.size() >= suffix.size() && s.compare(s.size() - suffix.size(), suffix.size(), suffix) == 0;
	}

	void Run(std::wstring folder, HANDLE dir, HANDLE stopEvent, Watcher::Callback onNewFile)
	{
		std::set<std::wstring> seen;
		std::vector<BYTE> buffer(64 * 1024);
		OVERLAPPED ov{};
		ov.hEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);

		for (;;)
		{
			ResetEvent(ov.hEvent);
			if (!ReadDirectoryChangesW(dir, buffer.data(), (DWORD)buffer.size(), TRUE, FILE_NOTIFY_CHANGE_FILE_NAME, nullptr, &ov, nullptr))
			{
				LogWarn("ReadDirectoryChangesW failed (" + std::to_string(GetLastError()) + "), stopped watching");
				break;
			}

			HANDLE handles[] = { ov.hEvent, stopEvent };
			DWORD wait = WaitForMultipleObjects(2, handles, FALSE, INFINITE);
			if (wait != WAIT_OBJECT_0)
			{
				CancelIoEx(dir, &ov);
				DWORD ignored;
				GetOverlappedResult(dir, &ov, &ignored, TRUE);
				break;
			}

			DWORD bytes = 0;
			if (!GetOverlappedResult(dir, &ov, &bytes, FALSE)) break;
			if (bytes == 0) continue; // buffer overflow: changes were lost, keep watching

			for (auto* info = (FILE_NOTIFY_INFORMATION*)buffer.data();;)
			{
				if (info->Action == FILE_ACTION_ADDED || info->Action == FILE_ACTION_RENAMED_NEW_NAME)
				{
					std::wstring path = folder + L"\\" + std::wstring(info->FileName, info->FileNameLength / sizeof(WCHAR));
					if (Watcher::IsLogFile(path) && seen.insert(path).second)
					{
						LogInfo("New log file: " + Util::Narrow(path));
						onNewFile(path);
					}
				}
				if (!info->NextEntryOffset) break;
				info = (FILE_NOTIFY_INFORMATION*)((BYTE*)info + info->NextEntryOffset);
			}
		}
		CloseHandle(ov.hEvent);
		g_alive = false;
	}
}

namespace Watcher
{
	bool Start(const std::string& folder, Callback onNewFile)
	{
		Stop();
		std::wstring wfolder = Util::Widen(folder);
		while (!wfolder.empty() && (wfolder.back() == L'\\' || wfolder.back() == L'/')) wfolder.pop_back();

		g_dir = CreateFileW(wfolder.c_str(), FILE_LIST_DIRECTORY, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr,
			OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, nullptr);
		if (g_dir == INVALID_HANDLE_VALUE) return false;

		g_stopEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
		g_alive = true;
		g_thread = std::thread(Run, wfolder, g_dir, g_stopEvent, std::move(onNewFile));
		LogInfo("Watching " + folder);
		return true;
	}

	void Stop()
	{
		if (g_thread.joinable())
		{
			SetEvent(g_stopEvent);
			g_thread.join();
		}
		if (g_stopEvent) CloseHandle(g_stopEvent);
		if (g_dir != INVALID_HANDLE_VALUE) CloseHandle(g_dir);
		g_stopEvent = nullptr;
		g_dir = INVALID_HANDLE_VALUE;
	}

	bool IsRunning()
	{
		return g_alive;
	}

	bool IsLogFile(const std::wstring& path)
	{
		std::wstring lower = path;
		std::transform(lower.begin(), lower.end(), lower.begin(), [](wchar_t c) { return (wchar_t)std::towlower(c); });
		return EndsWith(lower, L".zevtc") || EndsWith(lower, L".evtc") || EndsWith(lower, L".evtc.zip");
	}
}
