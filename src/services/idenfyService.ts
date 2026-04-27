import { start } from '@idenfy/react-native-sdk';
import { api } from './api';

export interface IdenfyResult {
  autoIdentificationStatus: 'APPROVED' | 'FAILED' | 'UNVERIFIED';
  manualIdentificationStatus: 'APPROVED' | 'FAILED' | 'WAITING' | 'INACTIVE';
}

export type IdenfyVerificationResult = 
  | { method: 'sdk', result: IdenfyResult }
  | { method: 'web', url: string };

export const idenfyService = {
  /**
   * Starts the iDenfy identity verification process.
   * Calls the backend to get a session token, then launches the native SDK.
   * If the native SDK is not linked (Expo Go), it returns the web redirect URL.
   */
  startVerification: async (params?: {
    successUrl?: string;
    errorUrl?: string;
    callbackUrl?: string;
  }): Promise<IdenfyVerificationResult | null> => {
    try {
      // 1. Obtain an authentication token and redirect URL from the backend
      const res = await api.post('/idenfy/create-token', params);
      const authToken = res.data?.data?.authToken;
      const redirectUrl = res.data?.data?.redirectUrl;

      if (!authToken) {
        throw new Error('No authentication token received from server');
      }

      try {
        // 2. Launch the native iDenfy SDK
        const result = await start({
          authToken: authToken,
        });
        return { method: 'sdk', result: result as IdenfyResult };
      } catch (sdkError: any) {
        // Check for specific linking errors (e.g., in Expo Go) or generic SDK failures
        const errorMessage = sdkError.message || String(sdkError);
        const isNotLinked = 
          errorMessage.includes('not linked') || 
          errorMessage.includes('not found') ||
          errorMessage.includes('idenfy-react-native') ||
          errorMessage.includes('null is not an object');

        console.log('[idenfyService] SDK Error encountered:', errorMessage);

        if ((isNotLinked || !isNotLinked) && redirectUrl) {
          // In development/Expo Go, we prefer falling back to web for ANY SDK error 
          // as long as we have a valid redirect URL.
          console.log('[idenfyService] Falling back to web flow.');
          return { method: 'web', url: redirectUrl };
        }
        throw sdkError;
      }
    } catch (error: any) {
      const apiError = error.response?.data?.error;
      const message = apiError || error.message;
      console.error('[idenfyService] Start Verification Error:', {
        apiError,
        fullError: error,
      });
      throw error;
    }
  },

  /**
   * (Development only) Manually force verification for the current user.
   */
  testForceVerify: async (): Promise<void> => {
    try {
      await api.post('/idenfy/test-force-verify');
    } catch (error) {
      console.error('[idenfyService] Force Verify Error:', error);
      throw error;
    }
  },
};
