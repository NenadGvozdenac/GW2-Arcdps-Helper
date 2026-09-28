#include "api.h"

#include "nlohmann/json.hpp"

#include "http.h"
#include "util.h"

using json = nlohmann::json;

namespace
{
	constexpr const char* API_URL = "https://gw2-arcdps-helper-api.vercel.app/api";
	constexpr const char* DPS_REPORT_UPLOAD_URL = "https://dps.report/uploadContent";
	constexpr int DPS_REPORT_TIMEOUT_MS = 120000;
	constexpr int BACKEND_TIMEOUT_MS = 60000;

	json ParseJson(const std::string& body)
	{
		json j = json::parse(body, nullptr, false);
		return j.is_discarded() ? json::object() : j;
	}

	std::string Str(const json& j, const char* key)
	{
		auto it = j.find(key);
		return it != j.end() && it->is_string() ? it->get<std::string>() : std::string();
	}

	std::optional<bool> OptBool(const json& j, const char* key)
	{
		auto it = j.find(key);
		if (it == j.end() || !it->is_boolean()) return std::nullopt;
		return it->get<bool>();
	}

	/** Backend call; fills err from the { error, code } body on failure. */
	bool Backend(const std::string& method, const std::string& path, const std::string& token, const json* body, json& out, Api::Error& err)
	{
		Http::Request req;
		req.method = method;
		req.url = std::string(API_URL) + path;
		req.timeoutMs = BACKEND_TIMEOUT_MS;
		req.headers.push_back({ "Accept", "application/json" });
		if (!token.empty()) req.headers.push_back({ "Authorization", "Bearer " + token });
		if (body)
		{
			req.headers.push_back({ "Content-Type", "application/json" });
			req.body = body->dump();
		}

		Http::Response res = Http::Send(req);
		if (!res.networkError.empty())
		{
			err = { "NETWORK_ERROR", "GW2 ArcDPS Helper: " + res.networkError, 0 };
			return false;
		}
		out = ParseJson(res.body);
		if (res.status < 200 || res.status >= 300)
		{
			std::string code = res.status == 401 ? "UNAUTHORIZED" : Str(out, "code");
			std::string message = Str(out, "error");
			err = { code.empty() ? "BACKEND_ERROR" : code, message.empty() ? "GW2 ArcDPS Helper returned " + std::to_string(res.status) : message, res.status };
			return false;
		}
		return true;
	}

	Api::Session ToSession(const json& j)
	{
		return { Str(j, "id"), Str(j, "name"), Str(j, "startedAt") };
	}

	Api::User ToUser(const json& j)
	{
		return { Str(j, "email"), Str(j, "gw2Account"), Str(j, "dpsReportToken") };
	}
}

namespace Api
{
	bool UploadToDpsReport(const std::wstring& filePath, const std::string& userToken, DpsReportLog& out, Error& err)
	{
		std::string data;
		if (!Util::ReadFile(filePath, data))
		{
			err = { "FILE_UNREADABLE", "Could not read the log file.", 0 };
			return false;
		}

		std::wstring wname = filePath.substr(filePath.find_last_of(L"\\/") + 1);
		std::string boundary = "----GW2ArcDPSHelper" + std::to_string(Util::NowMs());

		Http::Request req;
		req.method = "POST";
		req.url = std::string(DPS_REPORT_UPLOAD_URL) + "?json=1&generator=ei";
		if (!userToken.empty()) req.url += "&userToken=" + Util::UrlEncode(userToken);
		req.timeoutMs = DPS_REPORT_TIMEOUT_MS;
		req.headers.push_back({ "Content-Type", "multipart/form-data; boundary=" + boundary });
		req.body.reserve(data.size() + 512);
		req.body += "--" + boundary + "\r\n";
		req.body += "Content-Disposition: form-data; name=\"file\"; filename=\"" + Util::Narrow(wname) + "\"\r\n";
		req.body += "Content-Type: application/octet-stream\r\n\r\n";
		req.body += data;
		req.body += "\r\n--" + boundary + "--\r\n";

		Http::Response res = Http::Send(req);
		if (!res.networkError.empty())
		{
			err = { "NETWORK_ERROR", "dps.report: " + res.networkError, 0 };
			return false;
		}

		json body = ParseJson(res.body);
		std::string error = Str(body, "error");
		out.permalink = Str(body, "permalink");
		if (res.status < 200 || res.status >= 300 || !error.empty() || out.permalink.empty())
		{
			err = { "DPS_REPORT_FAILED", !error.empty() ? error : "dps.report returned " + std::to_string(res.status), res.status };
			return false;
		}

		if (auto enc = body.find("encounter"); enc != body.end() && enc->is_object())
		{
			out.boss = Str(*enc, "boss");
			out.success = OptBool(*enc, "success");
			out.isCM = OptBool(*enc, "isCm").value_or(false);
			if (auto d = enc->find("duration"); d != enc->end() && d->is_number()) out.durationMs = (int64_t)(d->get<double>() * 1000);
		}
		return true;
	}

