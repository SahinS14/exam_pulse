import { createStackNavigator } from "@react-navigation/stack";

import MainTabs from "./MainTabs";
import ConceptDetailScreen from "../screens/ConceptDetailScreen";
import ConceptListScreen from "../screens/ConceptListScreen";
import ModuleDetailScreen from "../screens/ModuleDetailScreen";
import ModuleScreen from "../screens/ModuleScreen";
import MostRepeatedScreen from "../screens/MostRepeatedScreen";
import NotesScreen from "../screens/NotesScreen";
import QuestionDetailScreen from "../screens/QuestionDetailScreen";
import QuestionListScreen from "../screens/QuestionListScreen";
import SearchScreen from "../screens/SearchScreen";
import SemesterScreen from "../screens/SemesterScreen";
import SubjectScreen from "../screens/SubjectScreen";
import SyllabusScreen from "../screens/SyllabusScreen";
import TopicListScreen from "../screens/TopicListScreen";
import TopRevisionScreen from "../screens/TopRevisionScreen";
import WebViewerScreen from "../screens/WebViewerScreen";
import AdminEntityManagerScreen from "../screens/admin/AdminEntityManagerScreen";
import AdminNotesUploadScreen from "../screens/admin/AdminNotesUploadScreen";
import AdminQuestionFormScreen from "../screens/admin/AdminQuestionFormScreen";
import AdminQuestionsScreen from "../screens/admin/AdminQuestionsScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import AdminUsersScreen from "../screens/admin/AdminUsersScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import PaywallScreen from "../screens/auth/PaywallScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import SplashScreen from "../screens/auth/SplashScreen";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerTintColor: colors.text,
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTitleStyle: {
          fontSize: layout.isTablet ? 20 : 18,
          fontWeight: "700",
          color: colors.text,
        },
        cardStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Paywall"
        component={PaywallScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Semester" component={SemesterScreen} options={{ title: "Semesters" }} />
      <Stack.Screen name="Subject" component={SubjectScreen} options={{ title: "Subjects" }} />
      <Stack.Screen name="Module" component={ModuleScreen} options={{ title: "Modules" }} />
      <Stack.Screen
        name="ModuleDetail"
        component={ModuleDetailScreen}
        options={{ title: "Module Details" }}
      />
      <Stack.Screen name="TopicList" component={TopicListScreen} options={{ title: "Topics" }} />
      <Stack.Screen
        name="QuestionList"
        component={QuestionListScreen}
        options={{ title: "Questions" }}
      />
      <Stack.Screen
        name="QuestionDetail"
        component={QuestionDetailScreen}
        options={{ title: "Question Detail" }}
      />
      <Stack.Screen
        name="MostRepeated"
        component={MostRepeatedScreen}
        options={{ title: "Most Repeated" }}
      />
      <Stack.Screen
        name="TopRevision"
        component={TopRevisionScreen}
        options={{ title: "Top Revision" }}
      />
      <Stack.Screen
        name="ConceptList"
        component={ConceptListScreen}
        options={{ title: "Important Concepts" }}
      />
      <Stack.Screen
        name="ConceptDetail"
        component={ConceptDetailScreen}
        options={{ title: "Concept Detail" }}
      />
      <Stack.Screen name="Notes" component={NotesScreen} options={{ title: "Notes" }} />
      <Stack.Screen name="Syllabus" component={SyllabusScreen} options={{ title: "Syllabus" }} />
      <Stack.Screen
        name="WebViewer"
        component={WebViewerScreen}
        options={({ route }) => ({ title: route.params?.title || "Viewer" })}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search" }}
      />
      <Stack.Screen
        name="AdminEntityManager"
        component={AdminEntityManagerScreen}
        options={({ route }) => ({
          title: route.params?.resource
            ? `Manage ${route.params.resource}`
            : "Manage Content",
        })}
      />
      <Stack.Screen
        name="AdminQuestions"
        component={AdminQuestionsScreen}
        options={{ title: "Manage Questions" }}
      />
      <Stack.Screen
        name="AdminQuestionForm"
        component={AdminQuestionFormScreen}
        options={{ title: "Question Form" }}
      />
      <Stack.Screen
        name="AdminNotes"
        component={AdminNotesUploadScreen}
        options={{ title: "Manage Notes" }}
      />
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: "Users" }}
      />
      <Stack.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ title: "Reports" }}
      />
    </Stack.Navigator>
  );
}
