# ZaloPay setup

## Render environment

Add these variables to the backend service:

```env
FRONTEND_PUBLIC_ORIGIN=https://theweekend.onrender.com
ZALOPAY_APP_ID=your_zalopay_app_id
ZALOPAY_KEY1=your_zalopay_key1
ZALOPAY_KEY2=your_zalopay_key2
ZALOPAY_CREATE_URL=https://sb-openapi.zalopay.vn/v2/create
```

Use the sandbox URL above for testing. For production, replace `ZALOPAY_CREATE_URL` with the production endpoint provided by ZaloPay.

## ZaloPay merchant configuration

Configure the callback URL:

```txt
https://theweekend.onrender.com/api/tickets/zalopay/callback
```

The callback is verified with `ZALOPAY_KEY2`. After a valid callback, the backend marks the booking as paid and creates electronic tickets.

## Frontend behavior

The booking modal shows only QR payment. It does not show a payment link.

The backend stores `order_url` internally as `payment.payUrl` and the ZaloPay QR payload as `payment.qrUrl`. The frontend renders `qrUrl` first, and falls back to rendering `payUrl` as a QR if ZaloPay does not return a QR payload in the current environment.
