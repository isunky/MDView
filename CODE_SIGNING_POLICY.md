# Code signing policy / 代码签名政策

Free code signing provided by SignPath.io, certificate by SignPath Foundation

## Scope / 适用范围

This policy applies to official Windows MSI installers and the `MDView.exe` executable in official Portable ZIP releases published from [isunky/MDView](https://github.com/isunky/MDView).

本政策适用于从 [isunky/MDView](https://github.com/isunky/MDView) 发布的官方 Windows MSI 安装包，以及官方 Portable ZIP 中的 `MDView.exe`。

## Release authorization / 发布授权

- `@isunky` is the sole author, reviewer, and approver for signing requests.
- `@isunky` 是签名请求的唯一作者、审查者和批准者。
- Official builds run only in the repository's GitHub-hosted Actions workflows. The Release workflow submits unsigned artifacts to SignPath and requires manual approval before the signed artifacts are published.
- 官方构建仅在本仓库的 GitHub 托管 Actions 工作流中执行。Release 工作流提交未签名产物到 SignPath，人工批准后才发布已签名产物。
- [CODEOWNERS](.github/CODEOWNERS) designates `@isunky` as the owner of SignPath configuration and GitHub workflow changes. Enable required code-owner review in the repository branch ruleset to enforce it.
- [CODEOWNERS](.github/CODEOWNERS) 将 `@isunky` 指定为 SignPath 配置和 GitHub 工作流变更的所有者；请在仓库分支规则中启用必须的代码所有者审查以强制执行。

## Privacy and security / 隐私与安全

- MDView does not include telemetry and does not automatically upload local Markdown content.
- MDView 不包含遥测功能，也不会自动上传本地 Markdown 内容。
- Network access occurs only when a user checks or downloads an update, opens an external link, or opens a document that explicitly references a remote resource.
- 仅当用户检查或下载更新、打开外部链接，或打开明确引用远程资源的文档时，应用才会访问网络。
- Security concerns should be reported through the repository's GitHub security reporting channel when available, or by opening an issue without disclosing exploit details.
- 安全问题请优先通过仓库的 GitHub 安全报告渠道提交；若该渠道不可用，请创建不包含利用细节的 Issue。

## Verification / 验证方式

Each official Windows release includes `SHA256SUMS.txt`. After download, verify that the file hash matches the release checksum and inspect the Authenticode publisher in Windows file properties.

每个官方 Windows Release 都包含 `SHA256SUMS.txt`。下载后请核对文件哈希与发布校验和一致，并在 Windows 文件属性中检查 Authenticode 发布者。

## License / 许可证

MDView is distributed under the [Apache-2.0 License](LICENSE).

MDView 使用 [Apache-2.0 License](LICENSE) 发布。
