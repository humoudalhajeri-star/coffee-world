# ربط Coffee World بـ Firebase

## ١. الإعداد (مرة واحدة فقط)

الملف `assets/js/firebase-init.js` يحوي إعدادات مشروعك (projectId, apiKey...).
هذه البيانات **عامة وآمنة** — Firebase مصمّم ليحميها عبر قواعد الأمان في الطرف الخلفي.

## ٢. قواعد الأمان (Security Rules)

الخطة المجانية تبدأ بـ "Test Mode" الذي يسمح بكل شيء لمدة 30 يوماً.
انسخ القواعد التالية والصقها في Firebase Console قبل انتهاء المدة.

### Firestore Rules
افتح Firebase Console → **Firestore Database** → **Rules** → الصق:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // الوصفات: كل مستخدم يرى ويعدّل وصفاته فقط
    match /recipes/{doc} {
      allow read:   if request.auth != null && resource.data.ownerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }

    // الإعلانات: الجميع يقرأ، المالك فقط يعدّل/يحذف
    match /listings/{doc} {
      allow read:   if true;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }

    // سِيَر البريستا: الجميع يقرأ، المالك فقط يعدّل/يحذف
    match /baristas/{doc} {
      allow read:   if true;
      allow create: if request.auth != null && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

اضغط **Publish**.

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
