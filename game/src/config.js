// Cloud Runner - tuning values. Distances in metres, speeds in m/s, angles in radians.
window.CR = window.CR || {};
CR.CFG = {
  W: 1280, H: 720, FOV: 58,
  FLIGHT_TIME: 90,
  RING_SCORE: 100, RING_BOOST: 14, RING_BOOST_MAX: 28, RING_RADIUS: 30, RING_COUNT: 36, RING_SPACING: 330,
  LAND_BONUS: 250, LAND_MAX_SINK: 9, LAND_MAX_PITCH: 0.4, LAND_MAX_ROLL: 0.4,
  SPEED_MIN: 42, SPEED_RANGE: 50, START_SPEED: 15, LIFTOFF_SPEED: 38,
  MAX_ROLL: 0.75, MAX_PITCH_UP: 0.5, MAX_PITCH_DOWN: 0.55, TURN_K: 1.1, CEILING: 520,
  GEAR: 1.2, GROUND_Y: 6,
  START: { x: 0, z: -70 },
  RUNWAY: { x0: -14, x1: 14, z0: -100, z1: 500 },
  CAM_DIST: 29, CAM_UP: 8
};
