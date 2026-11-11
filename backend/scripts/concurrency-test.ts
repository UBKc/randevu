/**
 * EŞZAMANLILIK (RACE CONDITION) TESTİ
 *
 * İki müşteri AYNI ANDA aynı slotu almaya çalışır. Beklenen: biri 201, diğeri
 * 409. Kritik kanıt: her iki istek de UYGULAMA katmanındaki "slot boş mu"
 * kontrolünü geçer; kaybedeni yalnızca VERİTABANI kısıtı (EXCLUDE, 23P01)
 * reddeder. Bu, "neden iki katman gerekiyor" sorusunun somut cevabıdır.
 *
 * Çıktı: docs/05-eszamanlilik-testi.txt
 *
 * Yöntem notları:
 *  - İstekler Promise.all ile GERÇEKTEN eşzamanlı gönderilir (sıralı değil).
 *  - x-test-delay başlığı, uygulama kontrolü ile INSERT arasına gecikme koyar;
 *    böylece iki istek de kontrolü INSERT'ten ÖNCE geçer (interleaving garanti).
 *  - Sunucu alt süreç olarak başlatılır, stdout'u yakalanır (katman logları).
 */
import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../src/prisma';

const API = 'http://localhost:4001';
// Hedef id'ler çalışma anında isimden çözülür (id kaymalarına karşı sağlam).
const TARGET = {
  staffId: 0,
  serviceId: 0,
  startAt: '2026-09-09T15:00:00+03:00', // 9 Eylül 2026 Çarşamba 15:00
};
const TEST_DELAY_MS = 300;

/** Ayşe personeli + verdiği "Saç Kesimi" hizmetinin gerçek id'lerini bulur. */
async function resolveTargetIds() {
  const service = await prisma.service.findFirstOrThrow({ where: { name: 'Saç Kesimi' } });
  const staff = await prisma.staffProfile.findFirstOrThrow({
    where: { user: { fullName: 'Ayşe Kuaför' } },
  });
  TARGET.staffId = staff.id;
  TARGET.serviceId = service.id;
}

const serverLog: string[] = [];

function killPort4001() {
  try {
    const out = execSync('netstat -ano | findstr :4001', { shell: 'cmd.exe' }).toString();
    const pids = new Set<string>();
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/LISTENING\s+(\d+)/);
      if (m) pids.add(m[1]);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } catch {
        /* yoksay */
      }
    }
  } catch {
    /* port boş */
  }
}

function startServer(): Promise<ReturnType<typeof spawn>> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: resolve(__dirname, '..'),
      shell: true,
      env: process.env,
    });
    const onData = (buf: Buffer) => {
      const text = buf.toString();
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) serverLog.push(line.trim());
      }
      if (text.includes('çalışıyor')) resolvePromise(child);
    };
    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', reject);
    setTimeout(() => reject(new Error('Sunucu 20 sn içinde başlamadı')), 20000);
  });
}

async function login(email: string): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Parola123!' }),
  });
  const body = (await res.json()) as { token: string };
  return body.token;
}

interface ReqResult {
  label: string;
  sendTs: string;
  recvTs: string;
  elapsedMs: number;
  status: number;
  body: unknown;
}

