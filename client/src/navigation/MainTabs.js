import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";
import { SymbolView } from "expo-symbols";

import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import BookmarksScreen from "../screens/BookmarksScreen";
import BranchScreen from "../screens/BranchScreen";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import { useAuthStore } from "../store/authStore";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

const Tab = createBottomTabNavigator();

function TabSymbol({ name, size, tintColor, fallback }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor}
      fallback={
        <Text
          style={{
            color: tintColor,
            fontSize: size * 0.72,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {fallback}
        </Text>
      }
    />
  );
}

function buildTabOptions({ title, activeIcon, inactiveIcon, activeFallback, inactiveFallback }) {
  return {
    title,
    tabBarIcon: ({ focused, color, size }) => (
      <View
        style={{
          width: 54,
          height: 42,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {focused ? (
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 16,
              backgroundColor: `${color}18`,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <TabSymbol
              name={focused ? activeIcon : inactiveIcon}
              size={size + 3}
              tintColor={color}
              fallback={focused ? activeFallback : inactiveFallback}
            />
          </View>
        ) : (
          <TabSymbol
            name={focused ? activeIcon : inactiveIcon}
            size={size + 1}
            tintColor={color}
            fallback={focused ? activeFallback : inactiveFallback}
          />
        )}
      </View>
    ),
  };
}

export default function MainTabs() {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarLabelStyle: {
          fontSize: layout.isTablet ? 13 : 12,
          fontWeight: "700",
          marginBottom: layout.isTablet ? 6 : 3,
        },
        tabBarItemStyle: {
          paddingVertical: layout.isTablet ? 8 : 5,
        },
        tabBarStyle: {
          height: layout.isTablet ? 90 : 78,
          paddingTop: 10,
          paddingBottom: layout.isTablet ? 8 : 8,
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          shadowColor: colors.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: -6 },
          elevation: 10,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={buildTabOptions({
          title: "Home",
          activeIcon: "house.fill",
          inactiveIcon: "house",
          activeFallback: "⌂",
          inactiveFallback: "⌂",
        })}
      />
      {isAdmin ? (
        <Tab.Screen
          name="AdminTab"
          component={AdminDashboardScreen}
          options={buildTabOptions({
            title: "Admin",
            activeIcon: "person.crop.circle.badge.checkmark",
            inactiveIcon: "person.crop.circle",
            activeFallback: "◉",
            inactiveFallback: "○",
          })}
        />
      ) : (
        <>
          <Tab.Screen
            name="BrowseTab"
            component={BranchScreen}
            options={buildTabOptions({
              title: "Browse",
              activeIcon: "books.vertical.fill",
              inactiveIcon: "books.vertical",
              activeFallback: "▥",
              inactiveFallback: "▤",
            })}
          />
          <Tab.Screen
            name="SearchTab"
            component={SearchScreen}
            options={buildTabOptions({
              title: "Search",
              activeIcon: "magnifyingglass.circle.fill",
              inactiveIcon: "magnifyingglass",
              activeFallback: "⌕",
              inactiveFallback: "⌕",
            })}
          />
          <Tab.Screen
            name="BookmarksTab"
            component={BookmarksScreen}
            options={buildTabOptions({
              title: "Bookmarks",
              activeIcon: "bookmark.fill",
              inactiveIcon: "bookmark",
              activeFallback: "⌑",
              inactiveFallback: "⌑",
            })}
          />
        </>
      )}
    </Tab.Navigator>
  );
}
