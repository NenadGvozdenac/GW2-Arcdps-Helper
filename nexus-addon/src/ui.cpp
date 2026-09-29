#include "ui.h"

#include <algorithm>
#include <cstring>
#include <string>

#include "imgui/imgui.h"
#include "imgui/imgui_internal.h"

#include "account.h"
#include "desktopUploader.h"
#include "globals.h"
#include "settings.h"
#include "uploads.h"
#include "util.h"
#include "watcher.h"

namespace
{
	const ImVec4 RED(0.93f, 0.33f, 0.31f, 1.0f);
	const ImVec4 GREEN(0.40f, 0.80f, 0.45f, 1.0f);
	const ImVec4 YELLOW(0.95f, 0.78f, 0.30f, 1.0f);
	const ImVec4 GREY(0.60f, 0.60f, 0.60f, 1.0f);

	std::string g_watchedFolder; // folder the watcher runs on, empty when stopped
	bool g_showClears = false;   // the weekly raid clear window is open

	// Text field buffers (ImGui 1.80 has no std::string InputText)
	char g_sessionName[128] = "";
	char g_renameBuffer[128] = "";
	bool g_renaming = false;
	bool g_focusRename = false; // focus the name field on the frame it opens
	char g_email[256] = "";
	char g_password[256] = "";
	char g_logFolder[520] = "";
	bool g_optionsInit = false;

	void BeginDisabled(bool disabled)
	{
		ImGui::PushItemFlag(ImGuiItemFlags_Disabled, disabled);
		ImGui::PushStyleVar(ImGuiStyleVar_Alpha, ImGui::GetStyle().Alpha * (disabled ? 0.5f : 1.0f));
	}

	void EndDisabled()
	{
		ImGui::PopStyleVar();
		ImGui::PopItemFlag();
	}

	void Copy(char* dest, size_t size, const std::string& value)
	{
		strncpy_s(dest, size, value.c_str(), _TRUNCATE);
	}

	void TextWrappedColored(const ImVec4& color, const char* text)
	{
		ImGui::PushStyleColor(ImGuiCol_Text, color);
		ImGui::TextWrapped("%s", text);
		ImGui::PopStyleColor();
	}

	/** Both uploaders watching the same folder would upload every log twice. */
	void RenderDesktopUploaderWarning(bool autoUpload)
	{
		if (!autoUpload || !DesktopUploader::IsRunning()) return;
		TextWrappedColored(RED,
			"The GW2 ArcDPS Helper desktop uploader is running. Close it (tray icon > Quit) or turn off "
			"\"Auto-upload new logs\" here - with both on, every log is uploaded twice.");
	}

	void Bullet(const char* text)
	{
		ImGui::Bullet();
		ImGui::TextWrapped("%s", text);
	}

	/** Short guide at the top of the options, with the version (handy to see that an update arrived). */
	void RenderHowItWorks()
	{
		bool local = strcmp(AddonVersion(), "0.0.0") == 0;
		ImGui::Text("%s  v%s%s", ADDON_NAME, AddonVersion(), local ? " (local build)" : "");
		if (!ImGui::TreeNode("How it works")) return;

		Bullet("After every fight ArcDPS writes a log. The addon picks it up from the ArcDPS log folder, uploads it to "
			"dps.report and saves it to your GW2 ArcDPS Helper account (sign in below). Without an account, logs only go "
			"to dps.report.");
		Bullet("Open the window with ALT+SHIFT+U or the icon in the Nexus bar. Click a log to open it on dps.report, "
			"right-click to copy the link, and use Retry if an upload failed.");
		Bullet("Record starts a session on the website: every log until you press Stop belongs to it, and one Discord "
			"summary is posted when it ends. A session you forget ends by itself after 6 hours.");
		Bullet("Use either this addon or the desktop uploader - with both running, every log is uploaded twice.");
		Bullet(local ? "Local build: Nexus does not update it."
			: "Updates install themselves: Nexus checks GitHub when the addon loads and every 30 minutes.");
		ImGui::TreePop();
	}

