# อากาศดีไหม — PM2.5 โรงเรียนปทุมวิไล

หน้าเว็บภาษาไทยสำหรับดู **ค่าเฉลี่ยพยากรณ์ PM2.5 ใน 24 ชั่วโมงถัดไป** รอบโรงเรียนปทุมวิไล มีกราฟแนวโน้มและคำแนะนำที่เปลี่ยนตามระดับฝุ่น

## แหล่งข้อมูล

- Open-Meteo Air Quality API: https://open-meteo.com/en/docs/air-quality-api
- CAMS Global atmospheric composition forecast (ความละเอียดประมาณ 45 กม.)
- ใช้พิกัดโรงเรียน 14.019089, 100.526552 และเวลา Asia/Bangkok
- คำแนะนำสุขภาพอ้างอิงช่วงค่า PM2.5 ที่กรมอนามัยใช้สื่อสาร

แบบจำลองระดับภูมิภาคไม่ใช่เครื่องวัดภายในโรงเรียนและอาจแตกต่างจากค่าจริง โปรดติดตาม Air4Thai และประกาศของโรงเรียนประกอบ

## เปิดดูในเครื่อง

เปิด index.html ในเบราว์เซอร์ หรือใช้ static file server ด้วยคำสั่ง python -m http.server 8000 แล้วเปิด http://localhost:8000

## เผยแพร่ด้วย GitHub Pages

1. สร้าง repository และอัปโหลดไฟล์ในโฟลเดอร์นี้ไปไว้ที่ root ของ branch main
2. ไปที่ Settings → Pages
3. ตั้ง Deploy from a branch แล้วเลือก main และ / (root)

เว็บไซต์เป็น static HTML/CSS/JavaScript ไม่ต้องใช้ build step หรือ API key สำหรับการใช้งานทั่วไป
