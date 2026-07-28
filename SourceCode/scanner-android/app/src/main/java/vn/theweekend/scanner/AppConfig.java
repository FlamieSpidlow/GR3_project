package vn.theweekend.scanner;

import okhttp3.MediaType;

public class AppConfig {
    public static final String PREF_NAME = "TheWeekendPrefs";
    public static final String KEY_TOKEN = "access_token";
    public static final String KEY_API_URL = "api_url";
    public static final String DEFAULT_API_URL = "http://10.0.2.2:3000";
    public static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    public static final String STATUS_VALID = "valid";
    public static final String STATUS_PAID = "paid";
    public static final String STATUS_USED = "used";
}
