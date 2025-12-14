export interface TrackingResult {
  status: 'IN_TRANSIT' | 'DELIVERED' | 'PROBLEM' | 'UNKNOWN';
  location?: string;
  updatedAt: Date;
}

export interface IDeliveryProvider {
  getTrackingStatus(trackingNumber: string): Promise<TrackingResult>;
}