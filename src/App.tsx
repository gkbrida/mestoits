import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { PropertiesCacheProvider } from "./contexts/PropertiesCacheContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { VisitorTracker } from "./components/VisitorTracker";
import { UserActiveStatusChecker } from "./components/UserActiveStatusChecker";


function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <AdminAuthProvider>
        <PropertiesCacheProvider>
          <BrowserRouter basename={__BASE_PATH__}>
            <UserActiveStatusChecker />
            <VisitorTracker />
            <AppRoutes />
          </BrowserRouter>
        </PropertiesCacheProvider>
      </AdminAuthProvider>
    </I18nextProvider>
  );
}

export default App;
