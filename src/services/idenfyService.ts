import { start } from '@idenfy/react-native-sdk';
import { api } from './api';

export interface IdenfyResult {
  autoIdentificationStatus: 'APPROVED' | 'FAILED' | 'UNVERIFIED';
  manualIdentificationStatus: 'APPROVED' | 'FAILED' | 'WAITING' | 'INACTIVE';
}

export const idenfyService = {
  /**
   * Starts the iDenfy identity verification process.
   * Calls the backend to get a session token, then launches the native SDK.
   */
  startVerification: async (): Promise<IdenfyResult | null> => {
    try {
      // 1. Obtain an authentication token from the backend
      const res = await api.post('/idenfy/create-token');
      const authToken = res.data?.data?.authToken;

      if (!authToken) {
        throw new Error('No authentication token received from server');
      }

      // 2. Launch the native iDenfy SDK
      // Note: idenfySettings can be passed here if customization is needed.
      const result = await start({
        authToken: authToken,
      });

      return result as IdenfyResult;
    } catch (error) {
      console.error('iDenfy verification error:', error);
      throw error;
    }
  },
};
