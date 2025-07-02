export interface StopTime {
  trip_id: string,
  arrival_time: string,
  departure_time: string,
  stop_sequence: number,
  pickup_type: number,
  shape_dist_traveled: number,
  timepoint: number
}