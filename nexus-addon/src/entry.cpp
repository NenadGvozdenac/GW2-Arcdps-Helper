// Nexus addon: uploads new ArcDPS logs to dps.report and GW2 ArcDPS Helper, and records sessions, from inside the game.

#include <windows.h>

#include <mutex>
#include <string>
#include <vector>

#include "imgui/imgui.h"

#include "account.h"
#include "desktopUploader.h"
#include "globals.h"
#include "http.h"
#include "resource.h"
#include "settings.h"
#include "ui.h"
#include "uploads.h"
#include "util.h"
#include "watcher.h"

// Release builds get the version from the vX.Y.Z tag (CMake -DADDON_VERSION=X.Y.Z); local builds are 0.0.0.
#ifndef ADDON_VERSION_MAJOR
#define ADDON_VERSION_MAJOR 0
#define ADDON_VERSION_MINOR 0
#define ADDON_VERSION_PATCH 0
#endif

AddonAPI_t* APIDefs = nullptr;
HMODULE hSelf = nullptr;
NexusLinkData_t* NexusLink = nullptr;

namespace
{
	constexpr const char* KB_TOGGLE_WINDOW = "KB_GW2ARCDPSHELPER_TOGGLE";
	constexpr const char* KB_TOGGLE_RECORDING = "KB_GW2ARCDPSHELPER_RECORD";
	constexpr const char* QA_SHORTCUT = "QA_GW2ARCDPSHELPER";
	constexpr const char* TEX_ICON = "TEX_GW2ARCDPSHELPER_ICON";
	constexpr const char* TEX_ICON_HOVER = "TEX_GW2ARCDPSHELPER_ICON_HOVER";

	AddonDefinition_t AddonDef{};

	// Alerts raised on worker threads are shown from the render thread.
	std::mutex g_alertMutex;
	std::vector<std::string> g_alerts;

	void OnKeybind(const char* identifier, bool isRelease)
	{
		if (isRelease) return;
		std::string id = identifier;
		if (id == KB_TOGGLE_WINDOW)
		{
			UI::ShowWindow = !UI::ShowWindow;
			Config::Update([](Settings& s) { s.showWindow = UI::ShowWindow; });
		}
		else if (id == KB_TOGGLE_RECORDING)
		{
			AccountState acc = Account::Get();
			if (!acc.signedIn || acc.busy) return;
			if (acc.recording)
			{
				Account::StopRecording();
			}
			else
			{
				Config::Update([](Settings& s) { s.autoUpload = true; });
				UI::ApplyWatching();
				Account::StartRecording("");
			}
		}
	}

	void Render()
	{
		std::vector<std::string> alerts;
		{
			std::lock_guard lock(g_alertMutex);
			alerts.swap(g_alerts);
		}
		for (const auto& a : alerts) APIDefs->GUI_SendAlert(a.c_str());

		bool wasShown = UI::ShowWindow;
		UI::RenderWindow();
		if (wasShown != UI::ShowWindow) Config::Update([](Settings& s) { s.showWindow = UI::ShowWindow; });
	}

	void AddonLoad(AddonAPI_t* api)
	{
		APIDefs = api;
		ImGui::SetCurrentContext((ImGuiContext*)api->ImguiContext);
		ImGui::SetAllocatorFunctions((void* (*)(size_t, void*))api->ImguiMalloc, (void (*)(void*, void*))api->ImguiFree);
		NexusLink = (NexusLinkData_t*)api->DataLink_Get(DL_NEXUS_LINK);

		std::wstring dir = Util::Widen(api->Paths_GetAddonDirectory(ADDON_FOLDER));
		Config::Load(dir);
		UI::ShowWindow = Config::Get().showWindow;

		Http::Reset();
		Uploads::Start(dir);
		Account::Start();
		UI::ApplyWatching();
		DesktopUploader::Start();

		api->GUI_Register(RT_Render, Render);
		api->GUI_Register(RT_OptionsRender, UI::RenderOptions);
		api->GUI_RegisterCloseOnEscape(ADDON_NAME, &UI::ShowWindow);

		// Nexus shows keybinds by identifier, translated: without these it lists "KB_GW2ARCDPSHELPER_…".
		// English is Nexus' fallback for every other language.
		api->Localization_Set(KB_TOGGLE_WINDOW, "en", "Show / hide window");
		api->Localization_Set(KB_TOGGLE_RECORDING, "en", "Start / stop recording");
		api->InputBinds_RegisterWithString(KB_TOGGLE_WINDOW, OnKeybind, "ALT+SHIFT+U");
		api->InputBinds_RegisterWithString(KB_TOGGLE_RECORDING, OnKeybind, "(null)");

		api->Textures_GetOrCreateFromResource(TEX_ICON, IDR_ICON, hSelf);
		api->Textures_GetOrCreateFromResource(TEX_ICON_HOVER, IDR_ICON_HOVER, hSelf);
		api->QuickAccess_Add(QA_SHORTCUT, TEX_ICON, TEX_ICON_HOVER, KB_TOGGLE_WINDOW, ADDON_NAME);

		LogInfo("Loaded");
	}

