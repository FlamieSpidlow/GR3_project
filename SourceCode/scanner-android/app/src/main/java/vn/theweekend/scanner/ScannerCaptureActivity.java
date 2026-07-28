package vn.theweekend.scanner;

import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.zxing.client.android.Intents;
import com.journeyapps.barcodescanner.CaptureActivity;
import com.journeyapps.barcodescanner.DecoratedBarcodeView;

public class ScannerCaptureActivity extends CaptureActivity implements DecoratedBarcodeView.TorchListener {
    private DecoratedBarcodeView barcodeView;
    private Button flashButton;
    private boolean torchOn = false;

    @Override
    protected DecoratedBarcodeView initializeContent() {
        FrameLayout root = new FrameLayout(this);
        barcodeView = new DecoratedBarcodeView(this);
        barcodeView.setTorchListener(this);
        barcodeView.setStatusText("Đưa mã QR vào khung quét");
        root.addView(barcodeView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dp(14), dp(12), dp(14), dp(12));
        topBar.setBackgroundColor(Color.argb(150, 0, 31, 36));

        TextView title = new TextView(this);
        title.setText("Quét mã vé");
        title.setTextColor(Color.WHITE);
        title.setTextSize(18);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        topBar.addView(title, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        Button closeButton = cameraButton("Đóng");
        closeButton.setOnClickListener(v -> finish());
        topBar.addView(closeButton);

        FrameLayout.LayoutParams topParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.TOP
        );
        root.addView(topBar, topParams);

        flashButton = cameraButton("Bật flash");
        flashButton.setOnClickListener(v -> {
            if (torchOn) {
                barcodeView.setTorchOff();
            } else {
                barcodeView.setTorchOn();
            }
        });
        FrameLayout.LayoutParams flashParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
        );
        flashParams.setMargins(0, 0, 0, dp(28));
        root.addView(flashButton, flashParams);

        setContentView(root);
        return barcodeView;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        getIntent().putExtra(Intents.Scan.PROMPT_MESSAGE, "Đưa mã QR vào khung quét");
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onTorchOn() {
        torchOn = true;
        if (flashButton != null) flashButton.setText("Tắt flash");
    }

    @Override
    public void onTorchOff() {
        torchOn = false;
        if (flashButton != null) flashButton.setText("Bật flash");
    }

    private Button cameraButton(String text) {
        Button button = new Button(this);
        button.setText(text);
        button.setAllCaps(false);
        button.setTextColor(Color.WHITE);
        button.setTextSize(14);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setMinHeight(dp(44));
        button.setBackgroundColor(Color.argb(170, 15, 118, 110));
        return button;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
