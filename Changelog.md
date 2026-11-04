<!-- Release-notes skeleton. Entries accumulate in ./Changelog.md as PRs land;
     before publishing a release, distill them:
     - user-visible changes only — no dev tooling, CI fixes, or refactors whose
       effect is already covered by another entry
     - describe outcomes, not internals: no internal module names, IPC or
       protocol details, or implementation mechanics — write what the user
       observes, not how the code achieves it
     - one line per theme: merge entries that share a root cause
     - each entry fits a single readable line (about 60 CJK characters); if it
       overflows, it is packing multiple themes or detail that belongs in the
       linked issue/PR — split it or drop the detail
     - line grammar: open with a verb (修复/新增/优化), with the platform
       first (Windows/macOS/Linux) when the change is platform-specific;
       merge sub-symptoms as 主题：症状、症状; full-width punctuation,
       「」 for UI labels, backticks for config keys and commands
     - platform entries sit under their platform heading (bold, emoji
       prefixed, ordered Windows/macOS/Linux, combined for pairs like
       macOS/Linux) at the end of their section;
       scripts-workflow/group_platforms.sh regroups, --check verifies
     HTML comments are stripped by the update dialog's sanitizer and hidden on
     GitHub, so they never reach users. -->
## v2.5.10

<details>
<summary><strong> 🐞 修复问题 </strong></summary>

- 修复弹窗打开时，通知提示显示不完整的问题
- 修复不同来源的订阅或规则集共用缓存路径时，服务模式无法启动内核的问题
- 优化文件错误日志，显示具体文件路径和失败原因
- 修复 DNS 覆写：空内容报错、初始值覆盖已有设置、已填写字段残留原配置、空字段在高级编辑器中缺失
- 修复 DNS 覆写中已填写的字段被 Merge 或 Script 覆盖的问题，空字段继续使用扩展配置
- 修复 Merge 覆写 DNS 策略、过滤条件和 hosts 时，旧条目仍被保留的问题
- 修复首次以管理员身份启动后，系统服务因数据目录所有权不符而拒绝启动内核的问题
- 修复重新安装服务后内核缺失、无法继续使用 Sidecar 的问题
- 修复内核未运行时，首页仍显示服务模式的问题
- 修复服务重装重复请求管理员授权、卸载后误报失败的问题
- 修复读屏软件将普通模式下的侧边栏导航项播报为不可用的可拖拽控件的问题
- 修复订阅包含自定义 DNS 时，确认开启的 DNS 覆写在重启应用后被自动关闭的问题
- 修复系统托盘代理组行不显示延迟、超时项与未测过项无法区分的问题
- 修复不同订阅源的同名节点测速和延迟显示指向错误节点的问题
- 修复端口设置混淆保存值与运行值、输入无效时缺少提示的问题
- 修复已有内核进程阻止启动时缺少多语言说明和处理建议的问题
- 修复从开始菜单再次打开应用后，窗口反复弹出并提示启动失败的问题
- 修复多个代理集合包含同名节点时，代理组中的节点变灰并显示 ambiguous、无法选择的问题
- 修复下载更新时镜像缓慢或卡住不会切换下载地址、点击「取消」无法中止下载的问题
- 修复从 Dock 退出、注销或关机时，应用可能长时间卡住无法退出的问题
- 修复宽窗口下「订阅」页每行显示过多卡片，导致配置名称被截断的问题

**🖥️ Windows**

- 修复 Windows 升级后因文件权限异常无法启动、需要手动清理配置的问题
- 修复 Windows 服务启动类型被改为手动后，软件启动卡住约两分钟的问题，并提供一键修复
- 修复 Windows 长时间运行后，托盘菜单点击无响应的问题

**🐧 Linux**

- 修复 Linux 安装或卸载服务时授权失败的问题

**🍎/🐧 macOS/Linux**

- 修复 macOS/Linux 系统代理绕过规则未正确生效的问题
- 修复 macOS/Linux 因旧版服务缓存权限异常而无法记住节点的问题

</details>

<details>
<summary><strong> ✨ 新增功能 </strong></summary>

