declare module '@idenfy/react-native-sdk' {
  export interface IdenfySettings {
    authToken: string;
    [key: string]: any;
  }

  export interface IdenfyResult {
    autoIdentificationStatus: 'APPROVED' | 'FAILED' | 'UNVERIFIED';
    manualIdentificationStatus: 'APPROVED' | 'FAILED' | 'WAITING' | 'INACTIVE';
  }

  export function start(settings: IdenfySettings): Promise<IdenfyResult>;
}
