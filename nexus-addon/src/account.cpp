#include "account.h"

#include <condition_variable>
#include <deque>
#include <functional>
#include <mutex>
#include <thread>

#include "api.h"
#include "globals.h"
#include "settings.h"
#include "uploads.h"
#include "util.h"

namespace
{
	/** The backend ends sessions after 6 hours, or one may be ended on the website: re-check regularly. */
	constexpr int64_t REFRESH_MS = 60000;

	std::mutex g_mutex;
	std::condition_variable g_cv;
	std::deque<std::function<void()>> g_tasks;
	bool g_stop = false;
	std::thread g_thread;
	AccountState g_state;

	void Set(const std::function<void(AccountState&)>& change)
	{
		std::lock_guard lock(g_mutex);
		change(g_state);
	}

	void Post(std::function<void()> task)
	{
		{
			std::lock_guard lock(g_mutex);
			g_tasks.push_back(std::move(task));
		}
		g_cv.notify_all();
	}

	bool SleepOrStop(int64_t ms)
	{
		std::unique_lock lock(g_mutex);
		return !g_cv.wait_for(lock, std::chrono::milliseconds(ms), [] { return g_stop; });
	}

	void ClearSession(AccountState& s)
	{
		s.recording = false;
		s.ending = false;
		s.sessionId.clear();
		s.sessionName.clear();
		s.sessionStartMs = 0;
	}

	void ApplySession(const std::optional<Api::Session>& session)
	{
		Set([&](AccountState& s) {
			if (s.ending) return; // "Stop" is in progress; it clears the session itself
			if (!session) return ClearSession(s);
			s.recording = true;
			s.sessionId = session->id;
			s.sessionName = session->name;
			s.sessionStartMs = Util::ParseIsoMs(session->startedAt);
		});
	}

	void SignOutLocal(const std::string& message)
	{
		Config::Update([](Settings& s) { s.token.clear(); s.gw2Account.clear(); });
		Set([&](AccountState& s) {
			s.signedIn = false;
			s.gw2Account.clear();
			s.message = message;
			ClearSession(s);
		});
	}

	/** Picks up a session that is still running on the server (e.g. after restarting the game). */
	void RefreshSession()
	{
		Settings cfg = Config::Get();
		if (cfg.token.empty()) return;
		std::optional<Api::Session> session;
		Api::Error err;
		if (Api::GetActiveSession(cfg.token, session, err)) ApplySession(session);
		else if (err.code == "UNAUTHORIZED") SignOutLocal("Your sign-in expired. Sign in again.");
		else LogWarn("Could not load the active session: " + err.message);
	}

	void RunTask(const std::function<void()>& task)
	{
		Set([](AccountState& s) { s.busy = true; });
		try
		{
			task();
		}
		catch (const std::exception& e)
		{
			Set([&](AccountState& s) { s.message = e.what(); });
		}
		Set([](AccountState& s) { s.busy = false; });
	}

	void Loop()
	{
		// Re-validate a saved sign-in. Offline is fine (uploads retry later); a rejected token is not.
		RunTask([] {
			Settings cfg = Config::Get();
			if (cfg.token.empty()) return;
			Api::User user;
			Api::Error err;
			if (Api::Me(cfg.token, user, err))
			{
				Config::Update([&](Settings& s) { s.email = user.email; s.gw2Account = user.gw2Account; });
				Set([&](AccountState& s) { s.email = user.email; s.gw2Account = user.gw2Account; });
			}
			else if (err.code == "UNAUTHORIZED")
			{
				SignOutLocal("Your sign-in expired. Sign in again.");
			}
		});

		int64_t nextRefresh = 0;
		for (;;)
		{
			std::function<void()> task;
			{
				std::unique_lock lock(g_mutex);
				int64_t wait = std::max<int64_t>(0, nextRefresh - Util::NowMs());
				g_cv.wait_for(lock, std::chrono::milliseconds(wait), [] { return g_stop || !g_tasks.empty(); });
				if (g_stop) return;
				if (!g_tasks.empty())
				{
					task = std::move(g_tasks.front());
					g_tasks.pop_front();
				}
			}
			if (task)
			{
				RunTask(task);
			}
			else
			{
				RunTask(RefreshSession);
				nextRefresh = Util::NowMs() + REFRESH_MS;
			}
		}
	}
}

