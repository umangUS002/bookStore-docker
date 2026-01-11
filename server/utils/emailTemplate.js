export const newBookEmailTemplate = (book) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New Book Added</title>
</head>

<body style="margin:0;padding:0;background-color:#f5f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:30px 15px;">
        <table width="100%" max-width="600" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:#ec4899;padding:20px 30px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;">
                📚 Book Cart
              </h1>
              <p style="margin:5px 0 0;color:#ffe4f0;font-size:14px;">
                New Arrival Notification
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:30px;">
              <h2 style="color:#111827;font-size:22px;margin-bottom:10px;">
                A New Book Has Been Added!
              </h2>

              <p style="color:#4b5563;font-size:15px;line-height:1.6;">
                We’ve just added a new book to our collection that we think you’ll love.
              </p>

              <div style="margin:25px 0;padding:20px;border-radius:10px;background:#f9fafb;border:1px solid #e5e7eb;">
                <h3 style="margin:0;color:#111827;font-size:18px;">
                  ${book.title}
                </h3>
                <p style="margin:5px 0;color:#6b7280;font-size:14px;">
                  by ${book.author}
                </p>

                <p style="margin-top:10px;color:#374151;font-size:14px;line-height:1.6;">
                  ${book.description?.slice(0, 150)}...
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin:30px 0;">
                <a href="${process.env.FRONTEND_URL}/book/${book._id}"
                   style="background:#ec4899;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:15px;display:inline-block;">
                  View Book →
                </a>
              </div>

              <p style="color:#6b7280;font-size:13px;text-align:center;">
                Happy Reading! 📖✨
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                You’re receiving this email because you subscribed to Book Cart updates.
              </p>
              <p style="margin:8px 0 0;">
                <a href="${process.env.FRONTEND_URL}/unsubscribe?email={{email}}"
                   style="color:#ec4899;font-size:12px;text-decoration:none;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
