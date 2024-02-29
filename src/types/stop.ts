export interface Stop {
  stop_code: number,
  stop_name: string,
  stop_desc: string,
  stop_lat: number,
  stop_lon: number,
  zone_id: string,
  stop_url: string,
  location_type: number,
  parent_station: number,
  stop_timezone: string,
  wheelchair_boarding: number
}