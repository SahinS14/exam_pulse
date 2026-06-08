import {
  CommonActions,
  createNavigationContainerRef,
} from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

const pendingActions = [];

export function resetToRoute(name, params) {
  const action = CommonActions.reset({
    index: 0,
    routes: [{ name, params }],
  });

  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
    return;
  }

  pendingActions.push(action);
}

export function navigateToRoute(name, params) {
  const action = CommonActions.navigate(name, params);

  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
    return;
  }

  pendingActions.push(action);
}

export function flushPendingNavigationReset() {
  if (!pendingActions.length || !navigationRef.isReady()) {
    return;
  }

  while (pendingActions.length) {
    navigationRef.dispatch(pendingActions.shift());
  }
}
