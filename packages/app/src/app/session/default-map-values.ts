export const DEFAULT_COORDINATES = [828675.7379587183, 5933353.2073429795];

export const DEFAULT_ZOOM = 16;

export const MM_PER_INCHES = 25.4;

export const DEFAULT_DPI = MM_PER_INCHES / 0.28; // from 'ol/control/ScaleLine';

export const ZOOM_0_RESOLUTION = 156543.03390625;

export const LOG2_ZOOM_0_RESOLUTION = Math.log2(ZOOM_0_RESOLUTION);

export const INCHES_PER_METER = 1000 / MM_PER_INCHES;

export const DEFAULT_RESOLUTION = INCHES_PER_METER * DEFAULT_DPI;

export const LOCAL_MAP_STYLE_PATH = '/assets/map-style.json';

export const LOCAL_MAP_STYLE_SOURCE = 'protomaps';

export const MAX_DRAW_ELEMENTS_GUEST = 10;
