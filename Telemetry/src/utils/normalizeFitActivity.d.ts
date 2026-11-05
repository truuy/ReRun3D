export type FitSportCategory = 'cycling' | 'running' | 'swimming' | 'other';

export interface NormalizedFitRecord {
  sport: string;
  timestamp: string;
  elapsed_seconds: number;
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  heart_rate_bpm: number | null;
  speed_mps: number | null;
  speed_kmh: number | null;
  pace_seconds_per_km: number | null;
  distance_m: number | null;
  temperature_c: number | null;
  power_w?: number;
  cadence_rpm?: number;
  cadence_spm?: number;
  left_right_balance_percent?: { left: number; right: number };
  vertical_oscillation_mm?: number;
  ground_contact_time_ms?: number;
  stroke_count?: number;
  stroke_type?: string | number;
  swolf?: number;
}

export interface NormalizedSwimLength {
  timestamp: string;
  duration_seconds: number | null;
  distance_m: number | null;
  stroke_count: number | null;
  stroke_type: string | number | null;
  swolf: number | null;
}

export interface NormalizedFitSummary {
  sport: string;
  total_distance_m: number | null;
  elapsed_time_seconds: number;
  moving_time_seconds: number | null;
  average_speed_mps: number | null;
  maximum_speed_mps: number | null;
  average_pace_seconds_per_km: number | null;
  average_heart_rate_bpm: number | null;
  maximum_heart_rate_bpm: number | null;
  average_power_w: number | null;
  maximum_power_w: number | null;
  average_cadence: number | null;
  maximum_cadence: number | null;
  average_temperature_c: number | null;
  maximum_temperature_c: number | null;
  total_ascent_m: number | null;
  total_descent_m: number | null;
  total_strokes: number | null;
  average_swolf: number | null;
  pool_length_m: number | null;
}

export interface NormalizedFitActivity {
  schema_version: 1;
  source_format: 'fit';
  sport: string;
  sport_category: FitSportCategory;
  sub_sport: string | number | null;
  records: NormalizedFitRecord[];
  lengths: NormalizedSwimLength[];
  summary: NormalizedFitSummary;
}

export function normalizeFitActivity(
  activity: import('fit-file-parser').ParsedFit,
  sportOverride?: string,
): NormalizedFitActivity;