	void AddonUnload()
	{
		APIDefs->QuickAccess_Remove(QA_SHORTCUT);
		APIDefs->InputBinds_Deregister(KB_TOGGLE_WINDOW);
		APIDefs->InputBinds_Deregister(KB_TOGGLE_RECORDING);
		APIDefs->GUI_DeregisterCloseOnEscape(ADDON_NAME);
		APIDefs->GUI_Deregister(UI::RenderOptions);
		APIDefs->GUI_Deregister(Render);

		// Abort running requests so the worker threads can be joined right away.
		Http::CancelAll();
		DesktopUploader::Stop();
		Watcher::Stop();
		Account::Stop();
		Uploads::Stop();

		LogInfo("Unloaded");
		APIDefs = nullptr;
	}
}

const char* AddonVersion()
{
	static const std::string version = std::to_string(ADDON_VERSION_MAJOR) + "." + std::to_string(ADDON_VERSION_MINOR) + "." + std::to_string(ADDON_VERSION_PATCH);
	return version.c_str();
}

void LogInfo(const std::string& message)
{
	if (APIDefs) APIDefs->Log(LOGL_INFO, ADDON_NAME, message.c_str());
}

void LogWarn(const std::string& message)
{
	if (APIDefs) APIDefs->Log(LOGL_WARNING, ADDON_NAME, message.c_str());
}

void Alert(const std::string& message)
{
	std::lock_guard lock(g_alertMutex);
	g_alerts.push_back(message);
}

BOOL APIENTRY DllMain(HMODULE module, DWORD reason, LPVOID)
{
	if (reason == DLL_PROCESS_ATTACH) hSelf = module;
	return TRUE;
}

extern "C" __declspec(dllexport) AddonDefinition_t* GetAddonDef()
{
	AddonDef.Signature = 0xA7D5C0DE; // unique id; not a Raidcore-hosted addon
	AddonDef.APIVersion = NEXUS_API_VERSION;
	AddonDef.Name = ADDON_NAME;
	AddonDef.Version = { ADDON_VERSION_MAJOR, ADDON_VERSION_MINOR, ADDON_VERSION_PATCH, 0 };
	AddonDef.Author = "NenadG";
	AddonDef.Description = "Uploads new ArcDPS logs to dps.report and GW2 ArcDPS Helper, and records sessions - right from the game.";
	AddonDef.Load = AddonLoad;
	AddonDef.Unload = AddonUnload;
	AddonDef.Flags = AF_None;
	// Nexus checks the repository's GitHub Releases (on load, then every 30 minutes) and installs the newest DLL.
	// It only understands tags like v1.2.3, so addon releases are tagged vX.Y.Z; uploader-v* tags are ignored.
	// Local builds (0.0.0) opt out, or Nexus would replace them with the latest release right away.
	bool localBuild = ADDON_VERSION_MAJOR == 0 && ADDON_VERSION_MINOR == 0 && ADDON_VERSION_PATCH == 0;
	AddonDef.Provider = localBuild ? UP_None : UP_GitHub;
	AddonDef.UpdateLink = localBuild ? nullptr : "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper";
	return &AddonDef;
}
