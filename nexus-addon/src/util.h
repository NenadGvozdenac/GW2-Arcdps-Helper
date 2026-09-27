#pragma once

#include <cstdint>
#include <string>

namespace Util
{
	std::wstring Widen(const std::string& utf8);
	std::string Narrow(const std::wstring& wide);

	/** Percent-encodes a query string value. */
	std::string UrlEncode(const std::string& value);

	/** "1:23" or "1:02:03". */
	std::string FormatDuration(int64_t ms);

	/** Milliseconds since the Unix epoch. */
	int64_t NowMs();
	/** Parses "2026-09-27T17:32:47.123Z"; 0 when invalid. */
	int64_t ParseIsoMs(const std::string& iso);

	/** "Documents\Guild Wars 2\addons\arcdps\arcdps.cbtlogs" (whether or not it exists). */
	std::string DefaultLogFolder();
	bool DirectoryExists(const std::string& utf8Path);
	bool ReadFile(const std::wstring& path, std::string& out);
	/** Writes via a temp file + rename, so a crash never leaves half a file. */
	bool WriteFileAtomic(const std::wstring& path, const std::string& data);

	/** DPAPI (current Windows user) + base64. Empty string on failure. */
	std::string Protect(const std::string& plain);
	std::string Unprotect(const std::string& protectedB64);

	void CopyToClipboard(const std::string& utf8);
	/** Opens http(s) links in the default browser; anything else is ignored. */
	void OpenUrl(const std::string& url);
}
