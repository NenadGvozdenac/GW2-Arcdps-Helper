#pragma once

#include <functional>
#include <string>

struct Settings
{
	std::string logFolder;
	std::string dpsReportToken;
	bool autoUpload = true;  // pick up every new log from the ArcDPS folder
	bool showAlerts = true;  // Nexus alert when a log was uploaded / failed
	bool showWindow = true;

	// Sign-in (the JWT is stored DPAPI-encrypted on disk)
	std::string token;
	std::string email;
	std::string gw2Account;
};

/** settings.json in <GW2>/addons/GW2ArcDPSHelper. Thread-safe. */
namespace Config
{
	void Load(const std::wstring& addonDir);
	Settings Get();
	/** Applies a change and saves to disk. */
	void Update(const std::function<void(Settings&)>& change);
}
