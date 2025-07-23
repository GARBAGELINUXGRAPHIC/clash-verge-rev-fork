import { Box, ButtonGroup, IconButton, Grid, Button } from "@mui/material";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { BasePage } from "@/components/base";
import { openWebUrl, restartApp } from "@/services/cmds";
import SettingVergeBasic from "@/components/setting/setting-verge-basic-mini";
import SettingVergeAdvanced from "@/components/setting/setting-verge-advanced-mini";
import SettingClash from "@/components/setting/setting-clash-mini";
import SettingSystem from "@/components/setting/setting-system-mini";
import { useThemeMode } from "@/services/states";
import { showNotice } from "@/services/noticeService";
import { useRef } from "react";

import setupRef from "@/utils/setupInterface";
import settingVergeBasic from "@/components/setting/setting-verge-basic";
import settingClash from "@/components/setting/setting-clash";
import settingSystemMini from "@/components/setting/setting-system-mini";
import { sleep } from "@/utils/sleep";

const SettingPage = () => {
  const { t } = useTranslation();

  const onError = (err: any) => {
    showNotice("error", err?.message || err.toString());
  };

  const mode = useThemeMode();
  const isDark = mode !== "light";

  const settingSystemRef = useRef<setupRef | null>(null);
  const settingVergeBasicRef = useRef<setupRef | null>(null);
  const settingClashRef = useRef<setupRef | null>(null);

  async function Setup() {
    try {
      if (settingSystemRef.current) {
        await settingSystemRef.current.Setup();
      } else {
        throw new Error("settingSystemRef doesn't have function 'Setup'");
      }
      if (settingVergeBasicRef.current) {
        await settingVergeBasicRef.current.Setup();
      } else {
        throw new Error("settingVergeBasicRef doesn't have function 'Setup'");
      }
      if (settingClashRef.current) {
        await settingClashRef.current.Setup();
      } else {
        throw new Error("settingClashRef doesn't have function 'Setup'");
      }
      //restartApp()
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <BasePage
      title={t("EasyMode")}
    >
      <Box
        sx={{
          borderRadius: 2,
          marginBottom: 1.5,
          backgroundColor: isDark ? "#282a36" : "#ffffff",
          padding: 2,
        }}
      >
        <ButtonGroup>
          <Button onClick={() => Setup()} >{t('one-click-setup')}</Button>
        </ButtonGroup>
      </Box>
      <Grid container spacing={1.5} columns={{ xs: 6, sm: 6, md: 12 }}>
        <Grid size={6}>
          <Box
            sx={{
              borderRadius: 2,
              marginBottom: 1.5,
              backgroundColor: isDark ? "#282a36" : "#ffffff",
            }}
          >
            <SettingSystem ref={settingSystemRef} onError={onError} />
          </Box>
        </Grid>
        <Grid size={6}>
          <Box
            sx={{
              borderRadius: 2,
              marginBottom: 1.5,
              backgroundColor: isDark ? "#282a36" : "#ffffff",
            }}
          >
            <SettingClash ref={settingClashRef} onError={onError} />
          </Box>
          <Box
            sx={{
              borderRadius: 2,
              marginBottom: 1.5,
              backgroundColor: isDark ? "#282a36" : "#ffffff",
            }}
          >
            <SettingVergeBasic ref={settingVergeBasicRef} onError={onError} />
          </Box>
          {/* Nothing is useful in Setting Verge Advanced, so it's commented out now. Maybe, just maybe it will be useful one day.*/
           /* <Box
            sx={{
            borderRadius: 2,
            backgroundColor: isDark ? "#282a36" : "#ffffff",
          }}
        >
          <SettingVergeAdvanced onError={onError} />
        </Box>*/}
        </Grid>
      </Grid>
    </BasePage>
  );
};

export default SettingPage;
