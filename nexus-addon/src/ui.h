#pragma once

namespace UI
{
	extern bool ShowWindow;

	/** Starts or stops the folder watcher to match the settings (auto-upload on and the folder exists). */
	void ApplyWatching();

	void RenderWindow();
	void RenderOptions();
}
