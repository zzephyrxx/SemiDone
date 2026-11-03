import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { packagePreviewDmg } from './package-appstore-preview-dmg.mjs';

// Build locally only. Uploading and publishing are deliberately separate steps.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const preview = process.argv.includes('--preview');
const output = resolve('release/appstore');
mkdirSync(output, { recursive: true });
const run = (file, args, options = {}) => execFileSync(file, args, { stdio: 'inherit', ...options });
const required = key => {
  if (!process.env[key]) throw new Error(`请配置 ${key}，详见 APP_STORE.md`);
  return process.env[key];
};
if (process.platform !== 'darwin' || process.arch !== 'arm64') {
  throw new Error('当前商店构建目标为 Apple Silicon，请在对应 Mac 上构建');
}
const config = JSON.parse(readFileSync('src-tauri/tauri.appstore.conf.json', 'utf8'));
config.bundle.macOS.entitlements = resolve(output, 'Entitlements.plist');
config.bundle.macOS.infoPlist = resolve('src-tauri/appstore/Info.plist');
config.bundle.macOS.bundleVersion = process.env.SEMIDONE_BUILD_NUMBER || '1';
if (!/^\d+$/.test(config.bundle.macOS.bundleVersion)) throw new Error('构建号必须为整数');
let entitlements = readFileSync('src-tauri/appstore/Entitlements.plist', 'utf8');
let privacyUrl = '';
let installerIdentity;
if (preview) {
  config.bundle.macOS.signingIdentity = '-';
} else {
  const team = required('APPLE_TEAM_ID');
  const profile = resolve(required('SEMIDONE_PROVISION_PROFILE'));
  config.bundle.macOS.signingIdentity = required('SEMIDONE_APP_SIGNING_IDENTITY');
  installerIdentity = required('SEMIDONE_INSTALLER_SIGNING_IDENTITY');
  privacyUrl = required('SEMIDONE_PRIVACY_URL');
  if (new URL(privacyUrl).protocol !== 'https:') throw new Error('隐私政策必须为 HTTPS 地址');
  required('SEMIDONE_BUILD_NUMBER');
  const decoded = resolve(output, 'profile.plist');
  run('/usr/bin/security', ['cms', '-D', '-i', profile, '-o', decoded]);
  const profileEntitlements = JSON.parse(execFileSync('/usr/bin/plutil', ['-extract', 'Entitlements', 'json', '-o', '-', decoded], { encoding: 'utf8' }));
  const appId = profileEntitlements['com.apple.application-identifier'];
  if (appId !== `${team}.${config.identifier}` || profileEntitlements['com.apple.developer.team-identifier'] !== team) {
    throw new Error('描述文件的 App ID 或 Team ID 与配置不匹配');
  }
  if (!profileEntitlements['com.apple.security.app-sandbox'] || profileEntitlements['get-task-allow']) {
    throw new Error('请使用启用沙盒的 Mac App Store Connect 分发描述文件');
  }
  entitlements = entitlements.replace('</dict>', `<key>com.apple.application-identifier</key><string>${appId}</string><key>com.apple.developer.team-identifier</key><string>${team}</string></dict>`);
  config.bundle.macOS.files = { 'embedded.provisionprofile': profile };
  config.app.security.capabilities[0].permissions.find(item => item.identifier === 'opener:allow-open-url').allow.push({ url: privacyUrl });
}
writeFileSync(config.bundle.macOS.entitlements, entitlements);
const configPath = resolve(output, 'tauri.appstore.generated.json');
writeFileSync(configPath, JSON.stringify(config, null, 2));
run('npm', ['run', 'build:tauri', '--', '--target', 'aarch64-apple-darwin', '--bundles', 'app', '--features', 'app-store', '--config', configPath, '--', '--no-default-features'], {
  env: { ...process.env, VITE_DISTRIBUTION: 'app-store', VITE_PRIVACY_POLICY_URL: privacyUrl,
    CARGO_TARGET_DIR: resolve('src-tauri/target/appstore'),
    APPLE_SIGNING_IDENTITY: config.bundle.macOS.signingIdentity },
});
const app = resolve('src-tauri/target/appstore/aarch64-apple-darwin/release/bundle/macos/事半·SemiDone.app');
run('/usr/bin/codesign', ['--verify', '--deep', '--strict', app]);
const signed = execFileSync('/usr/bin/codesign', ['-d', '--entitlements', ':-', app], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const signedPlist = resolve(output, 'signed-entitlements.plist');
writeFileSync(signedPlist, signed);
const finalEntitlements = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', signedPlist], { encoding: 'utf8' }));
if (finalEntitlements['com.apple.security.app-sandbox'] !== true) throw new Error('最终应用没有启用沙盒');
if (preview) {
  packagePreviewDmg(app);
  console.log(`沙盒预览包：${app}\n预览包不能提交商店；需要在本机验证文件授权和窗口行为。`);
} else {
  const pkg = resolve(output, `SemiDone_${config.bundle.macOS.bundleVersion}.pkg`);
  run('/usr/bin/productbuild', ['--component', app, '/Applications', '--sign', installerIdentity, pkg]);
  run('/usr/sbin/pkgutil', ['--check-signature', pkg]);
  console.log(`商店候选安装包：${pkg}\n未上传；请完成 APP_STORE.md 中的实机及提交前检查。`);
}
