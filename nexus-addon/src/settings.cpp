#include "settings.h"

#include <mutex>

#include "nlohmann/json.hpp"

#include "globals.h"
#include "util.h"

using json = nlohmann::json;

namespace
{
	std::mutex g_mutex;
	Settings g_settings;
	std::wstring g_path;

	void SaveLocked()
	{
		json j = {
			{ "logFolder", g_settings.logFolder },
			{ "dpsReportToken", g_settings.dpsReportToken },
			{ "autoUpload", g_settings.autoUpload },
			{ "showAlerts", g_settings.showAlerts },
			{ "showWindow", g_settings.showWindow },
			{ "email", g_settings.email },
			{ "gw2Account", g_settings.gw2Account },
			{ "token", Util::Protect(g_settings.token) },
		};
		if (!Util::WriteFileAtomic(g_path, j.dump(2))) LogWarn("Could not save settings.json");
	}
}

namespace Config
{
	void Load(const std::wstring& addonDir)
	{
		std::lock_guard lock(g_mutex);
		CreateDirectoryW(addonDir.c_str(), nullptr);
		g_path = addonDir + L"\\settings.json";

		Settings s;
		s.logFolder = Util::DefaultLogFolder();

		std::string text;
		if (Util::ReadFile(g_path, text))
		{
			json j = json::parse(text, nullptr, false);
			if (j.is_object())
			{
				s.logFolder = j.value("logFolder", s.logFolder);
				s.dpsReportToken = j.value("dpsReportToken", "");
				s.autoUpload = j.value("autoUpload", true);
				s.showAlerts = j.value("showAlerts", true);
				s.showWindow = j.value("showWindow", true);
				s.email = j.value("email", "");
				s.gw2Account = j.value("gw2Account", "");
				// Fails when copied to another Windows account: then the user simply signs in again.
				s.token = Util::Unprotect(j.value("token", ""));
			}
		}
		if (s.logFolder.empty()) s.logFolder = Util::DefaultLogFolder();
		g_settings = s;
	}

	Settings Get()
	{
		std::lock_guard lock(g_mutex);
		return g_settings;
	}

	void Update(const std::function<void(Settings&)>& change)
	{
		std::lock_guard lock(g_mutex);
		change(g_settings);
		SaveLocked();
	}
}
