# بوت واتساب - كنافة وبسبوسة 🍯

## الفكرة
العميل يبعت رسالة على واتساب → البوت يرد بترحيب ويطلب الأوردر والعنوان → العميل يبعتهم → البوت يسجلهم في Google Sheet ويرد بشكر.

---

## الخطوات بالترتيب

### 1) عمل حساب Twilio (مجاني للتجربة)
1. روح على https://www.twilio.com/try-twilio وسجل حساب جديد.
2. من الداشبورد، روح لقسم **Messaging > Try it out > Send a WhatsApp message**.
3. هتلاقي رقم Twilio التجريبي (Sandbox) وكود زي `join xxxx-xxxx`.
4. ابعت الكود ده من واتسابك للرقم المعروض عشان تفعّل التجربة.

### 2) عمل Google Sheet + Service Account
1. اعمل Google Sheet جديد، وسمي أول شيت فيه `Orders`.
2. في الصف الأول حط العناوين: `الوقت | الرقم | الأوردر | الحالة`
3. روح على https://console.cloud.google.com
   - اعمل مشروع جديد
   - فعّل **Google Sheets API**
   - من **IAM & Admin > Service Accounts** اعمل Service Account جديد
   - اعمل Key (JSON) ونزّله - فيه `client_email` و `private_key` هتحتاجهم
4. افتح الـ Google Sheet واعمل **Share** للـ `client_email` بتاع الـ Service Account كـ Editor.
5. انسخ ID الشيت من اللينك (الجزء بين `/d/` و `/edit`).

### 3) رفع الكود على Render (استضافة مجانية)
1. اعمل حساب على https://render.com
2. ارفع المجلد ده على GitHub (أو اربط Render بمجلد مباشر)
3. اعمل **New Web Service** واختار الريبو
4. في Environment Variables ضيف:
   - `SPREADSHEET_ID` = ID الشيت
   - `GOOGLE_CLIENT_EMAIL` = من ملف الـ JSON
   - `GOOGLE_PRIVATE_KEY` = من ملف الـ JSON (هتلاقيه فيه `\n` - سيبه زي ما هو)
5. Build Command: `npm install` | Start Command: `npm start`
6. بعد الديبلوي هتاخد لينك زي: `https://konafa-bot.onrender.com`

### 4) ربط Twilio بالكود
1. في Twilio Console > WhatsApp Sandbox Settings
2. في خانة **"WHEN A MESSAGE COMES IN"** حط:
   `https://konafa-bot.onrender.com/whatsapp`
3. احفظ.

### 5) جرب!
ابعت أي رسالة على رقم الـ Sandbox من واتسابك → هيرد عليك بالترحيب → ابعت الأوردر والعنوان → هتلاقيه اتسجل في الـ Google Sheet.

---

## ملاحظات
- لو عايز تشيل وضع "Sandbox" وتستخدم رقم واتساب حقيقي بتاع المحل، محتاج تعمل **WhatsApp Business API** approval من Meta عبر Twilio (خطوة لاحقة بعد ما تتأكد البوت شغال تمام).
- ممكن تضيف لاحقًا: قائمة أصناف وأسعار، حساب الإجمالي، تأكيد قبل الحفظ.
