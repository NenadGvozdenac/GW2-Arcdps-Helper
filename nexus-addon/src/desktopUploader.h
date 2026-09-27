#pragma once

/**
 * Detects the desktop uploader (uploader/, "GW2 ArcDPS Helper Uploader.exe" or its portable exe). Running both uploads
 * every log twice, so the UI warns while it runs. Checks the process list every few seconds on its own thread.
 */
namespace DesktopUploader
{
	void Start();
	void Stop();
	bool IsRunning();
}
