package vn.theweekend.scanner;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;

import org.json.JSONException;
import org.json.JSONObject;

public class MainActivity extends AppCompatActivity {
    private static final int REQ_CAMERA = 101;

    private SessionManager session;
    private ApiClient api;
    private JSONObject currentTicket;

    private LinearLayout root;
    private ProgressBar progressBar;
    private TextView messageView;
    private LinearLayout resultCard;
    private Button checkInButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        session = new SessionManager(this);
        api = new ApiClient();
        
        refreshUI();
    }

    private void refreshUI() {
        if (session.isLoggedIn()) {
            showScannerScreen();
        } else {
            showLoginScreen();
        }
    }

    private void showLoginScreen() {
        root = baseRoot();
        
        TextView header = new TextView(this);
        header.setText("Đăng nhập Check-in");
        header.setTextSize(24);
        header.setTypeface(null, Typeface.BOLD);
        header.setPadding(0, 0, 0, 40);
        root.addView(header);

        LinearLayout card = uiCard();
        EditText userField = uiInput("Tài khoản", InputType.TYPE_CLASS_TEXT);
        EditText passField = uiInput("Mật khẩu", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        EditText urlField = uiInput("Máy chủ API", InputType.TYPE_TEXT_VARIATION_URI);
        urlField.setText(session.getApiUrl());
        urlField.setVisibility(View.GONE);

        Button loginBtn = uiButton("Đăng nhập", true);
        Button configBtn = uiButton("Cài đặt kết nối", false);

        configBtn.setOnClickListener(v -> urlField.setVisibility(urlField.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        loginBtn.setOnClickListener(v -> {
            String u = userField.getText().toString().trim();
            String p = passField.getText().toString();
            String url = urlField.getText().toString().trim();
            if (u.isEmpty() || p.isEmpty()) {
                showMessage("Vui lòng nhập đủ thông tin", true);
                return;
            }
            performLogin(u, p, url);
        });

        card.addView(uiLabel("Tên đăng nhập"));
        card.addView(userField);
        card.addView(uiLabel("Mật khẩu"));
        card.addView(passField);
        card.addView(urlField);
        card.addView(loginBtn);
        card.addView(configBtn);

        root.addView(card);
        addGlobalElements();
        setContentView(wrapInScroll(root));
    }

    private void showScannerScreen() {
        root = baseRoot();
        
        TextView header = new TextView(this);
        header.setText("Quét mã vé");
        header.setTextSize(24);
        header.setTypeface(null, Typeface.BOLD);
        header.setPadding(0, 0, 0, 40);
        root.addView(header);

        Button scanBtn = uiButton("MỞ CAMERA QUÉT QR", true);
        checkInButton = uiButton("XÁC NHẬN VÀO CỔNG", true);
        checkInButton.setVisibility(View.GONE);
        Button logoutBtn = uiButton("Đăng xuất", false);

        scanBtn.setOnClickListener(v -> startScanning());
        checkInButton.setOnClickListener(v -> confirmCheckIn());
        logoutBtn.setOnClickListener(v -> {
            session.logout();
            refreshUI();
        });

        LinearLayout scanCard = uiCard();
        scanCard.addView(scanBtn);
        root.addView(scanCard);

        resultCard = uiCard();
        resultCard.addView(uiStatusText("Sẵn sàng quét vé"));
        root.addView(resultCard);
        root.addView(checkInButton);
        root.addView(logoutBtn);

        addGlobalElements();
        setContentView(wrapInScroll(root));
    }

    private void performLogin(String username, String password, String apiUrl) {
        setLoading(true);
        JSONObject body = new JSONObject();
        try {
            body.put("username", username);
            body.put("password", password);
        } catch (JSONException ignored) {}

        api.post(apiUrl + "/api/auth/login", body, null, (success, data, error) -> {
            setLoading(false);
            if (success) {
                String token = data.optString("token");
                session.saveSession(token, apiUrl);
                refreshUI();
            } else {
                showMessage(error, true);
            }
        });
    }

    private void verifyTicket(String code) {
        if (code.isEmpty()) return;
        setLoading(true);
        currentTicket = null;
        checkInButton.setVisibility(View.GONE);
        messageView.setVisibility(View.GONE);

        String ticketCode = extractTicketCode(code);
        JSONObject body = new JSONObject();
        try {
            body.put("ticketCode", ticketCode);
            body.put("qrPayload", code);
        } catch (JSONException ignored) {}

        api.post(session.getApiUrl() + "/api/admin/checkin/verify", body, session.getToken(), (success, data, error) -> {
            setLoading(false);
            if (success) {
                currentTicket = data.optJSONObject("data");
                String status = currentTicket != null ? currentTicket.optString("status", "") : "";
                if (AppConfig.STATUS_USED.equals(status)) {
                    currentTicket = null;
                    updateResultUI("used", data.optJSONObject("data"), "Hãy sử dụng vé khác");
                } else {
                    updateResultUI("valid", currentTicket, "Hợp lệ");
                }
            } else {
                currentTicket = null;
                updateResultUI("error", data.optJSONObject("data"), error);
            }
        });
    }

    private String extractTicketCode(String rawValue) {
        String raw = rawValue == null ? "" : rawValue.trim();
        if (raw.isEmpty()) return "";
        try {
            JSONObject parsed = new JSONObject(raw);
            String ticketCode = parsed.optString("ticketCode", parsed.optString("code", ""));
            return ticketCode.trim();
        } catch (JSONException ignored) {
            return raw;
        }
    }

    private void confirmCheckIn() {
        if (currentTicket == null) return;
        setLoading(true);
        JSONObject body = new JSONObject();
        try {
            body.put("ticketCode", currentTicket.optString("code"));
        } catch (JSONException ignored) {}

        api.post(session.getApiUrl() + "/api/admin/checkin/use", body, session.getToken(), (success, data, error) -> {
            setLoading(false);
            if (success) {
                Toast.makeText(this, "Đã ghi nhận lượt vào", Toast.LENGTH_SHORT).show();
                resetScannerState("Sẵn sàng quét vé tiếp theo");
            } else {
                showMessage(error, true);
            }
        });
    }

    private void startScanning() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
        } else {
            openCamera();
        }
    }

    private void openCamera() {
        IntentIntegrator integrator = new IntentIntegrator(this);
        integrator.setCaptureActivity(ScannerCaptureActivity.class);
        integrator.setOrientationLocked(true);
        integrator.setPrompt("Đưa mã QR vào khung");
        integrator.initiateScan();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            openCamera();
        } else {
            Toast.makeText(this, "Cần quyền camera để quét mã", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        IntentResult result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data);
        if (result != null && result.getContents() != null) {
            verifyTicket(result.getContents());
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    // --- UI Helpers ---

    private void updateResultUI(String state, JSONObject ticket, String message) {
        resultCard.removeAllViews();
        int color = Color.RED;
        String title = "Không hợp lệ";

        if ("valid".equals(state)) {
            color = Color.rgb(0, 150, 0);
            title = "Vé hợp lệ";
            checkInButton.setVisibility(View.VISIBLE);
        } else if ("used".equals(state)) {
            color = Color.rgb(220, 120, 0);
            title = "Vé đã được sử dụng";
        }

        TextView tv = uiStatusText(title + "\n" + message);
        tv.setTextColor(color);
        resultCard.addView(tv);

        if (ticket != null) {
            resultCard.addView(uiLabel("Mã vé: " + ticket.optString("code", "-")));
            resultCard.addView(uiLabel("Loại vé: " + ticket.optString("name", "-")));
            resultCard.addView(uiLabel("Trạng thái: " + ticket.optString("status", "-")));
        }
    }

    private void resetScannerState(String message) {
        currentTicket = null;
        checkInButton.setVisibility(View.GONE);
        messageView.setVisibility(View.GONE);
        resultCard.removeAllViews();
        resultCard.addView(uiStatusText(message));
    }

    private void addGlobalElements() {
        progressBar = new ProgressBar(this);
        progressBar.setVisibility(View.GONE);
        messageView = new TextView(this);
        messageView.setGravity(Gravity.CENTER);
        messageView.setPadding(20, 20, 20, 20);
        messageView.setVisibility(View.GONE);
        root.addView(progressBar);
        root.addView(messageView);
    }

    private void showMessage(String msg, boolean error) {
        messageView.setText(msg);
        messageView.setTextColor(error ? Color.RED : Color.GREEN);
        messageView.setVisibility(View.VISIBLE);
    }

    private void setLoading(boolean loading) {
        progressBar.setVisibility(loading ? View.VISIBLE : View.GONE);
    }

    private LinearLayout baseRoot() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(40, 40, 40, 40);
        l.setBackgroundColor(Color.WHITE);
        return l;
    }

    private View wrapInScroll(View view) {
        ScrollView s = new ScrollView(this);
        s.addView(view);
        return s;
    }

    private LinearLayout uiCard() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(30, 30, 30, 30);
        l.setBackgroundResource(R.drawable.card_bg);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 0, 0, 30);
        l.setLayoutParams(p);
        return l;
    }

    private EditText uiInput(String hint, int type) {
        EditText e = new EditText(this);
        e.setHint(hint);
        e.setInputType(type);
        e.setBackgroundResource(R.drawable.input_bg);
        e.setPadding(30, 30, 30, 30);
        return e;
    }

    private Button uiButton(String text, boolean primary) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setBackgroundResource(primary ? R.drawable.button_primary : R.drawable.button_secondary);
        b.setTextColor(primary ? Color.WHITE : Color.BLACK);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2);
        p.setMargins(0, 10, 0, 10);
        b.setLayoutParams(p);
        return b;
    }

    private TextView uiLabel(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setPadding(0, 10, 0, 10);
        return t;
    }

    private TextView uiStatusText(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextSize(18);
        t.setTypeface(null, Typeface.BOLD);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0, 20, 0, 20);
        return t;
    }
}
