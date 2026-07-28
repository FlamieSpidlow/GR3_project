package vn.theweekend.scanner;

import android.os.Handler;
import android.os.Looper;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ApiClient {
    private final OkHttpClient client = new OkHttpClient();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    public interface ApiCallback {
        void onResponse(boolean success, JSONObject data, String error);
    }

    public void post(String url, JSONObject body, String token, ApiCallback callback) {
        RequestBody requestBody = RequestBody.create(body.toString(), AppConfig.JSON);
        Request.Builder builder = new Request.Builder()
                .url(url)
                .post(requestBody)
                .addHeader("Content-Type", "application/json");

        if (token != null && !token.isEmpty()) {
            builder.addHeader("Authorization", "Bearer " + token);
        }

        client.newCall(builder.build()).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                sendError(callback, "Lỗi kết nối: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                String responseText = response.body() != null ? response.body().string() : "{}";
                try {
                    final JSONObject json = new JSONObject(responseText);
                    final boolean isSuccess = response.isSuccessful() && json.optBoolean("success", false);
                    final String errorMsg = isSuccess ? "" : (json.optString("error", json.optString("message", "Lỗi không xác định")));
                    
                    mainHandler.post(() -> callback.onResponse(isSuccess, json, errorMsg));
                } catch (JSONException e) {
                    sendError(callback, "Dữ liệu máy chủ không hợp lệ.");
                }
            }
        });
    }

    private void sendError(ApiCallback callback, String message) {
        mainHandler.post(() -> callback.onResponse(false, new JSONObject(), message));
    }
}