	bool Login(const std::string& email, const std::string& password, std::string& token, User& user, Error& err)
	{
		json body = { { "email", email }, { "password", password } }, out;
		if (!Backend("POST", "/auth/login", "", &body, out, err)) return false;
		token = Str(out, "token");
		user = ToUser(out.value("user", json::object()));
		return !token.empty();
	}

	bool Me(const std::string& token, User& user, Error& err)
	{
		json out;
		if (!Backend("GET", "/auth/me", token, nullptr, out, err)) return false;
		user = ToUser(out.value("user", json::object()));
		return true;
	}

	bool SubmitLog(const std::string& token, const std::string& permalink, const std::string& sessionId, SubmitResult& result, Error& err)
	{
		json body = { { "urls", json::array({ permalink }) }, { "sessionId", sessionId.empty() ? json(nullptr) : json(sessionId) } }, out;
		if (!Backend("POST", "/logs", token, &body, out, err)) return false;

		const json results = out.value("results", json::array());
		if (results.empty() || !results[0].is_object())
		{
			err = { "SYNC_FAILED", "GW2 ArcDPS Helper did not accept the log.", 0 };
			return false;
		}
		const json& r = results[0];
		std::string status = Str(r, "status");
		if (status == "error")
		{
			std::string message = Str(r, "message");
			err = { "SYNC_FAILED", message.empty() ? "GW2 ArcDPS Helper did not accept the log." : message, 0 };
			return false;
		}
		const json log = r.value("log", json::object());
		result.boss = Str(log, "bossName");
		result.success = OptBool(log, "success");
		result.isCM = OptBool(log, "isCM").value_or(false);
		result.duplicate = status == "duplicate";
		return true;
	}

	bool GetActiveSession(const std::string& token, std::optional<Session>& result, Error& err)
	{
		json out;
		if (!Backend("GET", "/sessions/active", token, nullptr, out, err)) return false;
		auto it = out.find("session");
		result = it != out.end() && it->is_object() ? std::optional(ToSession(*it)) : std::nullopt;
		return true;
	}

	bool StartSession(const std::string& token, const std::string& name, Session& result, Error& err)
	{
		json body = { { "name", name } }, out;
		if (!Backend("POST", "/sessions", token, &body, out, err)) return false;
		result = ToSession(out.value("session", json::object()));
		return true;
	}

	bool RenameSession(const std::string& token, const std::string& id, const std::string& name, Session& result, Error& err)
	{
		json body = { { "name", name } }, out;
		if (!Backend("PATCH", "/sessions/" + Util::UrlEncode(id), token, &body, out, err)) return false;
		result = ToSession(out.value("session", json::object()));
		return true;
	}

	bool EndSession(const std::string& token, const std::string& id, Error& err)
	{
		json out;
		return Backend("POST", "/sessions/" + Util::UrlEncode(id) + "/end", token, nullptr, out, err);
	}
}
