#include "updater.h"

#include <cstdio>
#include <cstring>
#include <mutex>
#include <thread>
#include <tuple>
#include <utility>

#include "nlohmann/json.hpp"

#include "globals.h"
#include "http.h"

using json = nlohmann::json;

namespace
{
#ifdef UPDATER_TEST_URL // smoke tests point this at a local fake of the GitHub API
	constexpr const char* RELEASES_API_URL = UPDATER_TEST_URL;
#else
	constexpr const char* RELEASES_API_URL = "https://api.github.com/repos/NenadGvozdenac/GW2-Arcdps-Helper/releases?per_page=30";
#endif
	constexpr const char* TAG_PREFIX = "addon-v";

	std::thread g_thread;
	std::mutex g_mutex;
	std::string g_updateUrl;

	using Version = std::tuple<int, int, int>;

	bool ParseVersion(const std::string& text, Version& out)
	{
		int major = 0, minor = 0, patch = 0;
		char rest = 0;
		if (sscanf_s(text.c_str(), "%d.%d.%d%c", &major, &minor, &patch, &rest, 1) != 3) return false;
		out = { major, minor, patch };
		return true;
	}

	std::string Format(const Version& v)
	{
		return std::to_string(std::get<0>(v)) + "." + std::to_string(std::get<1>(v)) + "." + std::to_string(std::get<2>(v));
	}

	void Check(Version current)
	{
		Http::Request req;
		req.url = RELEASES_API_URL;
		req.timeoutMs = 30000;
		req.headers.push_back({ "Accept", "application/vnd.github+json" });
		Http::Response res = Http::Send(req);
		if (!res.networkError.empty() || res.status != 200)
		{
			LogWarn("Update check failed: " + (res.networkError.empty() ? "GitHub returned " + std::to_string(res.status) : res.networkError));
			return;
		}

		json releases = json::parse(res.body, nullptr, false);
		if (!releases.is_array()) return;

		// Newest first: the first published addon release with a DLL is the latest one.
		for (const json& r : releases)
		{
			if (!r.is_object() || r.value("draft", false) || r.value("prerelease", false)) continue;
			std::string tag = r.value("tag_name", "");
			Version latest;
			if (tag.rfind(TAG_PREFIX, 0) != 0 || !ParseVersion(tag.substr(strlen(TAG_PREFIX)), latest)) continue;

			std::string url;
			for (const json& a : r.value("assets", json::array()))
			{
				std::string name = a.value("name", "");
				if (name.size() > 4 && _stricmp(name.c_str() + name.size() - 4, ".dll") == 0) url = a.value("browser_download_url", "");
			}
			if (url.empty()) continue;

			if (latest > current)
			{
				LogInfo("Update available: " + Format(current) + " -> " + Format(latest));
				Alert(std::string(ADDON_NAME) + " " + Format(latest) + " is available - Nexus is downloading it.");
				std::lock_guard lock(g_mutex);
				g_updateUrl = url;
			}
			else
			{
				LogInfo("Up to date (" + Format(current) + ")");
			}
			return;
		}
		LogInfo("No addon release published yet");
	}
}

namespace Updater
{
	void Start(AddonVersion_t current)
	{
		Version v{ current.Major, current.Minor, current.Build };
		if (v == Version{ 0, 0, 0 }) return; // local build
		g_thread = std::thread([v] {
			try
			{
				Check(v);
			}
			catch (const std::exception& e)
			{
				LogWarn(std::string("Update check failed: ") + e.what());
			}
		});
	}

	void Stop()
	{
		if (g_thread.joinable()) g_thread.join();
	}

	std::string TakeUpdateUrl()
	{
		std::lock_guard lock(g_mutex);
		return std::exchange(g_updateUrl, std::string());
	}
}
