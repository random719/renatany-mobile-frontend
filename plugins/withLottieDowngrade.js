const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withLottieDowngrade = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return config;
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes("pod 'lottie-ios'")) return config;

      podfile = podfile.replace(
        /target '\w+' do/g,
        (match) => `${match}\n  pod 'lottie-ios', '~> 4.2.0'`
      );

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withLottieDowngrade;
