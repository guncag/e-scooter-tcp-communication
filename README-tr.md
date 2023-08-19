# Omni IoT Cihazları TCP Haberleşme Yönetimi

Bu proje, Omni marka IoT cihazları ile TCP üzerinden haberleşmeyi yönetir.

## Başlangıç

Bu bölümde projenin nasıl kurulacağı ve çalıştırılacağı anlatılmaktadır.

### Ön Koşullar

- Node.js kurulu olmalıdır.
- Firebase servis hesabı anahtarınız olmalı ve proje klasörüne eklenmelidir.

### Kurulum

1. Projeyi klonlayın:

```
git clone <repo_link>
```

2. Bağımlılıkları yükleyin:

```
npm install
```

3. `.env` dosyasını oluşturun ve gerekli yapılandırmaları ekleyin. ( şuan için implemente edilmedi )

4. Uygulamayı başlatın:

```
node index.js
```

 

## Kullanım

Proje, Omni cihazlarından gelen TCP isteklerini dinler ve bu isteklere uygun olarak cevap verir. Aynı zamanda Firebase ile veri eşleştirmesi yapar ve belirli komutları cihazlara geri gönderir.

Bu projeyi kullanmadan önce, IoT cihazlarınızı kendi sunucunuza ve belirlemiş olduğunuz porta yönlendirmelisiniz. Bu proje sayesinde, TCP sunucusuna bir istek yaparak sunucuya bağlı cihaza anlık komutlar gönderebilirsiniz.

Örnek olarak, cihazı başlatmak ve harici kilidi açmak için, başka bir projeden ya da "Packet Sender" gibi araçlar kullanarak aşağıdaki komutu gönderebilirsiniz:

```
*SCOS,OM,IMEINUMBER,R0,0,20,1234,16401#\n
```

Bu komutta:

- **IMEINUMBER**: Komutu göndermek istediğiniz cihazın IMEI numarasıdır.
- **1234**: Kullanıcı ID'sidir.
- **16401**: Zaman damgasıdır ve her seferinde benzersiz olmalıdır.

Yukarıdaki komut formatını kullanarak, IoT cihazlarınızla iletişim kurabilir ve bu sunucu aracılığıyla işlemlerini yönetebilirsiniz.

 

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakabilirsiniz.
 