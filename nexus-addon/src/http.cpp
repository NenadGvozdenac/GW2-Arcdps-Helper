#include "http.h"

#include <windows.h>
#include <winhttp.h>

#include <atomic>
#include <mutex>
#include <set>

#include "util.h"

namespace
{
	std::mutex g_mutex;
	std::set<HINTERNET> g_active; // request handles currently in use
	std::atomic<bool> g_cancelled{ false };

	/** Closes a request handle unless CancelAll already did. */
	void Release(HINTERNET request)
	{
		{
			std::lock_guard lock(g_mutex);
			if (!g_active.erase(request)) return;
		}
		WinHttpCloseHandle(request);
	}

	std::string DescribeError(DWORD code)
	{
		switch (code)
		{
			case ERROR_WINHTTP_TIMEOUT: return "request timed out";
			case ERROR_WINHTTP_NAME_NOT_RESOLVED: return "server name could not be resolved";
			case ERROR_WINHTTP_CANNOT_CONNECT: return "could not connect to the server";
			case ERROR_WINHTTP_CONNECTION_ERROR: return "connection was reset";
			case ERROR_WINHTTP_OPERATION_CANCELLED:
			case ERROR_INVALID_HANDLE: return "cancelled";
			case ERROR_WINHTTP_SECURE_FAILURE: return "TLS error";
			default: return "WinHTTP error " + std::to_string(code);
		}
	}
}

namespace Http
{
	Response Send(const Request& request)
	{
		Response res;
		if (g_cancelled)
		{
			res.networkError = "cancelled";
			return res;
		}

		std::wstring url = Util::Widen(request.url);
		URL_COMPONENTS uc{};
		uc.dwStructSize = sizeof(uc);
		uc.dwHostNameLength = (DWORD)-1;
		uc.dwUrlPathLength = (DWORD)-1;
		uc.dwExtraInfoLength = (DWORD)-1;
		if (!WinHttpCrackUrl(url.c_str(), (DWORD)url.size(), 0, &uc))
		{
			res.networkError = "invalid URL: " + request.url;
			return res;
		}
		std::wstring host(uc.lpszHostName, uc.dwHostNameLength);
		std::wstring path = std::wstring(uc.lpszUrlPath, uc.dwUrlPathLength) + std::wstring(uc.lpszExtraInfo, uc.dwExtraInfoLength);
		if (path.empty()) path = L"/";

		HINTERNET session = WinHttpOpen(L"GW2ArcDPSHelper-Nexus/0.1", WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY, WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
		HINTERNET connect = session ? WinHttpConnect(session, host.c_str(), uc.nPort, 0) : nullptr;
		HINTERNET req = connect
			? WinHttpOpenRequest(connect, Util::Widen(request.method).c_str(), path.c_str(), nullptr, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, uc.nScheme == INTERNET_SCHEME_HTTPS ? WINHTTP_FLAG_SECURE : 0)
			: nullptr;

		if (!req)
		{
			res.networkError = DescribeError(GetLastError());
		}
		else
		{
			{
				std::lock_guard lock(g_mutex);
				g_active.insert(req);
			}
			WinHttpSetTimeouts(req, 15000, 15000, request.timeoutMs, request.timeoutMs);

			std::wstring headers;
			for (const auto& [name, value] : request.headers) headers += Util::Widen(name + ": " + value + "\r\n");

			DWORD size = (DWORD)request.body.size();
			bool ok = !g_cancelled
				&& WinHttpSendRequest(req, headers.empty() ? WINHTTP_NO_ADDITIONAL_HEADERS : headers.c_str(), (DWORD)-1L,
					size ? (LPVOID)request.body.data() : WINHTTP_NO_REQUEST_DATA, size, size, 0)
				&& WinHttpReceiveResponse(req, nullptr);

			if (ok)
			{
				DWORD status = 0, len = sizeof(status);
				WinHttpQueryHeaders(req, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER, WINHTTP_HEADER_NAME_BY_INDEX, &status, &len, WINHTTP_NO_HEADER_INDEX);
				res.status = (int)status;

				for (;;)
				{
					DWORD available = 0;
					if (!WinHttpQueryDataAvailable(req, &available)) { ok = false; break; }
					if (available == 0) break;
					size_t offset = res.body.size();
					res.body.resize(offset + available);
					DWORD read = 0;
					if (!WinHttpReadData(req, res.body.data() + offset, available, &read)) { ok = false; break; }
					res.body.resize(offset + read);
				}
			}
			if (!ok) res.networkError = g_cancelled ? "cancelled" : DescribeError(GetLastError());
			Release(req);
		}

		if (connect) WinHttpCloseHandle(connect);
		if (session) WinHttpCloseHandle(session);
		return res;
	}

	void CancelAll()
	{
		g_cancelled = true;
		std::set<HINTERNET> active;
		{
			std::lock_guard lock(g_mutex);
			active.swap(g_active);
		}
		// Closing a request handle makes the blocking WinHTTP call on the worker thread return.
		for (HINTERNET h : active) WinHttpCloseHandle(h);
	}

	void Reset()
	{
		g_cancelled = false;
	}
}
