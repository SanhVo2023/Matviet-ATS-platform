# Hướng dẫn cấu hình Microsoft 365 cho hệ thống Mắt Việt HR

**Người gửi:** Sanh Võ — Phòng IT / Marketing — sanh.vlt@matkinh.com.vn
**Người nhận:** Phòng IT Mắt Việt
**Phạm vi:** Cấu hình một-lần để hệ thống tuyển dụng nội bộ ("Mắt Việt HR") có thể gửi/nhận email và đặt lịch phỏng vấn qua hộp thư `hr@matviet.com.vn`.

**Tổng thời gian dự kiến:** 60–90 phút (chủ yếu chờ DNS / chờ admin consent lan truyền).

---

## 1. Tổng quan — IT cần làm gì

Hệ thống Mắt Việt HR cần truy cập **Microsoft Graph API** để:

1. **Gửi email** từ `hr@matviet.com.vn` (thư mời phỏng vấn, offer, từ chối, xác nhận đã nhận CV).
2. **Đọc email đến** từ ứng viên + từ TopCV/CareerViet (lọc CV đính kèm tự động vào hệ thống).
3. **Tạo sự kiện lịch Outlook** cho buổi phỏng vấn, kèm Microsoft Teams link tự động.
4. **Đọc trạng thái phản hồi** (chấp nhận / từ chối lịch phỏng vấn).

Để làm được, IT cần:

- ✅ **Bước A:** Đảm bảo hộp thư chia sẻ `hr@matviet.com.vn` đã tồn tại (kiểm tra Exchange Admin Center).
- ✅ **Bước B:** Đăng ký một **Azure AD application** đại diện cho hệ thống.
- ✅ **Bước C:** Cấp quyền (API permissions) — chỉ những quyền tối thiểu cần thiết.
- ✅ **Bước D:** Tạo **client secret** (hoặc certificate, ưu tiên cert cho production).
- ✅ **Bước E:** Hạn chế ứng dụng chỉ truy cập đúng hộp thư `hr@matviet.com.vn` — KHÔNG cho động vào các hộp thư khác.
- ✅ **Bước F:** Cấu hình bản ghi DNS (SPF / DKIM / DMARC) trên domain `matviet.com.vn` để email đi không bị đánh dấu spam.
- ✅ **Bước G:** Tạo thư mục con `Hiring/Processed` trong hộp thư `hr@` (tổ chức email đã xử lý).
- ✅ **Bước H:** Bàn giao 3 thông tin sau cho Sanh:
  - **Tenant ID** (GUID dạng `xxxx-xxxx-xxxx-xxxx-xxxx`)
  - **Client ID** (GUID)
  - **Client secret** (chuỗi dạng `~xxxx.xxxx...`) **hoặc** certificate `.pfx` + password

> ⚠️ **Cảnh báo bảo mật:** Client secret là khoá quan trọng. Vui lòng gửi qua kênh bảo mật (mã hoá / chia sẻ qua 1Password / messenger có E2EE, **KHÔNG** qua email Outlook plain-text).

---

## 2. Bước A — Kiểm tra hộp thư `hr@matviet.com.vn`