	const char* StageText(const Upload& u)
	{
		switch (u.stage)
		{
			case Stage::Queued: return "Queued";
			case Stage::Waiting: return "Waiting for ArcDPS";
			case Stage::Uploading: return "Uploading";
			case Stage::Syncing: return "Saving";
			case Stage::Done: return u.synced ? "Done" : "dps.report only";
			case Stage::Failed: return "Failed";
		}
		return "";
	}

	/** Small square button with a pencil drawn in it (the default ImGui font has no icon glyphs). */
	bool PencilButton(const char* id)
	{
		float size = ImGui::GetFrameHeight();
		ImVec2 p = ImGui::GetCursorScreenPos();
		bool clicked = ImGui::InvisibleButton(id, ImVec2(size, size));
		bool hovered = ImGui::IsItemHovered();

		ImDrawList* draw = ImGui::GetWindowDrawList();
		if (hovered) draw->AddRectFilled(p, ImVec2(p.x + size, p.y + size), ImGui::GetColorU32(ImGuiCol_ButtonHovered), ImGui::GetStyle().FrameRounding);
		ImU32 color = ImGui::GetColorU32(hovered ? ImGuiCol_Text : ImGuiCol_TextDisabled);

		// Diagonal pencil: body from top-right to bottom-left, ending in a tip.
		float pad = size * 0.25f, w = size * 0.11f;
		ImVec2 a(p.x + size - pad, p.y + pad);          // eraser end
		ImVec2 b(p.x + pad + size * 0.16f, p.y + size - pad - size * 0.16f); // start of the tip
		ImVec2 tip(p.x + pad, p.y + size - pad);
		ImVec2 n(w, w); // normal to the 45-degree axis
		draw->AddQuadFilled(ImVec2(a.x - n.x, a.y - n.y), ImVec2(a.x + n.x, a.y + n.y), ImVec2(b.x + n.x, b.y + n.y), ImVec2(b.x - n.x, b.y - n.y), color);
		draw->AddTriangleFilled(ImVec2(b.x - n.x, b.y - n.y), ImVec2(b.x + n.x, b.y + n.y), tip, color);

		if (hovered) ImGui::SetTooltip("Rename session");
		return clicked;
	}

	void RenderRename(const AccountState& acc)
	{
		ImGui::SetNextItemWidth(-120);
		if (g_focusRename)
		{
			ImGui::SetKeyboardFocusHere();
			g_focusRename = false;
		}
		bool submit = ImGui::InputTextWithHint("##rename", "Session name", g_renameBuffer, sizeof(g_renameBuffer), ImGuiInputTextFlags_EnterReturnsTrue);
		bool cancel = ImGui::IsItemDeactivated() && ImGui::IsKeyPressed(ImGui::GetKeyIndex(ImGuiKey_Escape)); // Escape deactivates the field first
		ImGui::SameLine();
		BeginDisabled(acc.busy);
		submit |= ImGui::Button("Save");
		EndDisabled();
		ImGui::SameLine();
		cancel |= ImGui::Button("Cancel", ImVec2(-1, 0));

		if (submit && !acc.busy)
		{
			Account::RenameSession(g_renameBuffer);
			g_renaming = false;
		}
		else if (cancel)
		{
			g_renaming = false;
		}
	}

