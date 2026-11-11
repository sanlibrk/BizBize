// Expo inlines EXPO_PUBLIC_* values into the client build.
export const isServerlessDeployment = process.env.EXPO_PUBLIC_DEPLOYMENT_MODE === 'serverless';
export const photoMaxBytes = (isServerlessDeployment ? 3 : 5) * 1024 * 1024;
export const sharedSyncIntervalMs = isServerlessDeployment ? 15000 : 3000;
