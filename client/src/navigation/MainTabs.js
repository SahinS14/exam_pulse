import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import BookmarksScreen from "../screens/BookmarksScreen";
import BranchScreen from "../screens/BranchScreen";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import { useAuthStore } from "../store/authStore";
import { fontWeights, radius, spacing, typography, useAppTheme } from "../utils/theme";

const Tab = createBottomTabNavigator();

function TabIcon({ focused, activeName, inactiveName, color }) {
  return (
    <View style={styles.iconWrap}>
      <View
        style={[
          styles.iconDot,
          {
            backgroundColor: focused ? color : "transparent",
            opacity: focused ? 1 : 0,
          },
        ]}
      />
      <Ionicons
        name={focused ? activeName : inactiveName}
        size={focused ? 24 : 23}
        color={color}
      />
    </View>
  );
}

function AnimatedTabButton({ accessibilityState, children, onPress }) {
  const focused = accessibilityState?.selected;
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
      style={styles.tabButton}
    >
      <Animated.View style={{ transform: [{ scale }], opacity: focused ? 1 : 0.94 }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function buildOptions(title, activeName, inactiveName) {
  return {
    title,
    tabBarIcon: ({ focused, color }) => (
      <TabIcon
        focused={focused}
        activeName={activeName}
        inactiveName={inactiveName}
        color={color}
      />
    ),
  };
}

export default function MainTabs() {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const bottomInset = Math.max(insets.bottom, spacing.xs);
  const tabBarHeight = 56 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: typography.sm,
          fontWeight: fontWeights.semibold,
          marginTop: 1,
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarItemStyle: {
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 0,
        },
        tabBarButton: (props) => <AnimatedTabButton {...props} />,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={buildOptions("Home", "home", "home-outline")}
      />
      {isAdmin ? (
        <Tab.Screen
          name="AdminTab"
          component={AdminDashboardScreen}
          options={buildOptions("Admin", "settings", "settings-outline")}
        />
      ) : (
        <>
          <Tab.Screen
            name="BrowseTab"
            component={BranchScreen}
            options={buildOptions("Browse", "compass", "compass-outline")}
          />
          <Tab.Screen
            name="SearchTab"
            component={SearchScreen}
            options={buildOptions("Search", "search", "search-outline")}
          />
          <Tab.Screen
            name="BookmarksTab"
            component={BookmarksScreen}
            options={buildOptions("Bookmarks", "bookmark", "bookmark-outline")}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
  },
  iconWrap: {
    width: 48,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    marginBottom: 2,
  },
});