	void RenderRecording(const AccountState& acc)
	{
		if (!acc.signedIn)
		{
			ImGui::TextColored(GREY, "Not signed in - logs go to dps.report only.");
			ImGui::TextColored(GREY, "Sign in under Nexus > Addons > %s options to record sessions.", ADDON_NAME);
			return;
		}

		if (!acc.recording) g_renaming = false;
		if (acc.recording)
		{
			int64_t elapsed = acc.sessionStartMs ? Util::NowMs() - acc.sessionStartMs : 0;
			// Blinking dot while recording
			bool on = (Util::NowMs() / 600) % 2 == 0;
			ImGui::AlignTextToFramePadding(); // keeps the text in line with the pencil button
			ImGui::TextColored(on ? RED : ImVec4(RED.x, RED.y, RED.z, 0.35f), "REC");
			ImGui::SameLine();
			if (g_renaming)
			{
				ImGui::TextColored(GREY, "%s", Util::FormatDuration(elapsed).c_str());
				RenderRename(acc);
			}
			else
			{
				ImGui::Text("%s  %s", acc.sessionName.empty() ? "Session" : acc.sessionName.c_str(), Util::FormatDuration(elapsed).c_str());
				ImGui::SameLine();
				if (PencilButton("##renameSession"))
				{
					Copy(g_renameBuffer, sizeof(g_renameBuffer), acc.sessionName);
					g_renaming = true;
					g_focusRename = true;
				}
			}

			BeginDisabled(acc.ending);
			if (ImGui::Button(acc.ending ? "Finishing uploads..." : "Stop recording", ImVec2(-1, 0))) Account::StopRecording();
			EndDisabled();
		}
		else
		{
			ImGui::SetNextItemWidth(-110);
			ImGui::InputTextWithHint("##session", "Session name (optional)", g_sessionName, sizeof(g_sessionName));
			ImGui::SameLine();
			BeginDisabled(acc.busy);
			ImGui::PushStyleColor(ImGuiCol_Button, ImVec4(0.65f, 0.15f, 0.15f, 1.0f));
			ImGui::PushStyleColor(ImGuiCol_ButtonHovered, ImVec4(0.80f, 0.22f, 0.22f, 1.0f));
			if (ImGui::Button("Record", ImVec2(-1, 0)))
			{
				// Recording implies picking up new logs.
				Config::Update([](Settings& s) { s.autoUpload = true; });
				UI::ApplyWatching();
				Account::StartRecording(g_sessionName);
				g_sessionName[0] = '\0';
			}
			ImGui::PopStyleColor(2);
			EndDisabled();
		}
	}

	/** "3d 4h" / "5h 12m" until the next weekly reset. */
	std::string FormatUntil(int64_t targetMs)
	{
		int64_t minutes = std::max<int64_t>(0, (targetMs - Util::NowMs()) / 60000);
		int64_t days = minutes / 1440, hours = (minutes % 1440) / 60;
		if (days > 0) return std::to_string(days) + "d " + std::to_string(hours) + "h";
		return std::to_string(hours) + "h " + std::to_string(minutes % 60) + "m";
	}

	/** A circle in front of a boss name: filled green = killed since the reset, grey ring = not yet. */
	void BossMark(bool cleared)
	{
		const float r = 4.5f, h = ImGui::GetTextLineHeight();
		ImVec2 p = ImGui::GetCursorScreenPos();
		ImVec2 c(p.x + r, p.y + h / 2);
		ImDrawList* dl = ImGui::GetWindowDrawList();
		if (cleared) dl->AddCircleFilled(c, r, ImGui::GetColorU32(GREEN));
		else dl->AddCircle(c, r, ImGui::GetColorU32(GREY), 0, 1.5f);
		ImGui::Dummy(ImVec2(2 * r, h));
		ImGui::SameLine();
	}

	void CountClears(const Api::WeeklyClears& clears, int& cleared, int& total)
	{
		cleared = total = 0;
		for (const auto& g : clears.groups)
		{
			for (const auto& b : g.bosses) cleared += b.cleared ? 1 : 0;
			total += (int)g.bosses.size();
		}
	}

