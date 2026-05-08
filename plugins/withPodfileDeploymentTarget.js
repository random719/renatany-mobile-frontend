const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withPodfileDeploymentTarget = (config, version) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes('IPHONEOS_DEPLOYMENT_TARGET')) return config;

      podfile = podfile.replace(
        /post_install do \|installer\|/g,
        `post_install do |installer|\n  installer.pods_project.targets.each do |target|\n    target.build_configurations.each do |config|\n      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${version}'\n    end\n  end\n`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withPodfileDeploymentTarget;
