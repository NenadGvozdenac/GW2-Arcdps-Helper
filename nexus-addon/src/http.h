#pragma once

#include <string>
#include <utility>
#include <vector>

namespace Http
{
	struct Request
	{
		std::string method = "GET";
		std::string url;
		std::vector<std::pair<std::string, std::string>> headers;
		std::string body;
		int timeoutMs = 60000;
	};

	struct Response
	{
		int status = 0;
		std::string body;
		/** Set when no HTTP response arrived (DNS, connect, timeout, cancelled). */
		std::string networkError;
	};

	/** Blocking WinHTTP request. Call from worker threads only, never from the render thread. */
	Response Send(const Request& request);

	/** Aborts every running request and refuses new ones (called on unload so worker threads can be joined). */
	void CancelAll();
	void Reset();
}