	/** Main window: "Weekly clear 11/32" opens the weekly clear window. */
	void RenderClearsButton(const AccountState& acc)
	{
		if (!acc.signedIn || !acc.clearsLoaded || acc.clears.groups.empty()) return;
		int cleared, total;
		CountClears(acc.clears, cleared, total);
		std::string label = "Weekly clear  " + std::to_string(cleared) + "/" + std::to_string(total);
		if (ImGui::Button(label.c_str())) g_showClears = !g_showClears;
	}

	/** Widest line of any wing cell: its title ("W3  Stronghold of the Faithful  0/4") or a boss with its mark. */
	float ClearsColumnWidth(const Api::WeeklyClears& clears)
	{
		const float spacing = ImGui::GetStyle().ItemSpacing.x, mark = 9.0f; // BossMark is 2 * 4.5 wide
		float width = 0;
		for (const auto& g : clears.groups)
		{
			std::string rest = g.name + "  " + std::to_string(g.bosses.size()) + "/" + std::to_string(g.bosses.size());
			width = std::max(width, ImGui::CalcTextSize(g.shortName.c_str()).x + spacing + ImGui::CalcTextSize(rest.c_str()).x);
			for (const auto& b : g.bosses) width = std::max(width, mark + spacing + ImGui::CalcTextSize(b.name.c_str()).x);
		}
		return width;
	}

	/** Separate window with every raid wing and the bosses killed since the weekly reset; sized to its content. */
	void RenderClearsWindow(const AccountState& acc)
	{
		if (!g_showClears) return;
		if (!acc.signedIn || !acc.clearsLoaded)
		{
			g_showClears = false;
			return;
		}

		if (ImGui::Begin("Weekly raid clear###GW2ArcDPSHelperClears", &g_showClears, ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_AlwaysAutoResize))
		{
			int cleared, total;
			CountClears(acc.clears, cleared, total);
			ImGui::Text("%d/%d bosses", cleared, total);
			ImGui::SameLine();
			ImGui::TextColored(GREY, "- resets in %s (Monday 07:30 UTC)", FormatUntil(acc.clears.nextResetMs).c_str());
			ImGui::Spacing();

			if (ImGui::BeginTable("clears", 3, ImGuiTableFlags_BordersInner | ImGuiTableFlags_PadOuterX))
			{
				// Explicit widths: with an auto-resizing window, ImGui's own sizing cut the last column off.
				float width = ClearsColumnWidth(acc.clears);
				for (int i = 0; i < 3; ++i) ImGui::TableSetupColumn(nullptr, ImGuiTableColumnFlags_WidthFixed, width);
				for (const auto& g : acc.clears.groups)
				{
					ImGui::TableNextColumn();
					int done = 0;
					for (const auto& b : g.bosses) done += b.cleared ? 1 : 0;
					bool full = done == (int)g.bosses.size();

					ImGui::TextColored(full ? GREEN : ImGui::GetStyleColorVec4(ImGuiCol_Text), "%s", g.shortName.c_str());
					ImGui::SameLine();
					ImGui::TextColored(GREY, "%s  %d/%d", g.name.c_str(), done, (int)g.bosses.size());
					for (const auto& b : g.bosses)
					{
						BossMark(b.cleared);
						if (b.cleared) ImGui::TextUnformatted(b.name.c_str());
						else ImGui::TextColored(GREY, "%s", b.name.c_str());
					}
					ImGui::Spacing();
				}
				ImGui::EndTable();
			}
			TextWrappedColored(GREY, "Kills from this addon, the desktop uploader and the website all count.");
		}
		ImGui::End();
	}

