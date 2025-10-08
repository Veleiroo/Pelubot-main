import type { Location } from 'react-router-dom';

type BackgroundState = { background?: Location } | undefined;

export const getBackgroundLocation = (location: Location): Location | undefined => {
  const state = location.state as BackgroundState;
  if (state?.background) return state.background;
  if (!location.pathname.startsWith('/book')) return location;
  return undefined;
};

export const buildBookingState = (
  location: Location,
  extra?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const background = getBackgroundLocation(location);
  if (background) {
    return { ...(extra ?? {}), background };
  }
  return extra;
};
