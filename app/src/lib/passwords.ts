/** Random temp password with mixed classes — shared by the invite flow and the
 * admin "Đặt mật khẩu mới" dialog (client-safe: WebCrypto only). */
export function generateTempPassword(length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