	void RenderUploads()
	{
		std::vector<Upload> uploads = Uploads::Snapshot();
		if (uploads.empty())
		{
			ImGui::TextColored(GREY, "No logs yet. Kill something!");
			return;
		}

		ImGuiTableFlags flags = ImGuiTableFlags_RowBg | ImGuiTableFlags_ScrollY | ImGuiTableFlags_SizingFixedFit | ImGuiTableFlags_BordersInnerH;
		if (!ImGui::BeginTable("uploads", 4, flags, ImVec2(0, ImGui::GetContentRegionAvail().y - ImGui::GetFrameHeightWithSpacing()))) return;

		ImGui::TableSetupScrollFreeze(0, 1);
		ImGui::TableSetupColumn("Boss", ImGuiTableColumnFlags_WidthStretch);
		ImGui::TableSetupColumn("Result");
		ImGui::TableSetupColumn("Time");
		ImGui::TableSetupColumn("Status");
		ImGui::TableHeadersRow();

		for (const Upload& u : uploads)
		{
			ImGui::PushID((int)u.id);
			ImGui::TableNextRow();

			ImGui::TableSetColumnIndex(0);
			std::string name = u.boss.empty() ? u.fileName : u.boss;
			if (!u.permalink.empty())
			{
				if (ImGui::Selectable(name.c_str(), false)) Util::OpenUrl(u.permalink);
				if (ImGui::IsItemHovered()) ImGui::SetTooltip("%s\nClick: open  |  Right-click: copy link", u.permalink.c_str());
				if (ImGui::IsItemClicked(ImGuiMouseButton_Right))
				{
					Util::CopyToClipboard(u.permalink);
					Alert("Link copied");
				}
			}
			else
			{
				ImGui::TextUnformatted(name.c_str());
			}

			ImGui::TableSetColumnIndex(1);
			if (u.success) ImGui::TextColored(*u.success ? GREEN : RED, *u.success ? "Kill" : "Wipe");
			else ImGui::TextColored(GREY, "-");

			ImGui::TableSetColumnIndex(2);
			if (u.durationMs > 0) ImGui::TextUnformatted(Util::FormatDuration(u.durationMs).c_str());
			else ImGui::TextColored(GREY, "-");

			ImGui::TableSetColumnIndex(3);
			if (u.stage == Stage::Failed)
			{
				ImGui::TextColored(RED, "Failed");
				if (ImGui::IsItemHovered()) ImGui::SetTooltip("%s", u.error.c_str());
				ImGui::SameLine();
				if (ImGui::SmallButton("Retry")) Uploads::Retry(u.id);
			}
			else
			{
				ImGui::TextColored(u.stage == Stage::Done ? (u.synced ? GREEN : GREY) : YELLOW, "%s", StageText(u));
			}
			ImGui::PopID();
		}
		ImGui::EndTable();

		if (ImGui::SmallButton("Clear finished")) Uploads::ClearFinished();
	}
}

namespace UI
{
	bool ShowWindow = true;

	void ApplyWatching()
	{
		Settings s = Config::Get();
		bool want = s.autoUpload && Util::DirectoryExists(s.logFolder);
		if (want && Watcher::IsRunning() && g_watchedFolder == s.logFolder) return;

		Watcher::Stop();
		g_watchedFolder.clear();
		if (want && Watcher::Start(s.logFolder, [](const std::wstring& path) { Uploads::Enqueue(path); }))
		{
			g_watchedFolder = s.logFolder;
		}
	}

	void RenderWindow()
	{
		RenderClearsWindow(Account::Get());
		if (!ShowWindow) return;

		ImGui::SetNextWindowSize(ImVec2(460, 360), ImGuiCond_FirstUseEver);
		if (ImGui::Begin(ADDON_NAME, &ShowWindow, ImGuiWindowFlags_NoCollapse))
		{
			AccountState acc = Account::Get();
			Settings s = Config::Get();

			RenderDesktopUploaderWarning(s.autoUpload);
			RenderRecording(acc);
			if (!acc.message.empty()) ImGui::TextColored(RED, "%s", acc.message.c_str());
			RenderClearsButton(acc);

			ImGui::Separator();

			bool autoUpload = s.autoUpload;
			if (ImGui::Checkbox("Auto-upload new logs", &autoUpload))
			{
				Config::Update([&](Settings& c) { c.autoUpload = autoUpload; });
				ApplyWatching();
			}
			ImGui::SameLine();
			if (!autoUpload) ImGui::TextColored(GREY, "(paused)");
			else if (Watcher::IsRunning()) ImGui::TextColored(GREEN, "(watching)");
			else ImGui::TextColored(RED, "(ArcDPS log folder not found - see options)");

			size_t pending = Uploads::PendingCount();
			if (pending)
			{
				ImGui::SameLine();
				ImGui::TextColored(YELLOW, "%zu in queue", pending);
			}

			RenderUploads();
		}
		ImGui::End();
	}

