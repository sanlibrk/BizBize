module.exports = ({ config }) => {
  const bundleIdentifier = process.env.BIZBIZE_IOS_BUNDLE_IDENTIFIER || config.ios?.bundleIdentifier;
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  return {
    ...config,
    ios: { ...config.ios, bundleIdentifier },
    extra: { ...config.extra, ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}) },
  };
};
