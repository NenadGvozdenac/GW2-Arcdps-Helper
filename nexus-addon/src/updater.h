#pragma once

#include <string>

#include "nexus/Nexus.h"

/**
 * Self-update (EUpdateProvider UP_Self): on load, looks up the newest addon-vX.Y.Z GitHub Release on a worker thread.
 * The uploader is released from the same repository, so GitHub's "latest release" can't be used for this.
 * When it is newer than the running version, TakeUpdateUrl() hands its DLL link to the render thread, which passes
 * it to Nexus (RequestUpdate). Local builds (0.0.0) never update.
 */
namespace Updater
{
	void Start(AddonVersion_t current);
	void Stop();

	/** The DLL link of a newer release, returned once; empty otherwise. */
	std::string TakeUpdateUrl();
}
