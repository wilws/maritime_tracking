/**
 * The contract. Every component downstream — Kinesis, Lambda #1, the S3
 * archive, the frontend — speaks this shape and never sees AISStream's.
 */
export interface VesselPosition {
  eventType: "VESSEL_POSITION";
  mmsi: string;
  shipName: string;
  timestamp: string; // ISO 8601
  latitude: number;
  longitude: number;
  speed: number; // knots
  course: number; // degrees
  heading: number; // degrees; -1 when unavailable
  navigationStatus: number;
}

/** Shape of an AISStream PositionReport frame. Only the fields we consume. */
export interface AisStreamMessage {
  MessageType?: string;
  MetaData?: {
    MMSI?: number;
    MMSI_String?: number | string;
    ShipName?: string;
    time_utc?: string;
  };
  Message?: {
    PositionReport?: {
      Latitude?: number;
      Longitude?: number;
      Sog?: number;
      Cog?: number;
      TrueHeading?: number;
      NavigationalStatus?: number;
      Valid?: boolean;
    };
  };
}
