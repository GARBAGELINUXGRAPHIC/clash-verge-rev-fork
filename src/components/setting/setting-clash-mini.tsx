import { DialogRef, Switch } from "@/components/base";
import { TooltipIcon } from "@/components/base/base-tooltip-icon";
import { useClash } from "@/hooks/use-clash";
import { useListen } from "@/hooks/use-listen";
import { useVerge } from "@/hooks/use-verge";
import { closeAllConnections, updateGeoData } from "@/services/api";
import { showNotice } from "@/services/noticeService";
import { LanRounded, SettingsRounded } from "@mui/icons-material";
import { invoke } from "@tauri-apps/api/core";
import { useLockFn } from "ahooks";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClashCoreViewer } from "./mods/clash-core-viewer";
import { ClashPortViewer } from "./mods/clash-port-viewer";
import { ControllerViewer } from "./mods/controller-viewer";
import { DnsViewer } from "./mods/dns-viewer";
import { GuardState } from "./mods/guard-state";
import { NetworkInterfaceViewer } from "./mods/network-interface-viewer";
import { SettingItem, SettingList } from "./mods/setting-comp";
import { WebUIViewer } from "./mods/web-ui-viewer";
import { HeaderConfiguration } from "./mods/external-controller-cors";
import { types } from "sass";
import Error = types.Error;
import setupRef from "@/utils/setupInterface";
import { sleep } from "@/utils/sleep";

interface Props {
  onError: (err: Error) => void;
  ref?: React.RefObject<setupRef | null>;
}

const SettingClash = ({ onError, ref }: Props) => {
  const { t } = useTranslation();

  const { clash, version, mutateClash, patchClash } = useClash();
  const { verge, mutateVerge, patchVerge } = useVerge();

  const {
    ipv6,
    "allow-lan": allowLan,
    "log-level": logLevel,
    "unified-delay": unifiedDelay,
    dns,
  } = clash ?? {};

  const { enable_random_port = false, verge_mixed_port } = verge ?? {};

  // 独立跟踪DNS设置开关状态
  const [dnsSettingsEnabled, setDnsSettingsEnabled] = useState(() => {
    return verge?.enable_dns_settings ?? false;
  });

  const { addListener } = useListen();

  const webRef = useRef<DialogRef>(null);
  const portRef = useRef<DialogRef>(null);
  const ctrlRef = useRef<DialogRef>(null);
  const coreRef = useRef<DialogRef>(null);
  const networkRef = useRef<DialogRef>(null);
  const dnsRef = useRef<DialogRef>(null);
  const corsRef = useRef<DialogRef>(null);

  const onSwitchFormat = (_e: any, value: boolean) => value;
  const onChangeData = (patch: Partial<IConfigData>) => {
    mutateClash((old) => ({ ...(old! || {}), ...patch }), false);
  };
  const onChangeVerge = (patch: Partial<IVergeConfig>) => {
    mutateVerge({ ...verge, ...patch }, false);
  };
  const onUpdateGeo = async () => {
    try {
      await updateGeoData();
      showNotice("success", t("GeoData Updated"));
    } catch (err: any) {
      showNotice("error", err?.response.data.message || err.toString());
    }
  };

  // 实现DNS设置开关处理函数
  const handleDnsToggle = useLockFn(async (enable: boolean) => {
    try {
      setDnsSettingsEnabled(enable);
      localStorage.setItem("dns_settings_enabled", String(enable));
      await patchVerge({ enable_dns_settings: enable });
      await invoke("apply_dns_config", { apply: enable });
      setTimeout(() => {
        mutateClash();
      }, 500);
    } catch (err: any) {
      setDnsSettingsEnabled(!enable);
      localStorage.setItem("dns_settings_enabled", String(!enable));
      showNotice("error", err.message || err.toString());
      await patchVerge({ enable_dns_settings: !enable }).catch(() => {});
      throw err;
    }
  });

  useEffect(() => {
    if (ref) {
      ref.current = {
        async Setup() {
          // open allow lan (in case somebody need to use VMs or wsl or other devices through host)
          if (!allowLan) {
            await patchClash({ "allow-lan": true });
          }
          // disable DNS overwrite, use profile's dns settings
          if(dnsSettingsEnabled) {
            await handleDnsToggle(false);
          }
          // open ipv6
          if(!ipv6) {
            await patchClash({ ipv6: true })
          }
        }
      };
    }
  }, [ref]);

  return (
    <SettingList title={t("Clash Setting")}>
      <WebUIViewer ref={webRef} />
      <ClashPortViewer ref={portRef} />
      <ControllerViewer ref={ctrlRef} />
      <ClashCoreViewer ref={coreRef} />
      <NetworkInterfaceViewer ref={networkRef} />
      <DnsViewer ref={dnsRef} />
      <HeaderConfiguration ref={corsRef} />

      <SettingItem
        label={t("Allow Lan")}
        extra={
          <TooltipIcon
            title={t("Network Interface")}
            color={"inherit"}
            icon={LanRounded}
            onClick={() => {
              networkRef.current?.open();
            }}
          />
        }
      >
        <GuardState
          value={allowLan ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ "allow-lan": e })}
          onGuard={(e) => patchClash({ "allow-lan": e })}
        >
          <Switch edge="end" />
        </GuardState>
      </SettingItem>

      <SettingItem
        label={t("DNS Overwrite")}
        extra={
          <TooltipIcon
            icon={SettingsRounded}
            onClick={() => dnsRef.current?.open()}
          />
        }
      >
        <Switch
          edge="end"
          checked={dnsSettingsEnabled}
          onChange={(_, checked) => handleDnsToggle(checked)}
        />
      </SettingItem>

      <SettingItem label={t("IPv6")}>
        <GuardState
          value={ipv6 ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(e) => onChangeData({ ipv6: e })}
          onGuard={(e) => patchClash({ ipv6: e })}
        >
          <Switch edge="end" />
        </GuardState>
      </SettingItem>
    </SettingList>
  );
};

export default SettingClash;
