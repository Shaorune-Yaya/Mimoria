const nodemailer =
  require(
    "nodemailer"
  );


// ======================================================
// Configuration
// ======================================================

function getEmailMode() {
  return String(
    process.env
      .EMAIL_MODE ||
    "console"
  )
    .trim()
    .toLowerCase();
}


// ======================================================
// SMTP Transport
// ======================================================

function createSmtpTransport() {
  const host =
    process.env
      .SMTP_HOST;

  const port =
    Number(
      process.env
        .SMTP_PORT ||
      587
    );

  const user =
    process.env
      .SMTP_USER;

  const password =
    process.env
      .SMTP_PASS;


  if (
    !host ||
    !user ||
    !password
  ) {
    throw new Error(
      "SMTP configuration is incomplete."
    );
  }


  return nodemailer.createTransport({
    host,

    port,

    secure:
      port ===
      465,

    auth: {
      user,

      pass:
        password,
    },
  });
}


// ======================================================
// Send Verification Email
// ======================================================

async function sendVerificationEmail({
  to,
  username,
  code,
}) {
  const mode =
    getEmailMode();


  // ----------------------------------------------------
  // Development mode
  //
  // No external email provider required.
  // ----------------------------------------------------

  if (
    mode ===
    "console"
  ) {
    console.log(
      "\n========================================"
    );

    console.log(
      "MIMORIA EMAIL VERIFICATION"
    );

    console.log(
      "To:",
      to
    );

    console.log(
      "Username:",
      username
    );

    console.log(
      "Verification code:",
      code
    );

    console.log(
      "Expires in: 10 minutes"
    );

    console.log(
      "========================================\n"
    );


    return {
      mode:
        "console",

      accepted: [
        to,
      ],
    };
  }


  // ----------------------------------------------------
  // SMTP Production / Staging
  // ----------------------------------------------------

  if (
    mode ===
    "smtp"
  ) {
    const transporter =
      createSmtpTransport();


    const from =
      process.env
        .EMAIL_FROM ||
      process.env
        .SMTP_USER;


    const result =
      await transporter.sendMail({
        from:
          `Mimoria <${from}>`,

        to,

        subject:
          "Verify your Mimoria account",

        text:
          [
            `Hello ${username},`,
            "",
            `Your Mimoria verification code is: ${code}`,
            "",
            "This code expires in 10 minutes.",
            "",
            "If you did not create this account, you can ignore this email.",
          ].join(
            "\n"
          ),

        html:
          `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <h2>Verify your Mimoria account</h2>

              <p>Hello ${escapeHtml(
                username
              )},</p>

              <p>Your verification code is:</p>

              <div
                style="
                  font-size: 30px;
                  font-weight: 700;
                  letter-spacing: 6px;
                  margin: 24px 0;
                "
              >
                ${escapeHtml(
                  code
                )}
              </div>

              <p>
                This code expires in 10 minutes.
              </p>

              <p>
                If you did not create this account,
                you can ignore this email.
              </p>
            </div>
          `,
      });


    return {
      mode:
        "smtp",

      messageId:
        result.messageId,

      accepted:
        result.accepted ||
        [],
    };
  }


  throw new Error(
    `Unsupported EMAIL_MODE: ${mode}`
  );
}


// ======================================================
// HTML Escape
// ======================================================

function escapeHtml(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /&/gu,
      "&amp;"
    )
    .replace(
      /</gu,
      "&lt;"
    )
    .replace(
      />/gu,
      "&gt;"
    )
    .replace(
      /"/gu,
      "&quot;"
    )
    .replace(
      /'/gu,
      "&#039;"
    );
}


// ======================================================
// Exports
// ======================================================

module.exports = {
  getEmailMode,

  createSmtpTransport,

  sendVerificationEmail,

  escapeHtml,
};