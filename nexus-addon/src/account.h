#pragma once

#include <cstdint>
#include <string>

#include "api.h"

struct AccountState
{
	bool signedIn = false;
	std::string email;
	std::string gw2Account;
	std::string dpsReportToken; // from the account (website); empty = anonymous uploads

	bool busy = false;       // a sign-in / session request is running
	std::string message;     // last error (or info) to show in the UI

	// "Sign in with the browser": waiting (for the approval on the website), denied or expired; empty = not in use.
	std::string browserStatus;
	std::string browserCode; // shown here and on the website
	std::string browserUrl;  // the page that was opened (to open it again)

	// Recording = an active session on GW2 ArcDPS Helper; new logs are attached to it.
	bool recording = false;
	bool ending = false;     // "Stop" pressed, waiting for the session's uploads before ending it
	std::string sessionId;
	std::string sessionName;
	int64_t sessionStartMs = 0;

	// Weekly raid / strike clear, refreshed every few minutes and after every uploaded raid or strike kill.
	bool clearsLoaded = false;
	Api::WeeklyClears clears;
};

/** Sign-in and sessions. Requests run on the account thread; the UI only reads snapshots. */
namespace Account
{
	void Start();
	void Stop();

	void Login(const std::string& email, const std::string& password);

	/** Opens the website's confirmation page for a new sign-in request and signs in once it is approved there. */
	void StartBrowserLogin();
	void CancelBrowserLogin();
	/** A page to open in the browser, once (the UI thread opens it: ShellExecute wants a UI thread). */
	std::string TakeUrlToOpen();
	void Logout();

	void StartRecording(const std::string& name);
	void StopRecording();
	/** Renames the session that is recording. */
	void RenameSession(const std::string& name);

	AccountState Get();
	std::string ActiveSessionId();

	/**
	 * The dps.report token to upload with, read fresh from the account so a change on the website applies right away.
	 * Blocking (HTTP): call from worker threads. Offline, the last known one is used; "" when signed out or not set.
	 */
	std::string CurrentDpsReportToken();

	/** Re-loads the weekly raid clear (call after a raid kill was saved). */
	void RefreshClears();

	/** The backend rejected the token (expired after 30 days, or signed out elsewhere). */
	void HandleUnauthorized();
}
