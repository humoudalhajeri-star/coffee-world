# ربط CoffeZ بـ Firebase

## ١. الإعداد (مرة واحدة فقط)

الملف `assets/js/firebase-init.js` يحوي إعدادات مشروعك (projectId, apiKey...).
هذه البيانات **عامة وآمنة** — Firebase مصمّم ليحميها عبر قواعد الأمان في الطرف الخلفي.

## ٢. قواعد الأمان (Security Rules)

الخطة المجانية تبدأ بـ "Test Mode" الذي يسمح بكل شيء لمدة 30 يوماً.
انسخ القواعد التالية والصقها في Firebase Console قبل انتهاء المدة.

### Firestore Rules (مع دعم لوحة الأدمن)
افتح Firebase Console → **Firestore Database** → **Rules** → الصق:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ✏️ عدّل هذه القائمة بإيميلات المشرفين.
    function isAdmin() {
      return request.auth != null && request.auth.token.email in [
        "humoud.alhajeri@gmail.com",
        "humoudlahajeri3@gmail.com"
      ];
    }

    // المستخدمون: كل شخص يكتب وثيقته فقط. المشرفون يقرؤون الكل.
    match /users/{uid} {
      allow read:   if isAdmin() || request.auth.uid == uid;
      allow write:  if request.auth.uid == uid;
      allow delete: if isAdmin();
    }

    // الوصفات: كل مستخدم يرى وصفاته فقط، المشرفون يرون الكل.
    match /recipes/{doc} {
      allow read:   if isAdmin() || (request.auth != null && resource.data.ownerId == request.auth.uid);
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAdmin() || (request.auth != null && resource.data.ownerId == request.auth.uid);
    }

    // الإعلانات: الجميع يقرأ، المالك أو المشرف يعدّل/يحذف.
    match /listings/{doc} {
      allow read:   if true;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAdmin() || (request.auth != null && resource.data.ownerId == request.auth.uid);
    }

    // سِيَر البريستا: الجميع يقرأ، المالك أو المشرف يعدّل/يحذف.
    match /baristas/{doc} {
      allow read:   if true;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAdmin() || (request.auth != null && resource.data.ownerId == request.auth.uid);
    }
  }
}
```

اضغط **Publish**.

> 💡 **لإضافة/إزالة مشرف:** غيّر قائمة الإيميلات في قاعدة `isAdmin()` أعلاه،
> وأيضاً في `assets/js/admin.js` (ثابت `ADMIN_EMAILS`) و `assets/js/app.js`.

### Storage Rules
افتح Firebase Console → **Storage** → **Rules** → الصق:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // الإعلانات: الجميع يرى الصور، المستخدم المسجّل فقط يرفع
    match /listings/{userId}/{file=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // البريستا (صور + CV): الجميع يرى، المستخدم يرفع في مجلده
    match /baristas/{section}/{userId}/{file=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

اضغط **Publish**.

## ٣. كيف يعمل الربط؟

- `assets/js/firebase-init.js` يحمّل Firebase SDK ويُنشئ `window.CW_FB`
- `assets/js/api.js` يتحقّق من وجود `CW_FB`:
  - **موجود** → يستخدم Firestore + Firebase Auth + Storage
  - **غير موجود** (مثلاً اتصال إنترنت ضعيف) → يرجع تلقائياً لـ localStorage

## ٤. ماذا يُخزَّن وأين؟

| البيانات | الموقع |
|---------|--------|
| حسابات المستخدمين | Firebase Authentication |
| كلمات المرور (مُعمّاة) | Firebase Authentication |
| الوصفات | Firestore: `/recipes` |
| الإعلانات | Firestore: `/listings` |
| سِيَر البريستا | Firestore: `/baristas` |
| صور الإعلانات | Storage: `/listings/{userId}/` |
| صور البريستا | Storage: `/baristas/photos/{userId}/` |
| ملفات السيرة PDF | Storage: `/baristas/cv/{userId}/` |

## ٥. المستخدمون يرون ماذا؟

- **الوصفات**: خاصة — كل مستخدم يرى وصفاته فقط
- **الإعلانات والبريستا**: عامة — كل المستخدمين يرونها، لكن كل شخص يعدّل/يحذف ما يخصّه فقط

## ٦. تسجيل الدخول

- صفحة **البريستا** فيها زرا "تسجيل الدخول" و"إنشاء حساب"
- بعد التسجيل، المستخدم يقدر:
  - يحفظ وصفات على حسابه
  - ينشر إعلانات مربوطة باسمه
  - ينشئ ملف بريستا
- الجلسة تبقى مفتوحة حتى لو أغلق المتصفح (Firebase persistent auth)

## ٧. الأسئلة الشائعة

**س: هل بياناتي آمنة؟**
نعم — Firebase من Google، والبيانات مشفّرة ومخزّنة في Google Cloud.

**س: كم سعة التخزين المجانية؟**
- Firestore: 1GB، 50K قراءة/يوم، 20K كتابة/يوم
- Storage: 5GB، 1GB تحميل/يوم
- Authentication: 50K مستخدم نشط شهرياً

كلها مجانية وكافية لمشروع بمئات المستخدمين النشطين.

**س: ماذا لو تجاوزت الحد المجاني؟**
Firebase يوقف الخدمة مؤقتاً (لا يشحنك بلا إذن). تقدر تضيف بطاقة لاحقاً لزيادة الحد.

**س: كيف أحذف بيانات اختبارية؟**
Firebase Console → Firestore → اختر المجموعة → احذف المستندات يدوياً.
أو استخدم `firebase-tools` من سطر الأوامر.

## ٨. تفعيل عدّاد الزوار (لوحة الإحصائيات)

لوحة التحكم فيها تبويب **📈 الإحصائيات** يعرض: عدد الزوار اليومي/الأسبوعي/الشهري، الجهاز (جوال vs كمبيوتر)، الأقسام الأكثر زيارة، وآخر ٢٠ زيارة.

حتى يشتغل العدّاد، أضف قاعدة Firestore تالية:

1. افتح: https://console.firebase.google.com/project/coffee-world-52a27/firestore/rules
2. الصق هذه القاعدة **داخل** كتلة `match /databases/{database}/documents { ... }`:

```
match /visits/{visitId} {
  // أي زائر يستطيع تسجيل زيارة (بدون تسجيل دخول)
  allow create: if
    request.resource.data.keys().hasOnly(['page','section','device','ref','ownerId','createdAt']) &&
    request.resource.data.page is string &&
    request.resource.data.page.size() < 300;

  // فقط المشرفون يقرأون الإحصائيات
  allow read: if request.auth != null &&
    request.auth.token.email.lower() in [
      'humoud.alhajeri@gmail.com',
      'humoudlahajeri3@gmail.com'
    ];

  // لا تعديل ولا حذف (تحفظ سلامة البيانات)
  allow update, delete: if false;
}
```

3. اضغط **Publish**.

بعد خمس دقائق، افتح أي صفحة على `coffez.net` → الزيارة تُسجَّل → اللوحة تعرض الأرقام.

### ملاحظات مهمة:
- كل متصفح يُسجَّل **مرة واحدة في اليوم لكل قسم** (Home / Recipe / Marketplace / Baristas) — لتقليل كتابات Firestore.
- صفحات **admin / terms / privacy** مُستبعَدة من العدّ.
- إذا أردت حذف عدّاد معيّن (مثلاً لاختبار)، احذف الوثيقة من Firebase Console.

## ٩. تفعيل صفحة شركاء المحلات (Shops Landing)

صفحة `/pages/shops.html` تستقبل طلبات المحلات الراغبة في الانضمام كشركاء مؤسسين، وتحفظها في Firestore `shopRequests/`. لوحة التحكم تبويب **🏪 شركاء المحلات** يعرضها.

أضف القاعدة التالية:

```
match /shopRequests/{requestId} {
  // أي زائر يستطيع إرسال طلب شراكة
  allow create: if
    request.resource.data.keys().hasAll(['ownerName','shopName','phone','category','country']) &&
    request.resource.data.shopName is string &&
    request.resource.data.shopName.size() > 0 &&
    request.resource.data.shopName.size() < 200;

  // فقط المشرفون يقرأون/يعدّلون/يحذفون
  allow read, update, delete: if isAdmin();
}
```

اضغط **Publish**. بعد دقيقة، أي طلب يُقدَّم من صفحة `/shops` سيظهر في لوحة التحكم.

### ملاحظات:
- يمكنك اعتماد / رفض / حذف الطلبات من اللوحة
- زر الواتساب يفتح محادثة جاهزة مع رسالة ترحيب
- الرابط المباشر لدعوة المحلات: `https://coffez.net/pages/shops.html`
