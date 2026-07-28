package vn.theweekend.scanner;

import android.content.Context;
import android.content.SharedPreferences;

public class SessionManager {
    private final SharedPreferences prefs;

    public SessionManager(Context context) {
        prefs = context.getSharedPreferences(AppConfig.PREF_NAME, Context.MODE_PRIVATE);
    }

    public void saveSession(String token, String apiUrl) {
        prefs.edit()
             .putString(AppConfig.KEY_TOKEN, token)
             .putString(AppConfig.KEY_API_URL, apiUrl)
             .apply();
    }

    public String getToken() {
        return prefs.getString(AppConfig.KEY_TOKEN, "");
    }

    public String getApiUrl() {
        return prefs.getString(AppConfig.KEY_API_URL, AppConfig.DEFAULT_API_URL);
    }

    public boolean isLoggedIn() {
        return !getToken().isEmpty();
    }

    public void logout() {
        prefs.edit().remove(AppConfig.KEY_TOKEN).apply();
    }
}
