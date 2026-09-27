#pragma once

#include <string>

#include "nexus/Nexus.h"

// Shared by every module. Set in AddonLoad, valid until AddonUnload returns.
extern AddonAPI_t* APIDefs;
extern HMODULE hSelf;
extern NexusLinkData_t* NexusLink;

inline constexpr const char* ADDON_NAME = "GW2 ArcDPS Helper";
inline constexpr const char* ADDON_FOLDER = "GW2ArcDPSHelper"; // <GW2>/addons/GW2ArcDPSHelper
inline constexpr const char* DEFAULT_API_URL = "https://gw2-arcdps-helper-api.vercel.app/api";

// Nexus log + alert helpers; safe to call from any thread.
void LogInfo(const std::string& message);
void LogWarn(const std::string& message);
void Alert(const std::string& message);
