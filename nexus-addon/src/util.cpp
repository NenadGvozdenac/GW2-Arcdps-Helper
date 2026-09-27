#include "util.h"

#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <wincrypt.h>

#include <chrono>
#include <cstdio>
#include <ctime>
#include <vector>

namespace Util
{
	std::wstring Widen(const std::string& utf8)
	{
		if (utf8.empty()) return {};
		int len = MultiByteToWideChar(CP_UTF8, 0, utf8.data(), (int)utf8.size(), nullptr, 0);
		std::wstring out(len, L'\0');
		MultiByteToWideChar(CP_UTF8, 0, utf8.data(), (int)utf8.size(), out.data(), len);
		return out;
	}

	std::string Narrow(const std::wstring& wide)
	{
		if (wide.empty()) return {};
		int len = WideCharToMultiByte(CP_UTF8, 0, wide.data(), (int)wide.size(), nullptr, 0, nullptr, nullptr);
		std::string out(len, '\0');
		WideCharToMultiByte(CP_UTF8, 0, wide.data(), (int)wide.size(), out.data(), len, nullptr, nullptr);
		return out;
	}

	std::string UrlEncode(const std::string& value)
	{
		static const char* hex = "0123456789ABCDEF";
		std::string out;
		for (unsigned char c : value)
		{
			if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') out += (char)c;
			else { out += '%'; out += hex[c >> 4]; out += hex[c & 15]; }
		}
		return out;
	}

	std::string FormatDuration(int64_t ms)
	{
		if (ms < 0) ms = 0;
		int64_t s = ms / 1000;
		char buf[32];
		if (s >= 3600) snprintf(buf, sizeof(buf), "%lld:%02lld:%02lld", s / 3600, (s / 60) % 60, s % 60);
		else snprintf(buf, sizeof(buf), "%lld:%02lld", s / 60, s % 60);
		return buf;
	}

	int64_t NowMs()
	{
		using namespace std::chrono;
		return duration_cast<milliseconds>(system_clock::now().time_since_epoch()).count();
	}

	int64_t ParseIsoMs(const std::string& iso)
	{
		std::tm tm = {};
		int ms = 0;
		int n = sscanf_s(iso.c_str(), "%d-%d-%dT%d:%d:%d.%d", &tm.tm_year, &tm.tm_mon, &tm.tm_mday, &tm.tm_hour, &tm.tm_min, &tm.tm_sec, &ms);
		if (n < 6) return 0;
		tm.tm_year -= 1900;
		tm.tm_mon -= 1;
		time_t t = _mkgmtime(&tm);
		return t < 0 ? 0 : (int64_t)t * 1000 + (n == 7 ? ms : 0);
	}

	std::string DefaultLogFolder()
	{
		PWSTR docs = nullptr;
		std::string out;
		if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_Documents, 0, nullptr, &docs)))
		{
			out = Narrow(std::wstring(docs) + L"\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs");
		}
		CoTaskMemFree(docs);
		return out;
	}

	bool DirectoryExists(const std::string& utf8Path)
	{
		if (utf8Path.empty()) return false;
		DWORD attr = GetFileAttributesW(Widen(utf8Path).c_str());
		return attr != INVALID_FILE_ATTRIBUTES && (attr & FILE_ATTRIBUTE_DIRECTORY);
	}

	bool ReadFile(const std::wstring& path, std::string& out)
	{
		HANDLE h = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, nullptr, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
		if (h == INVALID_HANDLE_VALUE) return false;
		LARGE_INTEGER size{};
		bool ok = GetFileSizeEx(h, &size) && size.QuadPart < (1ll << 31);
		if (ok)
		{
			out.resize((size_t)size.QuadPart);
			DWORD read = 0;
			ok = out.empty() || (::ReadFile(h, out.data(), (DWORD)out.size(), &read, nullptr) && read == out.size());
		}
		CloseHandle(h);
		return ok;
	}

	bool WriteFileAtomic(const std::wstring& path, const std::string& data)
	{
		std::wstring tmp = path + L".tmp";
		HANDLE h = CreateFileW(tmp.c_str(), GENERIC_WRITE, 0, nullptr, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
		if (h == INVALID_HANDLE_VALUE) return false;
		DWORD written = 0;
		bool ok = ::WriteFile(h, data.data(), (DWORD)data.size(), &written, nullptr) && written == data.size();
		CloseHandle(h);
		return ok && MoveFileExW(tmp.c_str(), path.c_str(), MOVEFILE_REPLACE_EXISTING);
	}

	std::string Protect(const std::string& plain)
	{
		if (plain.empty()) return {};
		DATA_BLOB in{ (DWORD)plain.size(), (BYTE*)plain.data() }, out{};
		if (!CryptProtectData(&in, L"GW2ArcDPSHelper", nullptr, nullptr, nullptr, CRYPTPROTECT_UI_FORBIDDEN, &out)) return {};
		DWORD len = 0;
		CryptBinaryToStringA(out.pbData, out.cbData, CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, nullptr, &len);
		std::string b64(len, '\0');
		CryptBinaryToStringA(out.pbData, out.cbData, CRYPT_STRING_BASE64 | CRYPT_STRING_NOCRLF, b64.data(), &len);
		b64.resize(len);
		LocalFree(out.pbData);
		return b64;
	}

	std::string Unprotect(const std::string& protectedB64)
	{
		if (protectedB64.empty()) return {};
		DWORD len = 0;
		if (!CryptStringToBinaryA(protectedB64.c_str(), 0, CRYPT_STRING_BASE64, nullptr, &len, nullptr, nullptr)) return {};
		std::vector<BYTE> bytes(len);
		if (!CryptStringToBinaryA(protectedB64.c_str(), 0, CRYPT_STRING_BASE64, bytes.data(), &len, nullptr, nullptr)) return {};
		DATA_BLOB in{ len, bytes.data() }, out{};
		if (!CryptUnprotectData(&in, nullptr, nullptr, nullptr, nullptr, CRYPTPROTECT_UI_FORBIDDEN, &out)) return {};
		std::string plain((char*)out.pbData, out.cbData);
		LocalFree(out.pbData);
		return plain;
	}

	void CopyToClipboard(const std::string& utf8)
	{
		std::wstring text = Widen(utf8);
		if (!OpenClipboard(nullptr)) return;
		EmptyClipboard();
		HGLOBAL mem = GlobalAlloc(GMEM_MOVEABLE, (text.size() + 1) * sizeof(wchar_t));
		if (mem)
		{
			memcpy(GlobalLock(mem), text.c_str(), (text.size() + 1) * sizeof(wchar_t));
			GlobalUnlock(mem);
			if (!SetClipboardData(CF_UNICODETEXT, mem)) GlobalFree(mem);
		}
		CloseClipboard();
	}

	void OpenUrl(const std::string& url)
	{
		if (url.rfind("https://", 0) != 0 && url.rfind("http://", 0) != 0) return;
		ShellExecuteW(nullptr, L"open", Widen(url).c_str(), nullptr, nullptr, SW_SHOWNORMAL);
	}
}
