const { withXcodeProject } = require('@expo/config-plugins');

const TARGET_VERSION = '16.0';

/**
 * Expo config plugin that forces IPHONEOS_DEPLOYMENT_TARGET to 16.0
 * for ALL XCBuildConfiguration entries in the Xcode project.
 * Uses the official xcode project API to ensure the property is set
 * on all build configurations (project-level and target-level).
 */
const withIosDeploymentTarget = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;

    // Use the official xcode API to update the build property on ALL configurations
    // This handles both creating and updating the property
    project.updateBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', TARGET_VERSION);

    console.log(`[withIosDeploymentTarget] Set IPHONEOS_DEPLOYMENT_TARGET to ${TARGET_VERSION} on all build configurations`);
    return config;
  });
};

module.exports = withIosDeploymentTarget;
