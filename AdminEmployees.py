import pandas as pd
from supabase import create_client
import time

SUPABASE_URL = "https://fmgtrtudpardxsvjbcve.supabase.co"
SUPABASE_KEY = "sb_publishable_w3Mdg-WdxcmXNk03fj45KA_Ol6MLulH" # لو معاك service_role حطه هنا هيبقى اسرع
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

EXCEL_FILE = "DATAFILE.xlsx"  # غير اسم الملف هنا

print("⏳ بقرأ الاكسيل...")
df = pd.read_excel(EXCEL_FILE, dtype=str)
df = df.fillna("")

# خريطة الأعمدة العربي -> انجليزي في Supabase
col_map = {
    "الكود البنكى": "emp_code",
    "الكود البنكي": "emp_code",
    "اسم العامل": "emp_name",
    "ملاحظات": "notes",
    "الرقم القومى": "national_id",
    "الرقم القومي": "national_id",
    "WhatsUpp": "whatsapp",
    "phone": "phone",
    "فى الخدمة": "in_service",
    "في الخدمة": "in_service",
    # زود باقي الأعمدة اللي بعتها لو عايز
}

# اعادة تسمية
df_renamed = pd.DataFrame()
for ar, en in col_map.items():
    if ar in df.columns:
        df_renamed[en] = df[ar]

# لو عندك اعمدة انجليزي اصلا
for c in ["emp_code","emp_name","national_id","whatsapp","phone","notes"]:
    if c in df.columns and c not in df_renamed.columns:
        df_renamed[c] = df[c]

# تنظيف الرقم القومي
df_renamed = df_renamed[df_renamed["national_id"].astype(str).str.len() >= 10]
print(f"✅ صالح للرفع: {len(df_renamed)} من {len(df)}")

# رفع صف صف عشان نتخطى الخطأ
done = 0
fail = 0
for idx, row in df_renamed.iterrows():
    payload = {k: (str(v).strip() if pd.notna(v) and str(v).strip() != "" else None) for k,v in row.items()}
    # معالجة in_service
    if "in_service" in payload and payload["in_service"]:
        payload["in_service"] = "على قيد العمل" in str(payload["in_service"]) or "نعم" in str(payload["in_service"]) or payload["in_service"] is True
    
    try:
        supabase.table("employees_full").upsert(payload, on_conflict="national_id").execute()
        done += 1
        if done % 20 == 0:
            print(f"✅ تم {done}/{len(df_renamed)}")
    except Exception as e:
        fail += 1
        print(f"❌ فشل {payload.get('national_id')} : {e}")
    
    time.sleep(0.05)

print(f"\n🎉 انتهى! نجح: {done} - فشل: {fail}")
