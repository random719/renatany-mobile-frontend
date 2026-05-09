const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MIN_IOS_DEPLOYMENT_TARGET = '16.0';

// Matches any IPHONEOS_DEPLOYMENT_TARGET = X.X; entry in project.pbxproj
const DEPLOYMENT_TARGET_REGEX = /IPHONEOS_DEPLOYMENT_TARGET = [\d.]+;/g;

function setDeploymentTargetInPbxproj(pbxprojPath) {
  if (!fs.existsSync(pbxprojPath)) return;
  let pbxproj = fs.readFileSync(pbxprojPath, 'utf8');
  if (DEPLOYMENT_TARGET_REGEX.test(pbxproj)) {
    pbxproj = pbxproj.replace(
      DEPLOYMENT_TARGET_REGEX,
      `IPHONEOS_DEPLOYMENT_TARGET = ${MIN_IOS_DEPLOYMENT_TARGET};`
    );
    fs.writeFileSync(pbxprojPath, pbxproj);
    console.log(`[withLottieDowngrade] Set ALL IPHONEOS_DEPLOYMENT_TARGET to ${MIN_IOS_DEPLOYMENT_TARGET} in project.pbxproj`);
  }
}

function addLottiePod(podfilePath) {
  if (!fs.existsSync(podfilePath)) return;
  let podfile = fs.readFileSync(podfilePath, 'utf8');
  if (podfile.includes("pod 'lottie-ios'")) return;
  podfile = podfile.replace(
    /target '\w+' do/g,
    (match) => `${match}\n  pod 'lottie-ios', '~> 4.2.0'`
  );
  fs.writeFileSync(podfilePath, podfile);
  console.log('[withLottieDowngrade] Added lottie-ios pod to Podfile');
}

function ensureDeploymentTargetInPostInstall(podfilePath) {
  if (!fs.existsSync(podfilePath)) return;
  let podfile = fs.readFileSync(podfilePath, 'utf8');

  // Check if the deployment target override already exists
  if (podfile.includes("pods_project.targets.each")) return;

  // Match react_native_post_install(...) call and its closing end statement
  // Inject the deployment target override AFTER react_native_post_install
  const rnPostInstallRegex =
    /(react_native_post_install\(\s*installer,\s*config\[:reactNativePath\],\s*:mac_catalyst_enabled\s*=>\s*false,\s*:ccache_enabled\s*=>\s*ccache_enabled\?\(podfile_properties\),\s*\)\s*\n)(\s*end\b)/;

  if (rnPostInstallRegex.test(podfile)) {
    const deploymentOverride =
      `\n    installer.pods_project.targets.each do |target|\n` +
      `      target.build_configurations.each do |config|\n` +
      `        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${MIN_IOS_DEPLOYMENT_TARGET}'\n` +
      `      end\n` +
      `    end\n`;

    podfile = podfile.replace(
      rnPostInstallRegex,
      `$1${deploymentOverride}$2`
    );
    fs.writeFileSync(podfilePath, podfile);
    console.log(`[withLottieDowngrade] Added deployment target override to Podfile post_install`);
  }
}

const withLottieDowngrade = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;
      const podfilePath = path.join(platformRoot, 'Podfile');
      const pbxprojPath = path.join(
        platformRoot,
        'RentAny.xcodeproj',
        'project.pbxproj'
      );

      try {
        addLottiePod(podfilePath);
      } catch (e) {
        console.log(`[withLottieDowngrade] ERROR adding lottie pod: ${e.message}`);
      }

      try {
        ensureDeploymentTargetInPostInstall(podfilePath);
      } catch (e) {
        console.log(`[withLottieDowngrade] ERROR in post_install: ${e.message}`);
      }

      try {
        setDeploymentTargetInPbxproj(pbxprojPath);
      } catch (e) {
        console.log(`[withLottieDowngrade] ERROR in pbxproj fix: ${e.message}`);
      }

      // Write a verification file to confirm this plugin ran
      try {
        const verifyPath = path.join(platformRoot, '.withLottieDowngrade.done');
        fs.writeFileSync(verifyPath, `Ran at ${new Date().toISOString()}\npbxproj: ${fs.existsSync(pbxprojPath)}\n`);
      } catch (e) {
        // ignore
      }

      return config;
    },
  ]);
};

module.exports = withLottieDowngrade;
