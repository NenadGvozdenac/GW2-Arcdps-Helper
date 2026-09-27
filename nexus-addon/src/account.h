#pragma once

#include <cstdint>
#include <string>

struct AccountState
{
	bool signedIn = false;
	std::string email;
	std::string gw2Account;

	bool busy = false;       // a sign-in / session request is running
	std::string message;     // last error (or info) to show in the UI

	// Recording = an active session on GW2 ArcDPS Helper; new logs are attached to it.
	bool recording = false;
	bool ending = false;     // "Stop" pressed, waiting for the session's uploads before ending it
	std::string sessionId;
	std::string sessionName;
	int64_t sessionStartMs = 0;
};

/** Sign-in and sessions. Requests run on the account thread; the UI only reads snapshots. */
namespace Account
{
	void Start();
	void Stop();

	void Login(const std::string& email, const std::string& password);
	void Logout();

	void StartRecording(const std::string& name);
	void StopRecording();

	AccountState Get();
	std::string ActiveSessionId();

	/** The backend rejected the token (expired after 30 days, or signed out elsewhere). */
	void HandleUnauthorized();
}
