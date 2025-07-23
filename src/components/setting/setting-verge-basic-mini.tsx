import React, { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { Button, MenuItem, Select, Input } from "@mui/material";
import { copyClashEnv } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import { DialogRef } from "@/components/base";
import { SettingList, SettingItem } from "./mods/setting-comp";
import { ThemeModeSwitch } from "./mods/theme-mode-switch";
import { ConfigViewer } from "./mods/config-viewer";
import { HotkeyViewer } from "./mods/hotkey-viewer";
import { MiscViewer } from "./mods/misc-viewer";
import { ThemeViewer } from "./mods/theme-viewer";
import { GuardState } from "./mods/guard-state";
import { LayoutViewer } from "./mods/layout-viewer";
import { UpdateViewer } from "./mods/update-viewer";
import { BackupViewer } from "./mods/backup-viewer";
import getSystem from "@/utils/get-system";
import { routers } from "@/pages/_routers";
import { TooltipIcon } from "@/components/base/base-tooltip-icon";
import { ContentCopyRounded } from "@mui/icons-material";
import { languages } from "@/services/i18n";
import { showNotice } from "@/services/noticeService";
import { types } from "sass";
import Error = types.Error;
import setupRef from "@/utils/setupInterface";
import { closeAllConnections } from "@/services/api";

interface Props {
  onError: (err: Error) => void;
  ref?: React.RefObject<setupRef | null>;
}

const OS = getSystem();

const languageOptions = Object.entries(languages).map(([code, _]) => {
  const labels: { [key: string]: string } = {
    en: "English",
    ru: "Русский",
    zh: "中文",
    fa: "فارسی",
    tt: "Татар",
    id: "Bahasa Indonesia",
    ar: "العربية",
    ko: "한국어",
    tr: "Türkçe",
  };
  return { code, label: labels[code] };
});

const SettingVergeBasic = ({ onError, ref }: Props) => {
  const { t } = useTranslation();

  const { verge, patchVerge, mutateVerge } = useVerge();
  const {
    theme_mode,
    language,
    tray_event,
    env_type,
    startup_script,
    start_page,
  } = verge ?? {};
  const configRef = useRef<DialogRef>(null);
  const hotkeyRef = useRef<DialogRef>(null);
  const miscRef = useRef<DialogRef>(null);
  const themeRef = useRef<DialogRef>(null);
  const layoutRef = useRef<DialogRef>(null);
  const updateRef = useRef<DialogRef>(null);
  const backupRef = useRef<DialogRef>(null);

  const onChangeData = (patch: any) => {
    mutateVerge({ ...verge, ...patch }, false);
  };

  const onCopyClashEnv = useCallback(async () => {
    await copyClashEnv();
    showNotice("success", t("Copy Success"), 1000);
  }, []);

  useEffect(() => {
    if (ref) {
      ref.current = {
        async Setup() {
          // set startup page to Easy
          if(!start_page || start_page?.toLowerCase() !== '/easy') {
            await patchVerge({ start_page: '/easy' })
          }
        }
      };
    }
  }, [ref]);

  return (
    <SettingList title={t("Verge Basic Setting")}>
      <ThemeViewer ref={themeRef} />
      <ConfigViewer ref={configRef} />
      <HotkeyViewer ref={hotkeyRef} />
      <MiscViewer ref={miscRef} />
      <LayoutViewer ref={layoutRef} />
      <UpdateViewer ref={updateRef} />
      <BackupViewer ref={backupRef} />

      <SettingItem label={t("Start Page")}>
        <GuardState
          value={start_page ?? "/"}
          onCatch={onError}
          onFormat={(e: any) => e.target.value}
          onChange={(e) => onChangeData({ start_page: e })}
          onGuard={(e) => patchVerge({ start_page: e })}
        >
          <Select size="small" sx={{ width: 140, "> div": { py: "7.5px" } }}>
            {routers.map((page: { label: string; path: string }) => {
              return (
                <MenuItem key={page.path} value={page.path}>
                  {t(page.label)}
                </MenuItem>
              );
            })}
          </Select>
        </GuardState>
      </SettingItem>
    </SettingList>
  );
};

export default SettingVergeBasic;