namespace Account
{
	void Start()
	{
		Settings cfg = Config::Get();
		{
			std::lock_guard lock(g_mutex);
			g_stop = false;
			g_tasks.clear();
			g_state = {};
			g_state.signedIn = !cfg.token.empty();
			g_state.email = cfg.email;
			g_state.gw2Account = cfg.gw2Account;
		}
		g_thread = std::thread(Loop);
	}

	void Stop()
	{
		{
			std::lock_guard lock(g_mutex);
			g_stop = true;
		}
		g_cv.notify_all();
		if (g_thread.joinable()) g_thread.join();
	}

	void Login(const std::string& email, const std::string& password)
	{
		Set([](AccountState& s) { s.message.clear(); });
		Post([email, password] {
			std::string token;
			Api::User user;
			Api::Error err;
			if (!Api::Login(email, password, token, user, err))
			{
				Set([&](AccountState& s) { s.message = err.message.empty() ? "Sign-in failed." : err.message; });
				return;
			}
			Config::Update([&](Settings& s) { s.token = token; s.email = user.email; s.gw2Account = user.gw2Account; });
			Set([&](AccountState& s) {
				s.signedIn = true;
				s.email = user.email;
				s.gw2Account = user.gw2Account;
				s.message.clear();
			});
			LogInfo("Signed in as " + user.email);
			RefreshSession();
		});
	}

	void Logout()
	{
		// Local only: the JWT simply stops being used. An active session keeps running on the website.
		SignOutLocal("");
	}

	void StartRecording(const std::string& name)
	{
		Set([](AccountState& s) { s.message.clear(); });
		Post([name] {
			Settings cfg = Config::Get();
			if (cfg.token.empty()) return;
			Api::Session session;
			Api::Error err;
			if (!Api::StartSession(cfg.token, name, session, err))
			{
				if (err.code == "UNAUTHORIZED") return SignOutLocal("Your sign-in expired. Sign in again.");
				Set([&](AccountState& s) { s.message = "Could not start recording: " + err.message; });
				return;
			}
			ApplySession(session);
			LogInfo("Session started: " + session.id);
			Alert("Recording started");
		});
	}

	void StopRecording()
	{
		std::string id;
		{
			std::lock_guard lock(g_mutex);
			if (!g_state.recording || g_state.ending) return;
			g_state.ending = true;
			g_state.message.clear();
			id = g_state.sessionId;
		}
		Post([id] {
			// Wait for the session's uploads first, so the Discord summary contains every log.
			while (Uploads::HasPending(id))
			{
				if (!SleepOrStop(1000)) return;
			}
			Settings cfg = Config::Get();
			Api::Error err;
			if (Api::EndSession(cfg.token, id, err) || err.code == "SESSION_NOT_FOUND")
			{
				Set(ClearSession);
				LogInfo("Session ended: " + id);
				Alert("Recording stopped");
				return;
			}
			if (err.code == "UNAUTHORIZED") return SignOutLocal("Your sign-in expired. Sign in again.");
			Set([&](AccountState& s) {
				s.ending = false;
				s.message = "Could not stop recording: " + err.message;
			});
		});
	}

	AccountState Get()
	{
		std::lock_guard lock(g_mutex);
		return g_state;
	}

	std::string ActiveSessionId()
	{
		std::lock_guard lock(g_mutex);
		return g_state.recording ? g_state.sessionId : std::string();
	}

	void HandleUnauthorized()
	{
		SignOutLocal("Your sign-in expired. Sign in again.");
	}
}