Truy cập [admin.exchange.microsoft.com](https://admin.exchange.microsoft.com) → **Recipients** → **Mailboxes** (hoặc **Shared**).

- Nếu `hr@matviet.com.vn` đã tồn tại: ✅ chuyển sang Bước B.
- Nếu chưa: tạo mới dạng **Shared mailbox** (không cần license riêng).
  - Display name: `Mắt Việt HR`
  - Email: `hr@matviet.com.vn`
  - Cấp quyền truy cập (Send As + Read) cho chị Bùi Thị Hương (HR Staff).

---

## 3. Bước B — Đăng ký Azure AD application

1. Truy cập [entra.microsoft.com](https://entra.microsoft.com) → **Identity** → **Applications** → **App registrations** → **+ New registration**.
2. Điền:
   - **Name:** `Mat Viet HR Automation`
   - **Supported account types:** `Accounts in this organizational directory only (Single tenant)`
   - **Redirect URI:** **để trống** (đây là daemon app, không cần redirect)
3. Bấm **Register**.
4. Sau khi tạo, sẽ thấy trang **Overview** hiển thị:
   - **Application (client) ID** → ghi lại, đây là **Client ID**.
   - **Directory (tenant) ID** → ghi lại, đây là **Tenant ID**.

---

## 4. Bước C — Cấp API permissions

Trong app vừa tạo, vào tab **API permissions**:

1. Bấm **+ Add a permission** → chọn **Microsoft Graph** → chọn **Application permissions** (KHÔNG chọn Delegated).
2. Thêm các quyền sau (gõ tên rồi tick):

| Permission | Mục đích |
|---|---|
| `Mail.Send` | Gửi email từ hr@ |
| `Mail.Read` | Đọc email đến (lọc CV) |
| `Mail.ReadWrite` | Đánh dấu đã đọc + di chuyển vào thư mục Processed |
| `Calendars.ReadWrite` | Tạo sự kiện phỏng vấn + Teams link |
| `MailboxSettings.Read` | Đọc thông tin múi giờ + ngôn ngữ |

3. Sau khi thêm xong, bấm **Grant admin consent for [tenant của Mắt Việt]**.
   - Chỉ tài khoản **Global Administrator** mới làm được bước này.
   - Cột **Status** sẽ chuyển sang **Granted for ...** (dấu xanh).

⏱️ **Quan trọng:** Sau khi grant, mất tối đa **15 phút** để quyền lan truyền.

---

## 5. Bước D — Tạo Client secret HOẶC Certificate

### Tuỳ chọn 1 — Client secret (đơn giản, dùng cho test/staging)

1. Trong app, vào tab **Certificates & secrets** → **+ New client secret**.
2. Mô tả: `Mat Viet HR — production`
3. Hạn: chọn **24 months** (gia hạn lại vào tháng 4/2028).
4. Bấm **Add**.
5. **NGAY LẬP TỨC** sao chép giá trị ở cột **Value** (chỉ hiện 1 lần). Lưu vào nơi an toàn.

### Tuỳ chọn 2 — Certificate (khuyến nghị cho production)

Nếu phòng IT muốn dùng certificate (tự rotation, an toàn hơn secret), thực hiện:

```powershell
# Trên máy admin, mở PowerShell as Administrator:
$cert = New-SelfSignedCertificate `
  -Subject "CN=matviet-hr-app" `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -KeyExportPolicy Exportable `
  -KeySpec Signature `
  -KeyLength 2048 `
  -KeyAlgorithm RSA `
  -HashAlgorithm SHA256 `
  -NotAfter (Get-Date).AddYears(2)

# Xuất file .pfx để bàn giao Sanh:
$pwd = ConvertTo-SecureString -String "<MẬT_KHẨU_BẢO_VỆ_PFX>" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "C:\matviet-hr-cert.pfx" -Password $pwd

# Xuất file .cer để upload lên Azure AD:
Export-Certificate -Cert $cert -FilePath "C:\matviet-hr-cert.cer"
```

Sau đó:
1. Vào **Certificates & secrets** → **Certificates** → **Upload certificate** → upload file `.cer`.
2. Bàn giao file `.pfx` + mật khẩu cho Sanh qua kênh bảo mật.

---

## 6. Bước E — Hạn chế ứng dụng chỉ truy cập đúng hộp thư hr@

> ⚠️ **CỰC KỲ QUAN TRỌNG:** Mặc định, app có quyền `Mail.Send` sẽ gửi được từ **mọi hộp thư** trong tổ chức. Phải hạn chế chỉ cho hr@.

Mở **Exchange Online PowerShell** (cài module nếu chưa có: `Install-Module ExchangeOnlineManagement`):

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@matviet.com.vn

# Tạo distribution group chứa hộp thư được phép
New-DistributionGroup -Name "MatVietHR-Allowed-Mailboxes" -Type Distribution
Add-DistributionGroupMember -Identity "MatVietHR-Allowed-Mailboxes" -Member "hr@matviet.com.vn"

# Áp policy lên app (thay <CLIENT_ID> bằng giá trị thật)
New-ApplicationAccessPolicy `
  -AppId "<CLIENT_ID>" `
  -PolicyScopeGroupId "MatVietHR-Allowed-Mailboxes" `
  -AccessRight RestrictAccess `
  -Description "Chỉ cho phép Mat Viet HR app truy cập mailbox hr@"
```

### Kiểm tra (BẮT BUỘC)

```powershell
# Phải trả về AccessCheckResult: Granted
Test-ApplicationAccessPolicy -Identity hr@matviet.com.vn -AppId "<CLIENT_ID>"

# Phải trả về AccessCheckResult: Denied (lấy bất kỳ user nào khác trong org)
Test-ApplicationAccessPolicy -Identity sanh.vlt@matkinh.com.vn -AppId "<CLIENT_ID>"
```

⏱️ **Lưu ý:** Policy mất tối đa **1 giờ** để có hiệu lực thực tế. Trong giờ đó kết quả test có thể chưa chính xác — đợi rồi test lại.

---

## 7. Bước F — Cấu hình DNS (SPF / DKIM / DMARC)

> Để email từ `hr@matviet.com.vn` không bị Gmail / Yahoo / Outlook khác đánh dấu spam.

### 7.1 — SPF (TXT record trên `matviet.com.vn`)

```
matviet.com.vn   TXT   "v=spf1 include:spf.protection.outlook.com -all"
```

(Nếu domain đã có SPF record cho dịch vụ khác, **gộp** chứ đừng tạo nhiều record SPF — Gmail sẽ từ chối nếu thấy >1 SPF.)

### 7.2 — DKIM (kích hoạt qua Exchange Admin Center)

1. Vào [security.microsoft.com](https://security.microsoft.com) → **Email & collaboration** → **Policies & rules** → **Threat policies** → **Email authentication settings** → **DKIM**.
2. Chọn `matviet.com.vn` → bấm **Create DKIM keys**.
3. Microsoft sẽ yêu cầu tạo 2 bản ghi CNAME:

```
selector1._domainkey.matviet.com.vn   CNAME   selector1-matviet-com-vn._domainkey.<tenant>.onmicrosoft.com
selector2._domainkey.matviet.com.vn   CNAME   selector2-matviet-com-vn._domainkey.<tenant>.onmicrosoft.com
```

4. Sau khi DNS lan truyền (5–30 phút), quay lại Exchange admin → bấm **Enable** cho DKIM.

### 7.3 — DMARC (TXT record)

```
_dmarc.matviet.com.vn   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc@matviet.com.vn; fo=1; pct=100"
```

Bắt đầu với `p=quarantine` (bỏ vào spam). Sau 2–4 tuần monitoring qua `rua=`, có thể nâng lên `p=reject` nếu không có vấn đề.

### 7.4 — Kiểm tra

Sau khi cả 3 record đã lan truyền, kiểm tra tại:

- https://mxtoolbox.com/spf.aspx?domain=matviet.com.vn
- https://mxtoolbox.com/dkim.aspx?domain=matviet.com.vn&selector=selector1
- https://mxtoolbox.com/dmarc.aspx?domain=matviet.com.vn

Cả 3 phải hiển thị **PASS**.

---

## 8. Bước G — Tạo thư mục con `Hiring/Processed` trong hộp thư hr@

Đăng nhập Outlook web (hoặc Outlook desktop) bằng tài khoản có quyền truy cập hộp thư `hr@matviet.com.vn`:

1. Bên trái → chuột phải vào hộp thư `hr@` → **Create new folder** → đặt tên `Hiring`.
2. Chuột phải vào `Hiring` → **Create new folder** → đặt tên `Processed`.

Hệ thống sẽ tự động di chuyển email đã quét CV vào `hr@/Hiring/Processed` để hộp thư chính không bị đầy.

---

## 9. Bước H — Bàn giao thông tin cho Sanh

Sau khi hoàn tất Bước A → G, vui lòng bàn giao **qua kênh bảo mật** (1Password vault, Bitwarden share, hoặc Signal):

```
Tenant ID:        ___________________________ (GUID, lấy ở Bước B)
Client ID:        ___________________________ (GUID, lấy ở Bước B)
Client secret:    ___________________________ (chuỗi, lấy ở Bước D — chỉ hiện 1 lần)
                  HOẶC
Certificate:      file matviet-hr-cert.pfx + mật khẩu PFX

ApplicationAccessPolicy đã áp dụng:    ☐ Đã làm (Bước E)
SPF/DKIM/DMARC qua mxtoolbox PASS:     ☐ Đã làm (Bước F)
Thư mục Hiring/Processed đã tạo:       ☐ Đã làm (Bước G)
```

---

## 10. Câu hỏi thường gặp

**Q1: Sao không dùng tài khoản người dùng (chị Hương) trực tiếp gửi email mà phải qua Azure AD app?**

Vì bảo mật. App-only authentication không cần lưu mật khẩu của chị Hương trong hệ thống; nếu app bị khóa cũng không ảnh hưởng tài khoản cá nhân. Đồng thời log đầy đủ — biết chính xác email nào do hệ thống gửi.

**Q2: ApplicationAccessPolicy có rủi ro gì không?**

Không. Đây là cơ chế chính thức của Microsoft để hạn chế phạm vi của app-only permissions. Sau khi áp dụng, app **CHỈ** truy cập được hộp thư trong distribution group — kể cả khi app bị compromise cũng không lộ dữ liệu hộp thư khác.

**Q3: Client secret hết hạn thì sao?**

Sanh sẽ được nhắc trước 30 ngày. Tạo secret mới (Bước D), gửi cho Sanh, Sanh cập nhật vào hệ thống. Secret cũ vẫn dùng được đến lúc hết hạn → không downtime.

**Q4: SPF/DKIM/DMARC đã có sẵn cho dịch vụ email khác (vd: Mailchimp) thì sao?**

- **SPF:** Gộp chung — `v=spf1 include:spf.protection.outlook.com include:servers.mcsv.net -all`. Chỉ một bản ghi SPF duy nhất.
- **DKIM:** Mỗi dịch vụ có selector riêng, không xung đột.
- **DMARC:** Mỗi domain chỉ có một record DMARC. Giữ nguyên record cũ là được.

**Q5: Tôi có thể test mà không cần bàn giao hết cho Sanh không?**

Có. Sau Bước E, dùng PowerShell:

```powershell
# Cài Microsoft.Graph module (nếu chưa)
Install-Module Microsoft.Graph -Scope CurrentUser

# Test gửi email
$tenantId = "<TENANT_ID>"
$clientId = "<CLIENT_ID>"
$clientSecret = "<CLIENT_SECRET>"

$body = @{
  client_id = $clientId
  scope = "https://graph.microsoft.com/.default"
  client_secret = $clientSecret
  grant_type = "client_credentials"
}
$token = (Invoke-RestMethod -Method Post -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" -Body $body).access_token

# Gửi email test
$mail = @{
  message = @{
    subject = "Test từ Mat Viet HR app"
    body = @{ contentType = "Text"; content = "Đây là email test." }
    toRecipients = @(@{ emailAddress = @{ address = "sanh.vlt@matkinh.com.vn" } })
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post `
  -Uri "https://graph.microsoft.com/v1.0/users/hr@matviet.com.vn/sendMail" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body $mail
```

Email PASS → bàn giao cho Sanh.

---

## 11. Liên hệ

- **Sanh Võ** (Phòng IT/Marketing) — sanh.vlt@matkinh.com.vn — đầu mối kỹ thuật
- **Tài liệu Microsoft chính thức:**
  - [Get access without a user (app-only)](https://learn.microsoft.com/en-us/graph/auth-v2-service)
  - [ApplicationAccessPolicy](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access)
  - [DKIM trong Microsoft 365](https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/use-dkim-to-validate-outbound-email)

Cảm ơn phòng IT! Khi xong các bước trên, hệ thống Mắt Việt HR sẽ tự động hoá phần lớn công việc gửi email tuyển dụng + đặt lịch phỏng vấn cho chị Hương — tiết kiệm khoảng 30% thời gian thao tác email mỗi tuần.

— **Sanh Võ**, 2026-04-29
