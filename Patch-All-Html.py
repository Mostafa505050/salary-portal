
import os
import glob

guard_tag = '<script src="universal-page-guard.js"></script>'

# ابحث عن كل ملفات HTML في المجلد الحالي
html_files = glob.glob('*.html')

for file_path in html_files:
    # لا تعدل لوحة التحكم نفسها وملف الحماية
    if 'Database-Manager' in file_path or 'universal-page-guard' in file_path:
        print(f"⏭️ تخطي: {file_path} (لوحة التحكم)")
        continue
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # هل الحماية موجودة مسبقاً؟
    if 'universal-page-guard.js' in content:
        print(f"✅ موجود مسبقاً: {file_path}")
        continue
    
    # أضف الحماية في أول <head>
    if '<head>' in content:
        content = content.replace('<head>', '<head>\n  ' + guard_tag + ' <!-- حماية تعطيل الصفحات من لوحة التحكم -->', 1)
    elif '<HEAD>' in content:
        content = content.replace('<HEAD>', '<HEAD>\n  ' + guard_tag, 1)
    else:
        # لو لا يوجد head، أضف في أول الملف
        content = guard_tag + '\n' + content
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"🔧 تمت إضافة الحماية: {file_path}")

print("\n✅ تم الانتهاء - كل الصفحات محمية الآن من ظهور العناصر عند التعطيل")