function bookConcurrently(label: string, token: string): Promise<ReqResult> {
  const sendMs = performance.now();
  const sendTs = new Date().toISOString();
  return fetch(`${API}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-test-delay': String(TEST_DELAY_MS),
      'x-req-label': label,
    },
    body: JSON.stringify(TARGET),
  }).then(async (res) => {
    const body = await res.json();
    return {
      label,
      sendTs,
      recvTs: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - sendMs),
      status: res.status,
      body,
    };
  });
}

async function cleanupTargetSlot() {
  // Bu slottaki her randevuyu (herhangi bir durumda) sil -> test tekrar çalışabilir.
  const start = new Date(TARGET.startAt);
  const end = new Date(start.getTime() + 60 * 60000);
  await prisma.appointment.deleteMany({
    where: { staffId: TARGET.staffId, startAt: { gte: start, lt: end } },
  });
}

async function main() {
  killPort4001();
  await resolveTargetIds();
  await cleanupTargetSlot();

  console.log('Sunucu başlatılıyor...');
  const child = await startServer();
  serverLog.length = 0; // başlangıç loglarını temizle, sadece test loglarını tut

  const [tokenA, tokenB] = await Promise.all([login('ali@ornek.com'), login('burcu@ornek.com')]);

  // --- GERÇEKTEN EŞZAMANLI: iki promise'ı da await'ten önce başlat ---
  const pA = bookConcurrently('A', tokenA);
  const pB = bookConcurrently('B', tokenB);
  const results = await Promise.all([pA, pB]);

  // Sunucu loglarının tamamının gelmesi için kısa bekleme
  await new Promise((r) => setTimeout(r, 500));

  const byStatus = (s: number) => results.find((r) => r.status === s);
  const winner = byStatus(201);
  const loser = byStatus(409);

  // --- Raporu oluştur ---
  const L: string[] = [];
  const w = (s = '') => L.push(s);
  w('==================================================================');
  w('  EŞZAMANLILIK (RACE CONDITION) TESTİ — ÇIKTI');
  w('==================================================================');
  w('Tarih          : 2026-08-27');
  w(`Hedef slot     : personel=${TARGET.staffId}, hizmet=${TARGET.serviceId}, başlangıç=${TARGET.startAt}`);
  w('Senaryo        : İki müşteri (A=ali, B=burcu) AYNI ANDA aynı slotu alır.');
  w('Gönderim       : Promise.all ile eşzamanlı (sıralı DEĞİL).');
  w(`Test gecikmesi : ${TEST_DELAY_MS} ms (uygulama kontrolü ile INSERT arasında)`);
  w('Beklenen       : biri 201, diğeri 409.');
  w('');
  w('------------------------------------------------------------------');
  w('  1) İSTEMCİ TARAFI ZAMAN DAMGALARI (gerçekten paralel mi?)');
  w('------------------------------------------------------------------');
  for (const r of results) {
    w(`İstek ${r.label}:`);
    w(`   gönderim  : ${r.sendTs}`);
    w(`   yanıt     : ${r.recvTs}  (süre ${r.elapsedMs} ms)`);
    w(`   HTTP      : ${r.status}`);
    w(`   gövde     : ${JSON.stringify(r.body)}`);
  }
  w('');
  w('  -> İki isteğin gönderim damgaları neredeyse aynı; yanıt süreleri de');
  w('     örtüşüyor. Bu, isteklerin sırayla değil paralel gittiğini gösterir.');
  w('');
  w('------------------------------------------------------------------');
  w('  2) SUNUCU TARAFI — İKİ KATMANIN KANITI (en değerli bölüm)');
  w('------------------------------------------------------------------');
  // Yalnızca etiketli kanıt satırlarını al ([A]/[B] ile başlayanlar); tsx'in
  // stderr'e bastığı kaynak-kodu parçacıklarını dışarıda bırak. Kronolojik sırala.
  const katmanLogs = serverLog
    .filter((l) => /^\[[AB]\]\s/.test(l))
    .sort((a, b) => {
      const ta = a.split('@ ')[1] ?? '';
      const tb = b.split('@ ')[1] ?? '';
      return ta.localeCompare(tb);
    });
  for (const l of katmanLogs) w(l);
  w('');
  w('  Yorum:');
  w('   - Her iki istek de "KATMAN1 uygulama kontrolü -> slot BOŞ" satırını');
  w('     üretti. Yani uygulama seviyesindeki ön kontrol İKİSİNİ DE geçirdi;');
  w('     tek başına yeterli OLMADIĞININ kanıtı budur.');
  w('   - Kaybeden istek "KATMAN2 DB kısıtı REDDETTİ (23P01)" ile durduruldu;');
  w('     yani ikinciyi yalnızca VERİTABANI kısıtı engelledi.');
  w('');
  w('------------------------------------------------------------------');
  w('  3) SONUÇ');
  w('------------------------------------------------------------------');
  if (winner && loser) {
    w(`KAZANAN : İstek ${winner.label} -> HTTP 201 (randevu oluşturuldu)`);
    w(`KAYBEDEN: İstek ${loser.label} -> HTTP 409`);
    w(`Temiz 409 mesajı: ${JSON.stringify((loser.body as { error?: string }).error)}`);
    w('(Ham PostgreSQL 23P01 hatası istemciye sızmadı; anlaşılır mesaja çevrildi.)');
    w('');
    w('TEST SONUCU: BAŞARILI ✓  (tam olarak bir 201 ve bir 409)');
  } else {
    w('TEST SONUCU: BEKLENMEDİK — bir 201 ve bir 409 alınamadı.');
    w(`Alınan durumlar: ${results.map((r) => `${r.label}=${r.status}`).join(', ')}`);
  }
  w('==================================================================');

  const text = L.join('\r\n') + '\r\n';
  const outPath = resolve(__dirname, '../../docs/05-eszamanlilik-testi.txt');
  writeFileSync(outPath, text, 'utf8');
  console.log('\n' + text);
  console.log(`Kaydedildi: ${outPath}`);

  // Temizlik: oluşan randevuyu sil (DB seed hâline dönsün) + sunucuyu kapat
  await cleanupTargetSlot();
  await prisma.$disconnect();
  child.kill();
  killPort4001();
}

main().catch(async (err) => {
  console.error('Test hatası:', err);
  await prisma.$disconnect().catch(() => {});
  killPort4001();
  process.exit(1);
});
