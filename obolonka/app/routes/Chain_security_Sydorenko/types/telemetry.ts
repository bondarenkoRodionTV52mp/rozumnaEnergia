export interface TelemetryData {
  id: number;
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  is_manipulated: boolean;
}