- 新增点击 Hysteria2 协议调整 BBR 预设或 Brutal 带宽，支持定时恢复订阅设置
- 新增混合代理端口自动避让，被占用时临时使用其他端口
- 新增系统代理和 TUN 权限引导，可直接安装服务并恢复原设置
- 新增服务模式多用户隔离，支持旧版服务升级迁移
- 新增手动取消节点固定功能
- 新增代理组标题栏拖动调整，可交换组名和工具栏的位置
- 新增前置规则与后置规则互相移动功能
- 新增 DNS 覆写保护：订阅含自定义 DNS 时先确认，订阅更新后自动关闭覆写
- 新增代理页排查提示，方便检查订阅和内核状态
- 新增订阅更新频率提醒，间隔不足 24 小时时提示
- 新增启动失败提示，显示原因并保存启动日志
- 新增 TUN「Mips」堆栈选项，需配合 mihomo v1.19.31 及以上内核
- 修复全局模式缺少 `GLOBAL` 策略组，无法单独选择全局出口
- 修复服务模式下，SSH 节点的 `private-key` 使用私钥文件时内核无法启动
- 修复服务模式下，内核更新的 GEO 数据库不会同步回应用目录，导致使用新分类的规则无法通过校验
- 修复订阅的 DNS 配置变化后，「DNS 覆写」实际已关闭但开关仍显示开启且没有提示

**🖥️ Windows**

- Windows：修复安装程序重新安装或覆盖时未提示退出运行中应用，导致卸载报错或覆盖失败

**🍎 macOS**

- 新增 macOS Liquid Glass 风格图标
- 新增 macOS 多用户启动保护，避免多个实例冲突
- macOS 修复启动或重启应用时偶发内核启动失败，并误提示「需要更新系统服务」的问题
- macOS 修复 VPN 接管网络或开机网络未就绪时的问题：服务模式内核无法启动、TUN 不可用、系统代理状态读取报错
- macOS 修复用 `ipconfig set` 手动配置网卡后无法设置系统代理的问题
- 修复 macOS 关闭 TUN 或退出后，系统 DNS 仍停留在 `114.114.114.114` 导致无法解析域名的问题

**🐧 Linux**

- 新增 Linux 系统主题跟随，自动切换深浅色外观
- Linux 修复安装或修复服务后仍无法启动内核、开启 TUN 模式的问题

**🖥️/🍎 Windows/macOS**

- 修复 Windows/macOS 打开系统托盘菜单时，节点延迟与自动选择状态未刷新的问题

</details>

<details>
<summary><strong> ✨ 新增功能 </strong></summary>


</details>

<details>
<summary><strong> 🚀 优化改进 </strong></summary>

- 优化「复制环境变量」布局，将复制图标整合至终端类型选择框，点击即可复制
- 优化 Hysteria2 设置：显示当前状态，支持固定档位滑块与手动输入上传、下载速度
- 优化设置弹窗布局，移除重复的「关闭」按钮和多余色块
- 优化 DNS 模式和网段编辑，使用分段切换、文字标签与描边样式
- 优化外部控制跨域设置，将添加来源按钮移至标题右侧
- 优化个人版更新流程：移除后台自动下载安装包和启动时的安装提示
- 优化整体界面：统一明暗外观，优化工作页、弹窗和文字排版
- 优化默认入口：移除首页，默认进入代理页，兼容旧版启动设置
- 优化扩展覆写配置和脚本编辑窗口，提示作用范围、执行顺序及应用设置优先级，并高亮当前步骤
- 优化 DNS 覆写开关：按订阅独立记忆，自动关闭仅影响当前订阅，并提示作用范围
- 优化系统服务兼容性检查：升级后服务版本或协议不兼容时，提示重新安装
- 优化预构建资源，补充 ASN 数据库文件
- 扩展配置或脚本写入由应用设置接管的字段时，弹出提示并在扩展日志中记录该值已被丢弃
- 优化服务模式的问题排查：服务自身的运行日志会保存到文件，便于追查内核被停止的原因
- 优化端口设置窗口的实现，精简重复代码
- 优化侧边栏流量图表的 CPU 占用

**🖥️ Windows**

- 优化 Windows 服务安全检查未通过时的提示：启动、安装或修复服务时说明原因与内核占用，并提供处理方法

</details>
