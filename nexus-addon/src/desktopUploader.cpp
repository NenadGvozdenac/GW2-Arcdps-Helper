#include "desktopUploader.h"

#include <windows.h>
#include <tlhelp32.h>

#include <atomic>
#include <cwctype>
#include <string>
#include <thread>

#include "globals.h"
#include "settings.h"

namespace
{
	constexpr DWORD CHECK_INTERVAL_MS = 5000;

	std::thread g_thread;
	HANDLE g_stopEvent = nullptr;
	std::atomic<bool> g_running{ false };

	/**
	 * Installed: "GW2 ArcDPS Helper Uploader.exe". Portable: "GW2 ArcDPS Helper Uploader-Portable-0.1.0.exe", saved
	 * from GitHub as "GW2.ArcDPS.Helper.Uploader-Portable-0.1.0.exe". Compared without spaces / dots, ignoring case.
	 */
	bool IsUploaderExe(const wchar_t* exeName)
	{
		std::wstring name;
		for (const wchar_t* c = exeName; *c; c++)
		{
			if (*c != L' ' && *c != L'.') name += (wchar_t)std::towlower(*c);
		}
		return name.rfind(L"gw2arcdpshelperuploader", 0) == 0;
	}

	bool Scan()
	{
		HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
		if (snapshot == INVALID_HANDLE_VALUE) return false;
		PROCESSENTRY32W entry{};
		entry.dwSize = sizeof(entry);
		bool found = false;
		for (BOOL ok = Process32FirstW(snapshot, &entry); ok && !found; ok = Process32NextW(snapshot, &entry))
		{
			found = IsUploaderExe(entry.szExeFile);
		}
		CloseHandle(snapshot);
		return found;
	}

	void Loop(HANDLE stopEvent)
	{
		do
		{
			bool running = Scan();
			bool was = g_running.exchange(running);
			if (running && !was)
			{
				LogWarn("The desktop uploader is running");
				if (Config::Get().autoUpload) Alert("Close the GW2 ArcDPS Helper desktop uploader - with both running, every log is uploaded twice.");
			}
		} while (WaitForSingleObject(stopEvent, CHECK_INTERVAL_MS) == WAIT_TIMEOUT);
	}
}

namespace DesktopUploader
{
	void Start()
	{
		g_stopEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
		g_thread = std::thread(Loop, g_stopEvent);
	}

	void Stop()
	{
		if (g_thread.joinable())
		{
			SetEvent(g_stopEvent);
			g_thread.join();
		}
		if (g_stopEvent) CloseHandle(g_stopEvent);
		g_stopEvent = nullptr;
		g_running = false;
	}

	bool IsRunning()
	{
		return g_running;
	}
}