	void RenderOptions()
	{
		Settings s = Config::Get();
		AccountState acc = Account::Get();
		if (!g_optionsInit)
		{
			Copy(g_email, sizeof(g_email), s.email);
			Copy(g_logFolder, sizeof(g_logFolder), s.logFolder);
			g_optionsInit = true;
		}

		RenderHowItWorks();
		ImGui::Separator();

		ImGui::TextUnformatted("GW2 ArcDPS Helper account");
		if (acc.signedIn)
		{
			ImGui::Text("Signed in as %s%s%s", acc.email.c_str(), acc.gw2Account.empty() ? "" : " - ", acc.gw2Account.c_str());
			if (ImGui::Button("Sign out")) Account::Logout();
		}
		else
		{
			ImGui::SetNextItemWidth(260);
			ImGui::InputText("Email", g_email, sizeof(g_email));
			ImGui::SetNextItemWidth(260);
			bool submit = ImGui::InputText("Password", g_password, sizeof(g_password), ImGuiInputTextFlags_Password | ImGuiInputTextFlags_EnterReturnsTrue);
			BeginDisabled(acc.busy);
			if ((ImGui::Button(acc.busy ? "Signing in..." : "Sign in") || submit) && !acc.busy && g_email[0] && g_password[0])
			{
				Account::Login(g_email, g_password);
				SecureZeroMemory(g_password, sizeof(g_password));
			}
			EndDisabled();
			ImGui::SameLine();
			// Resetting happens on the website: it emails a link to a page where the new password is chosen.
			if (ImGui::Button("Forgot password?")) Util::OpenUrl(std::string(WEB_URL) + "/forgot-password");
		}
		if (!acc.message.empty()) ImGui::TextColored(RED, "%s", acc.message.c_str());

		ImGui::Separator();
		ImGui::TextUnformatted("Uploads");
		TextWrappedColored(GREY,
			"Use either this addon or the GW2 ArcDPS Helper desktop uploader, not both: with both running, every log is "
			"uploaded twice. Quit the desktop uploader (tray icon > Quit) while you play with the addon.");

		bool autoUpload = s.autoUpload, showAlerts = s.showAlerts;
		if (ImGui::Checkbox("Auto-upload new logs", &autoUpload))
		{
			Config::Update([&](Settings& c) { c.autoUpload = autoUpload; });
			ApplyWatching();
		}
		RenderDesktopUploaderWarning(autoUpload);
		if (ImGui::Checkbox("Show an alert when a log is uploaded", &showAlerts))
		{
			Config::Update([&](Settings& c) { c.showAlerts = showAlerts; });
		}

		ImGui::SetNextItemWidth(420);
		ImGui::InputText("ArcDPS log folder", g_logFolder, sizeof(g_logFolder));
		if (ImGui::IsItemDeactivatedAfterEdit())
		{
			Config::Update([](Settings& c) { c.logFolder = g_logFolder; });
			ApplyWatching();
		}
		ImGui::SameLine();
		if (ImGui::SmallButton("Default"))
		{
			Copy(g_logFolder, sizeof(g_logFolder), Util::DefaultLogFolder());
			Config::Update([](Settings& c) { c.logFolder = g_logFolder; });
			ApplyWatching();
		}
		if (!Util::DirectoryExists(g_logFolder)) ImGui::TextColored(RED, "This folder does not exist.");
	}
}
