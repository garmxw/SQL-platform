export const verificationEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify Your Account — SQLCore</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #0a0a0a;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #f0f0f0;
      padding: 48px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Header / Logo ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 40px;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .logo-mark svg { width: 100%; height: 100%; }

    .logo-text {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    /* ── Card ── */
    .card {
      background: #111111;
      border: 1px solid #222222;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .card::before {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, #ffffff 0%, #555555 60%, transparent 100%);
    }

    .card-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .card-inner {
      position: relative;
      padding: 56px 56px 52px;
    }

    /* ── Decorative line numbers ── */
    

    /* ── Tag ── */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #777;
      margin-bottom: 32px;
    }

    .tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
      animation: pulse 2.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.25; transform: scale(0.65); }
    }

    /* ── Greeting ── */
    .greeting {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #777;
      letter-spacing: 0.01em;
      margin-bottom: 12px;
    }

    /* ── Headline ── */
    .headline {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 24px;
    }

    .headline em {
      font-style: normal;
      color: #777;
      font-weight: 400;
    }

    /* ── Body text ── */
    .body-text {
      font-size: 15px;
      line-height: 1.75;
      color: #888;
      max-width: 440px;
      margin-bottom: 40px;
    }

    .body-text strong { color: #bbb; font-weight: 500; }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
    }

    .divider-line { flex: 1; height: 1px; background: #1e1e1e; }

    .divider-label {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #555;
      text-transform: uppercase;
    }

    /* ── Shield visual block ── */
    .shield-block {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #000;
      border: 1px solid #1e1e1e;
      border-radius: 2px;
      padding: 24px 28px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }

    .shield-block::before, .shield-block::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
    }
    .shield-block::before { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
    .shield-block::after  { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

    .shield-icon-wrap {
      flex-shrink: 0;
      width: 52px;
      height: 52px;
      border: 1px solid #2a2a2a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .shield-text { flex: 1; }

    .shield-title {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #ccc;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .shield-sub {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #666;
      letter-spacing: 0.05em;
    }

    .shield-sub strong { color: #777; font-weight: 500; }

    /* ── Code block ── */
    .code-section { margin-bottom: 32px; }

    .code-label {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 14px;
    }

    .code-box {
      background: #000;
      border: 1px solid #2a2a2a;
      border-radius: 2px;
      padding: 40px 32px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 18px;
      position: relative;
      overflow: hidden;
      text-align: center;
      width: 100%;
    }

    .code-box::before, .code-box::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
    }
    .code-box::before { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
    .code-box::after  { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

    .code-value {
      font-family: 'Geist Mono', 'Courier New', monospace;
      font-size: clamp(30px, 9vw, 46px);
      font-weight: 500;
      letter-spacing: 0.3em;
      text-indent: 0.3em;
      color: #ffffff;
      display: block;
      width: 100%;
      text-align: center;
    }

    .code-meta {
      text-align: center;
      width: 100%;
    }

    .code-expires {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #555;
      letter-spacing: 0.03em;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .code-expires-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: #333;
      display: inline-block;
      flex-shrink: 0;
    }

    .code-expires span { color: #888; font-weight: 500; }

    /* ── CTA ── */
    .cta-wrap { margin-bottom: 20px; }

    .cta-btn {
      display: inline-block;
      background: #ffffff;
      color: #000000;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      cursor: pointer;
    }

    .cta-btn::after { content: ' →'; font-size: 15px; }

    /* ── Expiry badge ── */
    .expiry-row { margin-bottom: 44px; }

    .expiry-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 6px 12px;
    }

    .expiry-badge svg { opacity: 0.35; flex-shrink: 0; }

    .expiry-badge span {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #666;
      letter-spacing: 0.04em;
    }

    .expiry-badge strong { color: #777; font-weight: 500; }

    /* ── Notice ── */
    .notice {
      background: #0f0f0f;
      border: 1px solid #1c1c1c;
      border-left: 2px solid #2a2a2a;
      padding: 18px 20px;
      border-radius: 2px;
      margin-bottom: 44px;
    }

    .notice-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .notice-icon { width: 14px; height: 14px; opacity: 0.4; flex-shrink: 0; }

    .notice-title {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #666;
    }

    .notice-text {
      font-size: 13px;
      line-height: 1.65;
      color: #666;
    }

    .notice-text a { color: #777; text-decoration: underline; text-underline-offset: 2px; }

    /* ── Footer ── */
    .footer {
      padding: 32px 52px 40px;
      border-top: 1px solid #1a1a1a;
    }

    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .footer-links { display: flex; gap: 20px; }

    .footer-links a {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #2e2e2e;
      text-decoration: none;
    }

    .footer-copy {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #2a2a2a;
      text-align: right;
    }

    .footer-bottom {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #161616;
    }

    .footer-addr {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #252525;
      line-height: 1.7;
    }

    /* Responsive */
    @media (max-width: 540px) {
      .card-inner { padding: 36px 24px 32px; }
      .footer { padding: 24px 24px 32px; }
      .headline { font-size: 26px; }
      .footer-grid { flex-direction: column; }
      .footer-copy { text-align: left; }
      .shield-block { flex-direction: column; }
      .code-value { font-size: 30px; letter-spacing: 0.2em; text-indent: 0.2em; }
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Logo Header -->
    <div class="header">
      <div class="logo-mark">
        <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="160" fill="#0a0a0a"/>

  <!-- Left — wide squat oval -->
  <ellipse cx="52" cy="88" rx="38" ry="33" fill="#ffffff"/>

  <!-- Center — tall rounded pill -->
  <rect x="97" y="38" width="38" height="84" rx="19" fill="#ffffff"/>

  <!-- Right — tall teardrop leaning -->
  <path
    d="M162 18
       C162 18 188 22 190 56
       C192 86 180 114 172 121
       C164 128 155 128 147 121
       C139 114 136 95 138 70
       C140 43 152 18 162 18 Z"
    fill="#ffffff"
    transform="rotate(7, 162, 72)"
  />
</svg>
      </div>
      <div class="logo-text">SQLCore</div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-bg-pattern"></div>

      <div class="card-inner">

        <!-- Tag -->
        <div class="tag">
          <span class="tag-dot"></span>
          Identity Verification
        </div>

        <!-- Greeting + Headline -->
        <p class="greeting">Hello, {userName}</p>
        <h1 class="headline">Verify your<br><em>identity.</em></h1>

        <p class="body-text">
          We received a sign-in attempt for your <strong>SQLCore</strong> account.
          Use the one-time code below to complete authentication. It expires shortly —
          do not share it with anyone.
        </p>

        <!-- Divider -->
        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-label">One-time code</div>
          <div class="divider-line"></div>
        </div>

        <!-- Shield visual block -->
        <div class="shield-block">
          <div class="shield-icon-wrap">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 2L4 6V13C4 17.97 8.02 22.56 13 24C17.98 22.56 22 17.97 22 13V6L13 2Z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
              <path d="M9 13L11.5 15.5L17 10" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="shield-text">
            <div class="shield-title">Verification requested</div>
            <div class="shield-sub">
              For <strong>{userEmail}</strong> · <strong>{requestTime}</strong>
            </div>
          </div>
        </div>

        <!-- Code block -->
        <div class="code-section">
          <div class="code-label">Your one-time code</div>
          <div class="code-box">
            <div class="code-value">{verificationCode}</div>
            <div class="code-meta">
              <div class="code-expires">
                <span>Expires in 30 min</span>
                <span class="code-expires-dot"></span>
                <span>Single use</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-wrap">
          <a href="#" class="cta-btn">Verify my account</a>
        </div>

        <!-- Expiry badge -->
        <div class="expiry-row">
          <div class="expiry-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#fff" stroke-width="1"/>
              <line x1="6" y1="3" x2="6" y2="6.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
              <line x1="6" y1="6.5" x2="8.2" y2="8" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
            </svg>
            <span>Code valid for <strong>30 minutes</strong> · Single use only</span>
          </div>
        </div>

        <!-- Notice -->
        <div class="notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
              <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#fff"/>
            </svg>
            <div class="notice-title">Didn't request this?</div>
          </div>
          <p class="notice-text">
            If you didn't attempt to sign in, your account may be at risk. We recommend you
            <a href="#">change your password</a> immediately and <a href="#">contact support</a> if
            you suspect unauthorized access. SQLCore will never ask for this code via phone or chat.
          </p>
        </div>

      </div><!-- /.card-inner -->

      <!-- Footer -->
      <div class="footer">
        <div class="footer-grid">
          <div class="footer-links">
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <a href="#">docs</a>
            <a href="#">unsubscribe</a>
          </div>
          <div class="footer-copy">
            © 2025 SQLCore, Inc.<br>All rights reserved.
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-addr">
            SQLCore, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
            This email was sent to {userEmail} because a sign-in was attempted on this account.
          </div>
        </div>
      </div>

    </div><!-- /.card -->

  </div><!-- /.wrapper -->
</body>
</html>`;

export const verificationEmailTest = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Verify Your Account — Vorn</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    body { margin:0 !important; padding:0 !important; width:100% !important; background-color:#0a0a0a; }
    @media only screen and (max-width:600px) {
      .email-wrapper  { width:100% !important; }
      .card-inner-td  { padding:36px 24px 32px !important; }
      .footer-td      { padding:24px !important; }
      .headline-text  { font-size:26px !important; }
      .code-text      { font-size:34px !important; letter-spacing:8px !important; padding-left:8px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;width:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;">
  <tr>
    <td align="center" style="padding:48px 16px;">
      <table class="email-wrapper" role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

        <!-- LOGO -->
        <tr>
          <td style="padding-bottom:32px;">
            <img src="data:image/png;base64,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" width="200" height="40" alt="Vorn" style="display:block;border:0;"/>
          </td>
        </tr>

        <!-- CARD -->
        <tr>
          <td style="background-color:#131313;border:1px solid #222222;border-radius:8px;overflow:hidden;">

            <!-- Accent bar -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="10%" height="3" style="background-color:#ffffff;font-size:0;line-height:0;"></td>
                <td width="50%" height="3" style="background-color:#3a3a3a;font-size:0;line-height:0;"></td>
                <td width="40%" height="3" style="background-color:#131313;font-size:0;line-height:0;"></td>
              </tr>
            </table>

            <!-- CONTENT -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="card-inner-td" style="padding:52px 52px 44px;">

                  <!-- Tag pill -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                    <tr>
                      <td style="background-color:#1e1e1e;border-radius:20px;padding:6px 14px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding-right:7px;vertical-align:middle;">
                              <div style="width:6px;height:6px;border-radius:50%;background-color:#ffffff;font-size:0;line-height:0;">&nbsp;</div>
                            </td>
                            <td style="vertical-align:middle;">
                              <span style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:600;color:#888888;letter-spacing:1.8px;text-transform:uppercase;">Identity Verification</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Greeting -->
                  <p style="font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:400;color:#666666;margin:0 0 10px 0;padding:0;">Hello, {userName}</p>

                  <!-- Headline -->
                  <h1 class="headline-text" style="font-family:'Inter',Arial,sans-serif;font-size:34px;font-weight:800;color:#ffffff;margin:0 0 20px 0;padding:0;line-height:1.1;letter-spacing:-1px;">
                    Verify your identity.
                  </h1>

                  <!-- Body -->
                  <p style="font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:400;color:#888888;line-height:1.75;margin:0 0 40px 0;padding:0;">
                    We received a sign-in attempt for your <span style="color:#cccccc;font-weight:600;">Vorn</span> account.
                    Use the one-time code below to complete verification.
                    It expires in 30 minutes, do not share it with anyone.
                  </p>

                  <!-- Divider -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                    <tr>
                      <td height="1" style="background-color:#222222;font-size:0;line-height:0;"></td>
                    </tr>
                  </table>

                  <!-- Verification requested block -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#1a1a1a;border-radius:8px;margin-bottom:20px;">
                    <tr>
                      <!-- Left accent bar -->
                      <td width="4" style="background-color:#ffffff;border-radius:8px 0 0 8px;font-size:0;line-height:0;"></td>
                      <!-- Icon cell -->
                      <td width="56" style="padding:18px 0 18px 20px;vertical-align:middle;">
                        <table role="presentation" width="36" height="36" cellpadding="0" cellspacing="0" border="0"
                          style="width:36px;height:36px;background-color:#262626;border-radius:8px;">
                          <tr>
                            <td align="center" valign="middle"
                              style="font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;line-height:1;">
                              &#10003;
                            </td>
                          </tr>
                        </table>
                      </td>
                      <!-- Text cell -->
                      <td style="padding:18px 20px;vertical-align:middle;">
                        <p style="font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:600;color:#cccccc;margin:0 0 3px 0;padding:0;">Verification requested</p>
                        <p style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#555555;margin:0;padding:0;">
                          For <span style="color:#888888;font-weight:500;">{userEmail}</span>
                          &nbsp;&middot;&nbsp;
                          <span style="color:#888888;font-weight:500;">{requestTime}</span>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Code label -->
                  <p style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:600;color:#555555;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px 0;padding:0;">Your one-time code</p>

                  <!-- Code box -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#1a1a1a;border-radius:8px;margin-bottom:10px;">
                    <tr>
                      <td align="center" style="padding:36px 24px 28px 24px;">
                        <p class="code-text" style="font-family:'Inter',Arial,sans-serif;font-size:48px;font-weight:800;color:#ffffff;letter-spacing:12px;margin:0 0 16px 0;padding:0 0 0 12px;text-align:center;line-height:1;">{verificationCode}</p>
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                          <tr>
                            <td style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#555555;padding:0 10px;">Expires in 30 min</td>
                            <td style="font-family:'Inter',Arial,sans-serif;font-size:12px;color:#333333;padding:0;">&middot;</td>
                            <td style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#555555;padding:0 10px;">Single use</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- CTA -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:40px;margin-top:24px;">
                    <tr>
                      <td style="border-radius:6px;background-color:#ffffff;">
                        <a href="#" style="display:inline-block;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:600;color:#000000;text-decoration:none;padding:14px 32px;border-radius:6px;letter-spacing:-0.2px;">
                          Verify my account &nbsp;&#8594;
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- Divider -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                    <tr>
                      <td height="1" style="background-color:#1e1e1e;font-size:0;line-height:0;"></td>
                    </tr>
                  </table>

                  <!-- Notice -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background-color:#161616;border-radius:8px;border-left:3px solid #333333;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <p style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;color:#666666;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px 0;padding:0;">Didn't request this?</p>
                        <p style="font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:400;color:#555555;line-height:1.7;margin:0;padding:0;">
                          If you didn't attempt to sign in, your account may be at risk.
                          <a href="#" style="color:#888888;text-decoration:underline;font-weight:500;">Change your password</a> immediately
                          and <a href="#" style="color:#888888;text-decoration:underline;font-weight:500;">contact support</a> if you suspect unauthorized access.
                          Vorn will never ask for this code via phone or chat.
                        </p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>
            </table>

            <!-- FOOTER -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
              style="border-top:1px solid #1e1e1e;">
              <tr>
                <td class="footer-td" style="padding:24px 52px 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                    <tr>
                      <td style="vertical-align:middle;">
                        <a href="#" style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#444444;text-decoration:none;margin-right:20px;">Privacy</a>
                        <a href="#" style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#444444;text-decoration:none;margin-right:20px;">Terms</a>
                        <a href="#" style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#444444;text-decoration:none;margin-right:20px;">Docs</a>
                        <a href="#" style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#444444;text-decoration:none;">Unsubscribe</a>
                      </td>
                      <td style="text-align:right;vertical-align:middle;">
                        <span style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:400;color:#444444;">&#169; 2025 Vorn, Inc.</span>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
                    <tr>
                      <td height="1" style="background-color:#1a1a1a;font-size:0;line-height:0;"></td>
                    </tr>
                  </table>
                  <p style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:400;color:#3a3a3a;line-height:1.6;margin:0;padding:0;">
                    Vorn, Inc. &#183; San Francisco, CA 94105<br/>
                    This email was sent to {userEmail} because a sign-in was attempted on this account.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
        <!-- END CARD -->

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;

export const resetPasswordEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset Your Password — Vorn</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #0a0a0a;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #f0f0f0;
      padding: 48px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Header / Logo ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 40px;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      position: relative;
      flex-shrink: 0;
    }

    .logo-mark svg {
      width: 100%;
      height: 100%;
    }

    .logo-text {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    /* ── Main Card ── */
    .card {
      background: #111111;
      border: 1px solid #222222;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    /* top accent line — amber tint for "warning/action" context */
    .card::before {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, #ffffff 0%, #555555 60%, transparent 100%);
    }

    /* subtle grid texture */
    .card-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .card-inner {
      position: relative;
      padding: 56px 56px 52px;
    }

    /* ── Tag Line ── */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #777;
      margin-bottom: 32px;
    }

    .tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
      animation: pulse 3s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.3; transform: scale(0.7); }
    }

    /* ── Greeting ── */
    .greeting {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      font-weight: 400;
      color: #777;
      letter-spacing: 0.01em;
      margin-bottom: 12px;
    }

    /* ── Headline ── */
    .headline {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 24px;
    }

    .headline em {
      font-style: normal;
      color: #777;
      font-weight: 400;
    }

    /* ── Body text ── */
    .body-text {
      font-size: 15px;
      line-height: 1.75;
      color: #888;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 400;
      max-width: 440px;
      margin-bottom: 40px;
    }

    .body-text strong {
      color: #bbb;
      font-weight: 500;
    }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: #1e1e1e;
    }

    .divider-label {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #555;
      text-transform: uppercase;
    }

    /* ── Reset Link Box ── */
    .link-section {
      margin-bottom: 44px;
    }

    .link-label {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 14px;
    }

    /* CTA Button — primary action */
    .cta-btn {
      display: inline-block;
      background: #ffffff;
      color: #000000;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 20px;
      display: block;
      width: fit-content;
    }

    .cta-btn::after {
      content: ' →';
      font-size: 15px;
    }

    /* Fallback link */
    .link-fallback {
      margin-top: 16px;
    }

    .link-fallback p {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #555;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .link-fallback-url {
      font-family: 'Geist Mono', 'Courier New', monospace;
      font-size: 11px;
      color: #666;
      letter-spacing: 0.02em;
      word-break: break-all;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 10px 14px;
      display: block;
      line-height: 1.6;
    }

    /* ── Expiry Badge ── */
    .expiry-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 44px;
    }

    .expiry-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 6px 12px;
    }

    .expiry-badge svg {
      opacity: 0.4;
      flex-shrink: 0;
    }

    .expiry-badge span {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #777;
      letter-spacing: 0.05em;
    }

    .expiry-badge strong {
      color: #888;
      font-weight: 500;
    }

    /* ── Didn't Request Notice ── */
    .notice {
      background: #0f0f0f;
      border: 1px solid #1c1c1c;
      border-left: 2px solid #2e2e2e;
      padding: 18px 20px;
      border-radius: 2px;
      margin-bottom: 44px;
    }

    .notice-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .notice-icon {
      width: 14px;
      height: 14px;
      opacity: 0.45;
      flex-shrink: 0;
    }

    .notice-title {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #666;
    }

    .notice-text {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.65;
      color: #666;
    }

    .notice-text a {
      color: #888;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    /* ── Footer ── */
    .footer {
      padding: 32px 52px 40px;
      border-top: 1px solid #1a1a1a;
    }

    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .footer-links {
      display: flex;
      gap: 20px;
    }

    .footer-links a {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      letter-spacing: 0;
      color: #2e2e2e;
      text-decoration: none;
    }

    .footer-copy {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #2a2a2a;
      letter-spacing: 0;
      text-align: right;
    }

    .footer-bottom {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #161616;
    }

    .footer-addr {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #252525;
      letter-spacing: 0;
      line-height: 1.7;
    }

    /* ── Gutter Numbers (decorative) ── */
    

    /* Responsive */
    @media (max-width: 540px) {
      .card-inner { padding: 36px 28px 32px; }
      .footer { padding: 24px 28px 32px; }
      .headline { font-size: 26px; }
      .footer-grid { flex-direction: column; }
      .footer-copy { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Logo Header -->
    <div class="header">
      <div class="logo-mark">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="42" height="42" rx="1" stroke="#333" stroke-width="1"/>
          <ellipse cx="22" cy="14" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <line x1="12" y1="14" x2="12" y2="26" stroke="#fff" stroke-width="1.5"/>
          <line x1="32" y1="14" x2="32" y2="26" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="26" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="19" rx="10" ry="4" stroke="#555" stroke-width="1" stroke-dasharray="2 3"/>
          <path d="M4 4 L4 8" stroke="#666" stroke-width="1"/>
          <path d="M4 4 L8 4" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L40 36" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L36 40" stroke="#666" stroke-width="1"/>
        </svg>
      </div>
      <div class="logo-text">Vorn</div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-bg-pattern"></div>

      <!-- decorative line numbers -->

      <div class="card-inner">

        <!-- Tag -->
        <div class="tag">
          <span class="tag-dot"></span>
          Password Reset Request
        </div>

        <!-- Greeting + Headline -->
        <p class="greeting">Hello, {userName}</p>
        <h1 class="headline">Reset your<br><em>password.</em></h1>

        <p class="body-text">
          We received a request to reset the password for your <strong>Vorn</strong> account.
          Click the button below to choose a new password. This link is single-use and
          will expire shortly.
        </p>

        <!-- Divider -->
        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-label">Reset link</div>
          <div class="divider-line"></div>
        </div>

        <!-- CTA + Fallback -->
        <div class="link-section">
          <div class="link-label">Reset action</div>
          <a href="{resetLink}" class="cta-btn">Set new password</a>

          <div class="link-fallback">
            <p>If the button above does not work, copy this link into your browser:</p>
            <span class="link-fallback-url">{resetLink}</span>
          </div>
        </div>

        <!-- Expiry Badge -->
        <div class="expiry-row">
          <div class="expiry-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="6" cy="6" r="5" stroke="#fff" stroke-width="1"/>
              <line x1="6" y1="3" x2="6" y2="6.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
              <line x1="6" y1="6.5" x2="8.2" y2="8" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
            </svg>
            <span>Link expires in <strong>30 minutes</strong> · Single use only</span>
          </div>
        </div>

        <!-- Didn't request notice -->
        <div class="notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
              <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#fff"/>
            </svg>
            <div class="notice-title">Didn't request this?</div>
          </div>
          <p class="notice-text">
            If you didn't request a password reset, you can safely ignore this email — your password
            will remain unchanged. If you're concerned about your account's security,
            please <a href="#">contact our support team</a> immediately.
          </p>
        </div>

      </div><!-- /.card-inner -->

      <!-- Footer -->
      <div class="footer">
        <div class="footer-grid">
          <div class="footer-links">
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <a href="#">docs</a>
            <a href="#">unsubscribe</a>
          </div>
          <div class="footer-copy">
            © 2025 Vorn, Inc.<br>All rights reserved.
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-addr">
            Vorn, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
            This email was sent to {userEmail} because a password reset was requested for this account.
          </div>
        </div>
      </div>

    </div><!-- /.card -->

  </div><!-- /.wrapper -->
</body>
</html>`;

// this maybe wrong , maybe need to remove it

// export const forgotPasswordEmailTemplate = `<!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
//   <title>Forgot Password — SQLCore</title>
//   <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
//   <style>
//     * { margin: 0; padding: 0; box-sizing: border-box; }

//     body {
//       background-color: #0a0a0a;
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       color: #f0f0f0;
//       padding: 48px 16px;
//       -webkit-font-smoothing: antialiased;
//     }

//     .wrapper {
//       max-width: 600px;
//       margin: 0 auto;
//     }

//     /* ── Header / Logo ── */
//     .header {
//       display: flex;
//       align-items: center;
//       gap: 14px;
//       margin-bottom: 40px;
//     }

//     .logo-mark {
//       width: 44px;
//       height: 44px;
//       flex-shrink: 0;
//     }

//     .logo-mark svg { width: 100%; height: 100%; }

//     .logo-text {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 20px;
//       font-weight: 600;
//       letter-spacing: -0.03em;
//       color: #ffffff;
//     }

//     /* ── Card ── */
//     .card {
//       background: #111111;
//       border: 1px solid #222222;
//       border-radius: 2px;
//       overflow: hidden;
//       position: relative;
//     }

//     .card::before {
//       content: '';
//       display: block;
//       height: 2px;
//       background: linear-gradient(90deg, #ffffff 0%, #555555 60%, transparent 100%);
//     }

//     .card-bg-pattern {
//       position: absolute;
//       inset: 0;
//       background-image:
//         linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
//         linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
//       background-size: 28px 28px;
//       pointer-events: none;
//     }

//     .card-inner {
//       position: relative;
//       padding: 56px 56px 52px;
//     }

//     /* ── Decorative line numbers ── */

//     /* ── Tag ── */
//     .tag {
//       display: inline-flex;
//       align-items: center;
//       gap: 8px;
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 10px;
//       letter-spacing: 0.18em;
//       text-transform: uppercase;
//       color: #777;
//       margin-bottom: 32px;
//     }

//     .tag-dot {
//       width: 6px;
//       height: 6px;
//       border-radius: 50%;
//       background: #fff;
//       animation: blink 2s ease-in-out infinite;
//     }

//     @keyframes blink {
//       0%, 100% { opacity: 1; transform: scale(1); }
//       50%       { opacity: 0.25; transform: scale(0.65); }
//     }

//     /* ── Greeting ── */
//     .greeting {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 13px;
//       color: #777;
//       letter-spacing: 0.01em;
//       margin-bottom: 12px;
//     }

//     /* ── Headline ── */
//     .headline {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 32px;
//       font-weight: 600;
//       letter-spacing: -0.04em;
//       line-height: 1.15;
//       color: #ffffff;
//       margin-bottom: 24px;
//     }

//     .headline em {
//       font-style: normal;
//       color: #777;
//       font-weight: 400;
//     }

//     /* ── Body text ── */
//     .body-text {
//       font-size: 15px;
//       line-height: 1.75;
//       color: #888;
//       max-width: 440px;
//       margin-bottom: 40px;
//     }

//     .body-text strong { color: #bbb; font-weight: 500; }

//     /* ── Divider ── */
//     .divider {
//       display: flex;
//       align-items: center;
//       gap: 16px;
//       margin-bottom: 36px;
//     }

//     .divider-line { flex: 1; height: 1px; background: #1e1e1e; }

//     .divider-label {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 9px;
//       letter-spacing: 0.2em;
//       color: #555;
//       text-transform: uppercase;
//     }

//     /* ── Key visual — lock icon block ── */
//     .lock-block {
//       display: flex;
//       align-items: center;
//       gap: 20px;
//       background: #000;
//       border: 1px solid #1e1e1e;
//       border-radius: 2px;
//       padding: 24px 28px;
//       margin-bottom: 32px;
//       position: relative;
//       overflow: hidden;
//     }

//     /* corner accents */
//     .lock-block::before, .lock-block::after {
//       content: '';
//       position: absolute;
//       width: 14px;
//       height: 14px;
//     }
//     .lock-block::before { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
//     .lock-block::after  { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

//     .lock-icon-wrap {
//       flex-shrink: 0;
//       width: 52px;
//       height: 52px;
//       border: 1px solid #2a2a2a;
//       border-radius: 50%;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//     }

//     .lock-icon-wrap svg { opacity: 0.85; }

//     .lock-text { flex: 1; }

//     .lock-title {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 14px;
//       font-weight: 500;
//       color: #ccc;
//       letter-spacing: -0.02em;
//       margin-bottom: 4px;
//     }

//     .lock-sub {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 10px;
//       color: #666;
//       letter-spacing: 0.05em;
//     }

//     .lock-sub strong { color: #777; font-weight: 500; }

//     /* ── Steps ── */
//     .steps {
//       display: flex;
//       flex-direction: column;
//       gap: 0;
//       margin-bottom: 40px;
//     }

//     .step {
//       display: flex;
//       align-items: flex-start;
//       gap: 16px;
//       padding: 14px 0;
//       border-bottom: 1px solid #161616;
//     }

//     .step:last-child { border-bottom: none; }

//     .step-num {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 10px;
//       color: #555;
//       letter-spacing: 0.1em;
//       flex-shrink: 0;
//       padding-top: 1px;
//       width: 28px;
//     }

//     .step-content { flex: 1; }

//     .step-title {
//       font-size: 13px;
//       font-weight: 500;
//       color: #bbb;
//       letter-spacing: -0.01em;
//       margin-bottom: 2px;
//     }

//     .step-desc {
//       font-size: 13px;
//       color: #666;
//       line-height: 1.6;
//     }

//     /* ── CTA ── */
//     .cta-wrap { margin-bottom: 36px; }

//     .cta-btn {
//       display: inline-block;
//       background: #ffffff;
//       color: #000000;
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 14px;
//       font-weight: 500;
//       letter-spacing: -0.01em;
//       text-decoration: none;
//       padding: 14px 28px;
//       border-radius: 6px;
//       cursor: pointer;
//     }

//     .cta-btn::after { content: ' →'; font-size: 15px; }

//     /* ── Fallback link ── */
//     .link-fallback { margin-top: 16px; }

//     .link-fallback p {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 10px;
//       color: #555;
//       letter-spacing: 0.05em;
//       margin-bottom: 8px;
//     }

//     .link-fallback-url {
//       font-family: 'Geist Mono', 'Courier New', monospace;
//       font-size: 11px;
//       color: #666;
//       word-break: break-all;
//       background: #0d0d0d;
//       border: 1px solid #1e1e1e;
//       border-radius: 4px;
//       padding: 10px 14px;
//       display: block;
//       line-height: 1.6;
//     }

//     /* ── Expiry row ── */
//     .expiry-row {
//       margin-top: 20px;
//       margin-bottom: 44px;
//     }

//     .expiry-badge {
//       display: inline-flex;
//       align-items: center;
//       gap: 6px;
//       background: #0d0d0d;
//       border: 1px solid #1e1e1e;
//       border-radius: 4px;
//       padding: 6px 12px;
//     }

//     .expiry-badge svg { opacity: 0.35; flex-shrink: 0; }

//     .expiry-badge span {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 10px;
//       color: #666;
//       letter-spacing: 0.04em;
//     }

//     .expiry-badge strong { color: #777; font-weight: 500; }

//     /* ── Notice ── */
//     .notice {
//       background: #0f0f0f;
//       border: 1px solid #1c1c1c;
//       border-left: 2px solid #2a2a2a;
//       padding: 18px 20px;
//       border-radius: 2px;
//       margin-bottom: 44px;
//     }

//     .notice-header {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       margin-bottom: 8px;
//     }

//     .notice-icon { width: 14px; height: 14px; opacity: 0.4; flex-shrink: 0; }

//     .notice-title {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 9px;
//       letter-spacing: 0.2em;
//       text-transform: uppercase;
//       color: #666;
//     }

//     .notice-text {
//       font-size: 13px;
//       line-height: 1.65;
//       color: #666;
//     }

//     .notice-text a { color: #777; text-decoration: underline; text-underline-offset: 2px; }

//     /* ── Footer ── */
//     .footer {
//       padding: 32px 52px 40px;
//       border-top: 1px solid #1a1a1a;
//     }

//     .footer-grid {
//       display: flex;
//       justify-content: space-between;
//       align-items: flex-start;
//       gap: 24px;
//     }

//     .footer-links { display: flex; gap: 20px; }

//     .footer-links a {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 11px;
//       color: #2e2e2e;
//       text-decoration: none;
//     }

//     .footer-copy {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 11px;
//       color: #2a2a2a;
//       text-align: right;
//     }

//     .footer-bottom {
//       margin-top: 24px;
//       padding-top: 20px;
//       border-top: 1px solid #161616;
//     }

//     .footer-addr {
//       font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       font-size: 11px;
//       color: #252525;
//       line-height: 1.7;
//     }

//     /* Responsive */
//     @media (max-width: 540px) {
//       .card-inner { padding: 36px 28px 32px; }
//       .footer { padding: 24px 28px 32px; }
//       .headline { font-size: 26px; }
//       .footer-grid { flex-direction: column; }
//       .footer-copy { text-align: left; }
//       .lock-block { flex-direction: column; }
//     }
//   </style>
// </head>
// <body>
//   <div class="wrapper">

//     <!-- Logo Header -->
//     <div class="header">
//       <div class="logo-mark">
//         <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
//           <rect x="1" y="1" width="42" height="42" rx="1" stroke="#333" stroke-width="1"/>
//           <ellipse cx="22" cy="14" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
//           <line x1="12" y1="14" x2="12" y2="26" stroke="#fff" stroke-width="1.5"/>
//           <line x1="32" y1="14" x2="32" y2="26" stroke="#fff" stroke-width="1.5"/>
//           <ellipse cx="22" cy="26" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
//           <ellipse cx="22" cy="19" rx="10" ry="4" stroke="#555" stroke-width="1" stroke-dasharray="2 3"/>
//           <path d="M4 4 L4 8" stroke="#666" stroke-width="1"/>
//           <path d="M4 4 L8 4" stroke="#666" stroke-width="1"/>
//           <path d="M40 40 L40 36" stroke="#666" stroke-width="1"/>
//           <path d="M40 40 L36 40" stroke="#666" stroke-width="1"/>
//         </svg>
//       </div>
//       <div class="logo-text">SQLCore</div>
//     </div>

//     <!-- Main Card -->
//     <div class="card">
//       <div class="card-bg-pattern"></div>

//       <div class="card-inner">

//         <!-- Tag -->
//         <div class="tag">
//           <span class="tag-dot"></span>
//           Account Recovery
//         </div>

//         <!-- Greeting + Headline -->
//         <p class="greeting">Hello, {userName}</p>
//         <h1 class="headline">Forgot your<br><em>password?</em></h1>

//         <p class="body-text">
//           No worries — it happens to the best of us. We received a request to recover
//           access to your <strong>SQLCore</strong> account. Follow the steps below to
//           get back in.
//         </p>

//         <!-- Divider -->
//         <div class="divider">
//           <div class="divider-line"></div>
//           <div class="divider-label">Recovery</div>
//           <div class="divider-line"></div>
//         </div>

//         <!-- Lock visual block -->
//         <div class="lock-block">
//           <div class="lock-icon-wrap">
//             <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
//               <!-- shackle -->
//               <path d="M8 11V8C8 5.24 10.24 3 13 3C15.76 3 18 5.24 18 8V11" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
//               <!-- body -->
//               <rect x="5" y="11" width="16" height="12" rx="2" stroke="#fff" stroke-width="1.5"/>
//               <!-- keyhole -->
//               <circle cx="13" cy="17" r="2" stroke="#fff" stroke-width="1.2"/>
//               <line x1="13" y1="19" x2="13" y2="21" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
//             </svg>
//           </div>
//           <div class="lock-text">
//             <div class="lock-title">Access recovery initiated</div>
//             <div class="lock-sub">
//               Requested for <strong>{userEmail}</strong> · <strong>{requestTime}</strong>
//             </div>
//           </div>
//         </div>

//         <!-- Steps -->
//         <div class="steps">
//           <div class="step">
//             <div class="step-num">01.</div>
//             <div class="step-content">
//               <div class="step-title">Click the recovery link below</div>
//               <div class="step-desc">Opens a secure page to create a new password for your account.</div>
//             </div>
//           </div>
//           <div class="step">
//             <div class="step-num">02.</div>
//             <div class="step-content">
//               <div class="step-title">Choose a strong new password</div>
//               <div class="step-desc">At least 12 characters. Mix letters, numbers, and symbols.</div>
//             </div>
//           </div>
//           <div class="step">
//             <div class="step-num">03.</div>
//             <div class="step-content">
//               <div class="step-title">Sign back in to SQLCore</div>
//               <div class="step-desc">All active sessions will be logged out automatically for your security.</div>
//             </div>
//           </div>
//         </div>

//         <!-- CTA -->
//         <div class="cta-wrap">
//           <div style="font-family:'Geist Mono','Courier New',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#3a3a3a;margin-bottom:14px;">Recovery link</div>
//           <a href="{recoveryLink}" class="cta-btn">Recover my account</a>

//           <div class="link-fallback">
//             <p>Or paste this link into your browser:</p>
//             <span class="link-fallback-url">{recoveryLink}</span>
//           </div>
//         </div>

//         <!-- Expiry -->
//         <div class="expiry-row">
//           <div class="expiry-badge">
//             <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
//               <circle cx="6" cy="6" r="5" stroke="#fff" stroke-width="1"/>
//               <line x1="6" y1="3" x2="6" y2="6.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
//               <line x1="6" y1="6.5" x2="8.2" y2="8" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
//             </svg>
//             <span>Link expires in <strong>15 minutes</strong> · Single use only</span>
//           </div>
//         </div>

//         <!-- Notice -->
//         <div class="notice">
//           <div class="notice-header">
//             <svg class="notice-icon" viewBox="0 0 14 14" fill="none">
//               <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
//               <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
//               <circle cx="7" cy="10" r="0.6" fill="#fff"/>
//             </svg>
//             <div class="notice-title">Didn't request this?</div>
//           </div>
//           <p class="notice-text">
//             If you didn't ask to recover your account, your password is still safe — just ignore
//             this email and nothing will change. If you suspect unauthorized access, please
//             <a href="#">contact support</a> right away.
//           </p>
//         </div>

//       </div><!-- /.card-inner -->

//       <!-- Footer -->
//       <div class="footer">
//         <div class="footer-grid">
//           <div class="footer-links">
//             <a href="#">privacy</a>
//             <a href="#">terms</a>
//             <a href="#">docs</a>
//             <a href="#">unsubscribe</a>
//           </div>
//           <div class="footer-copy">
//             © 2025 SQLCore, Inc.<br>All rights reserved.
//           </div>
//         </div>
//         <div class="footer-bottom">
//           <div class="footer-addr">
//             SQLCore, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
//             This email was sent to {userEmail} because a password recovery was requested for this account.
//           </div>
//         </div>
//       </div>

//     </div><!-- /.card -->

//   </div><!-- /.wrapper -->
// </body>
// </html>`;

export const accountChangeEmailTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Address Change — SQLCore</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #0a0a0a;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #f0f0f0;
      padding: 48px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Header / Logo ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 40px;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .logo-mark svg { width: 100%; height: 100%; }

    .logo-text {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    /* ── Card ── */
    .card {
      background: #111111;
      border: 1px solid #222222;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .card::before {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, #ffffff 0%, #555555 60%, transparent 100%);
    }

    .card-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .card-inner {
      position: relative;
      padding: 56px 56px 52px;
    }

    /* ── Decorative line numbers ── */
    

    /* ── Tag ── */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #777;
      margin-bottom: 32px;
    }

    .tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
      animation: pulse 2.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.25; transform: scale(0.65); }
    }

    /* ── Greeting ── */
    .greeting {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      color: #777;
      letter-spacing: 0.01em;
      margin-bottom: 12px;
    }

    /* ── Headline ── */
    .headline {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 24px;
    }

    .headline em {
      font-style: normal;
      color: #777;
      font-weight: 400;
    }

    /* ── Body text ── */
    .body-text {
      font-size: 15px;
      line-height: 1.75;
      color: #888;
      max-width: 440px;
      margin-bottom: 40px;
    }

    .body-text strong { color: #bbb; font-weight: 500; }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
    }

    .divider-line { flex: 1; height: 1px; background: #1e1e1e; }

    .divider-label {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #555;
      text-transform: uppercase;
    }

    /* ── Email change visual block ── */
    .change-block {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #000;
      border: 1px solid #1e1e1e;
      border-radius: 2px;
      padding: 24px 28px;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
    }

    .change-block::before, .change-block::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
    }
    .change-block::before { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
    .change-block::after  { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

    .change-icon-wrap {
      flex-shrink: 0;
      width: 52px;
      height: 52px;
      border: 1px solid #2a2a2a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .change-text { flex: 1; }

    .change-title {
      font-size: 14px;
      font-weight: 500;
      color: #ccc;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .change-sub {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #666;
      letter-spacing: 0.05em;
    }

    .change-sub strong { color: #777; font-weight: 500; }

    /* ── Email transition rows ── */
    .email-transition {
      margin-bottom: 36px;
    }

    .email-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid #161616;
    }

    .email-row:last-child { border-bottom: none; }

    .email-row-label {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #555;
      flex-shrink: 0;
      width: 52px;
    }

    .email-row-value {
      font-family: 'Geist Mono', 'Courier New', monospace;
      font-size: 12px;
      letter-spacing: 0.02em;
      flex: 1;
    }

    .email-row-value.old { color: #666; text-decoration: line-through; text-decoration-color: #2e2e2e; }
    .email-row-value.new { color: #ccc; }

    .arrow-row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 8px 0;
    }

    .arrow-spacer { width: 52px; flex-shrink: 0; }

    .arrow-icon {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      color: #2a2a2a;
    }

    /* ── CTA ── */
    .cta-wrap { margin-bottom: 20px; }

    .cta-btn {
      display: inline-block;
      background: #ffffff;
      color: #000000;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      cursor: pointer;
    }

    .cta-btn::after { content: ' →'; font-size: 15px; }

    /* ── Expiry badge ── */
    .expiry-row { margin-bottom: 44px; }

    .expiry-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 6px 12px;
    }

    .expiry-badge svg { opacity: 0.35; flex-shrink: 0; }

    .expiry-badge span {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10px;
      color: #666;
      letter-spacing: 0.04em;
    }

    .expiry-badge strong { color: #777; font-weight: 500; }

    /* ── Notice ── */
    .notice {
      background: #0f0f0f;
      border: 1px solid #1c1c1c;
      border-left: 2px solid #2a2a2a;
      padding: 18px 20px;
      border-radius: 2px;
      margin-bottom: 44px;
    }

    .notice-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .notice-icon { width: 14px; height: 14px; opacity: 0.4; flex-shrink: 0; }

    .notice-title {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #666;
    }

    .notice-text {
      font-size: 13px;
      line-height: 1.65;
      color: #666;
    }

    .notice-text a { color: #777; text-decoration: underline; text-underline-offset: 2px; }

    /* ── Footer ── */
    .footer {
      padding: 32px 52px 40px;
      border-top: 1px solid #1a1a1a;
    }

    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .footer-links { display: flex; gap: 20px; }

    .footer-links a {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #2e2e2e;
      text-decoration: none;
    }

    .footer-copy {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #2a2a2a;
      text-align: right;
    }

    .footer-bottom {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #161616;
    }

    .footer-addr {
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #252525;
      line-height: 1.7;
    }

    /* Responsive */
    @media (max-width: 540px) {
      .card-inner { padding: 36px 28px 32px; }
      .footer { padding: 24px 28px 32px; }
      .headline { font-size: 26px; }
      .footer-grid { flex-direction: column; }
      .footer-copy { text-align: left; }
      .change-block { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Logo Header -->
    <div class="header">
      <div class="logo-mark">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="42" height="42" rx="1" stroke="#333" stroke-width="1"/>
          <ellipse cx="22" cy="14" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <line x1="12" y1="14" x2="12" y2="26" stroke="#fff" stroke-width="1.5"/>
          <line x1="32" y1="14" x2="32" y2="26" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="26" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="19" rx="10" ry="4" stroke="#555" stroke-width="1" stroke-dasharray="2 3"/>
          <path d="M4 4 L4 8" stroke="#666" stroke-width="1"/>
          <path d="M4 4 L8 4" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L40 36" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L36 40" stroke="#666" stroke-width="1"/>
        </svg>
      </div>
      <div class="logo-text">SQLCore</div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-bg-pattern"></div>

      <div class="card-inner">

        <!-- Tag -->
        <div class="tag">
          <span class="tag-dot"></span>
          Account Update
        </div>

        <!-- Greeting + Headline -->
        <p class="greeting">Hello, {userName}</p>
        <h1 class="headline">Confirm your<br><em>new email.</em></h1>

        <p class="body-text">
          A request was made to update the email address on your <strong>SQLCore</strong> account.
          Confirm the change below to complete the update. Your old address will remain active
          until you do.
        </p>

        <!-- Divider -->
        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-label">Email change</div>
          <div class="divider-line"></div>
        </div>

        <!-- Change visual block -->
        <div class="change-block">
          <div class="change-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="#fff" stroke-width="1.5"/>
              <path d="M2 8L12 13.5L22 8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="16" y1="15" x2="20" y2="15" stroke="#555" stroke-width="1" stroke-linecap="round"/>
              <line x1="18" y1="13" x2="20" y2="15" stroke="#555" stroke-width="1" stroke-linecap="round"/>
              <line x1="18" y1="17" x2="20" y2="15" stroke="#555" stroke-width="1" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="change-text">
            <div class="change-title">Email update pending</div>
            <div class="change-sub">Requested at <strong>{requestTime}</strong> · Confirm to apply</div>
          </div>
        </div>

        <!-- Email transition -->
        <div class="email-transition">
          <div class="email-row">
            <div class="email-row-label">From</div>
            <div class="email-row-value old">{oldEmail}</div>
          </div>
          <div class="arrow-row">
            <div class="arrow-spacer"></div>
            <div class="arrow-icon">↓</div>
          </div>
          <div class="email-row">
            <div class="email-row-label">To</div>
            <div class="email-row-value new">{newEmail}</div>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-wrap">
          <a href="{confirmLink}" class="cta-btn">Confirm new email</a>
        </div>

        <!-- Expiry badge -->
        <div class="expiry-row">
          <div class="expiry-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#fff" stroke-width="1"/>
              <line x1="6" y1="3" x2="6" y2="6.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
              <line x1="6" y1="6.5" x2="8.2" y2="8" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
            </svg>
            <span>Link expires in <strong>24 hours</strong> · Single use only</span>
          </div>
        </div>

        <!-- Notice -->
        <div class="notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
              <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#fff"/>
            </svg>
            <div class="notice-title">Didn't request this?</div>
          </div>
          <p class="notice-text">
            If you didn't request an email change, your account may be compromised. Do not click
            the link above. <a href="#">Secure your account</a> immediately and
            <a href="#">contact our support team</a> — your current email address will not be
            changed unless you confirm it.
          </p>
        </div>

      </div><!-- /.card-inner -->

      <!-- Footer -->
      <div class="footer">
        <div class="footer-grid">
          <div class="footer-links">
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <a href="#">docs</a>
            <a href="#">unsubscribe</a>
          </div>
          <div class="footer-copy">
            © 2025 SQLCore, Inc.<br>All rights reserved.
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-addr">
            SQLCore, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
            This email was sent to {oldEmail} because an email change was requested on this account.
          </div>
        </div>
      </div>

    </div><!-- /.card -->

  </div><!-- /.wrapper -->
</body>
</html>`;

export const accountChangeEmailTemplate2 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Change Your Email — SQLCore</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #0a0a0a;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #f0f0f0;
      padding: 48px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Header / Logo ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 40px;
    }

    .logo-mark {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }

    .logo-mark svg { width: 100%; height: 100%; }

    .logo-text {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    /* ── Card ── */
    .card {
      background: #111111;
      border: 1px solid #222222;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .card::before {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, #ffffff 0%, #555555 60%, transparent 100%);
    }

    .card-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .card-inner {
      position: relative;
      padding: 56px 56px 52px;
    }

    /* ── Tag ── */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #777;
      margin-bottom: 32px;
    }

    .tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
      animation: pulse 2.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.25; transform: scale(0.65); }
    }

    /* ── Greeting ── */
    .greeting {
      font-size: 13px;
      color: #777;
      letter-spacing: 0.01em;
      margin-bottom: 12px;
    }

    /* ── Headline ── */
    .headline {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 24px;
    }

    .headline em {
      font-style: normal;
      color: #555;
      font-weight: 400;
    }

    /* ── Body text ── */
    .body-text {
      font-size: 15px;
      line-height: 1.75;
      color: #888;
      max-width: 440px;
      margin-bottom: 40px;
    }

    .body-text strong { color: #bbb; font-weight: 500; }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
    }

    .divider-line { flex: 1; height: 1px; background: #1e1e1e; }

    .divider-label {
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #555;
      text-transform: uppercase;
    }

    /* ── Info block ── */
    .info-block {
      display: flex;
      align-items: center;
      gap: 20px;
      background: #000;
      border: 1px solid #1e1e1e;
      border-radius: 2px;
      padding: 24px 28px;
      margin-bottom: 36px;
      position: relative;
    }

    .info-block::before, .info-block::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
    }
    .info-block::before { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
    .info-block::after  { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

    .info-icon-wrap {
      flex-shrink: 0;
      width: 52px;
      height: 52px;
      border: 1px solid #2a2a2a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .info-text { flex: 1; }

    .info-title {
      font-size: 14px;
      font-weight: 500;
      color: #ccc;
      letter-spacing: -0.02em;
      margin-bottom: 4px;
    }

    .info-sub {
      font-size: 12px;
      color: #555;
      letter-spacing: 0.01em;
    }

    .info-sub strong { color: #777; font-weight: 500; }

    /* ── Current email row ── */
    .current-email-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 14px 18px;
      margin-bottom: 32px;
    }

    .current-email-label {
      font-size: 11px;
      color: #555;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .current-email-value {
      font-family: 'Geist Mono', 'Courier New', monospace;
      font-size: 13px;
      color: #888;
      letter-spacing: 0.02em;
      flex: 1;
      text-align: right;
    }

    /* ── Steps ── */
    .steps {
      display: flex;
      flex-direction: column;
      margin-bottom: 40px;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #161616;
    }

    .step:last-child { border-bottom: none; }

    .step-num {
      font-size: 10px;
      font-weight: 500;
      color: #555;
      letter-spacing: 0.1em;
      flex-shrink: 0;
      padding-top: 1px;
      width: 28px;
    }

    .step-content { flex: 1; }

    .step-title {
      font-size: 14px;
      font-weight: 500;
      color: #bbb;
      letter-spacing: -0.01em;
      margin-bottom: 3px;
    }

    .step-desc {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }

    /* ── CTA ── */
    .cta-wrap { margin-bottom: 20px; }

    .cta-btn {
      display: inline-block;
      background: #ffffff;
      color: #000000;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
      cursor: pointer;
    }

    .cta-btn::after { content: ' →'; font-size: 15px; }

    /* Fallback link */
    .link-fallback { margin-top: 16px; }

    .link-fallback p {
      font-size: 11px;
      color: #444;
      letter-spacing: 0.03em;
      margin-bottom: 8px;
    }

    .link-fallback-url {
      font-family: 'Geist Mono', 'Courier New', monospace;
      font-size: 11px;
      color: #555;
      word-break: break-all;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 10px 14px;
      display: block;
      line-height: 1.6;
    }

    /* ── Expiry badge ── */
    .expiry-row { margin-top: 20px; margin-bottom: 44px; }

    .expiry-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0d0d0d;
      border: 1px solid #1e1e1e;
      border-radius: 4px;
      padding: 6px 12px;
    }

    .expiry-badge svg { opacity: 0.35; flex-shrink: 0; }

    .expiry-badge span {
      font-size: 11px;
      color: #555;
      letter-spacing: 0.02em;
    }

    .expiry-badge strong { color: #888; font-weight: 500; }

    /* ── Notice ── */
    .notice {
      background: #0f0f0f;
      border: 1px solid #1c1c1c;
      border-left: 2px solid #2a2a2a;
      padding: 18px 20px;
      border-radius: 2px;
      margin-bottom: 44px;
    }

    .notice-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .notice-icon { width: 14px; height: 14px; opacity: 0.4; flex-shrink: 0; }

    .notice-title {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #555;
    }

    .notice-text {
      font-size: 13px;
      line-height: 1.65;
      color: #666;
    }

    .notice-text a { color: #777; text-decoration: underline; text-underline-offset: 2px; }

    /* ── Footer ── */
    .footer {
      padding: 32px 56px 40px;
      border-top: 1px solid #1a1a1a;
    }

    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .footer-links { display: flex; gap: 20px; }

    .footer-links a {
      font-size: 11px;
      color: #2e2e2e;
      text-decoration: none;
    }

    .footer-copy {
      font-size: 11px;
      color: #2a2a2a;
      text-align: right;
    }

    .footer-bottom {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #161616;
    }

    .footer-addr {
      font-size: 11px;
      color: #252525;
      line-height: 1.7;
    }

    /* Responsive */
    @media (max-width: 540px) {
      .card-inner { padding: 36px 28px 32px; }
      .footer { padding: 24px 28px 32px; }
      .headline { font-size: 26px; }
      .footer-grid { flex-direction: column; }
      .footer-copy { text-align: left; }
      .info-block { flex-direction: column; }
      .current-email-row { flex-direction: column; align-items: flex-start; }
      .current-email-value { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Logo Header -->
    <div class="header">
      <div class="logo-mark">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="42" height="42" rx="1" stroke="#333" stroke-width="1"/>
          <ellipse cx="22" cy="14" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <line x1="12" y1="14" x2="12" y2="26" stroke="#fff" stroke-width="1.5"/>
          <line x1="32" y1="14" x2="32" y2="26" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="26" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="19" rx="10" ry="4" stroke="#555" stroke-width="1" stroke-dasharray="2 3"/>
          <path d="M4 4 L4 8" stroke="#666" stroke-width="1"/>
          <path d="M4 4 L8 4" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L40 36" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L36 40" stroke="#666" stroke-width="1"/>
        </svg>
      </div>
      <div class="logo-text">SQLCore</div>
    </div>

    <!-- Main Card -->
    <div class="card">
      <div class="card-bg-pattern"></div>

      <div class="card-inner">

        <!-- Tag -->
        <div class="tag">
          <span class="tag-dot"></span>
          Account Settings
        </div>

        <!-- Greeting + Headline -->
        <p class="greeting">Hello, {userName}</p>
        <h1 class="headline">Change your<br><em>email address.</em></h1>

        <p class="body-text">
          You requested to update the email address associated with your <strong>SQLCore</strong>
          account. Click the button below to open the secure email change form and enter
          your new address.
        </p>

        <!-- Divider -->
        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-label">How it works</div>
          <div class="divider-line"></div>
        </div>

        <!-- Info block — current email -->
        <div class="info-block">
          <div class="info-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="#fff" stroke-width="1.5"/>
              <path d="M2 8L12 13.5L22 8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="info-text">
            <div class="info-title">Email change initiated</div>
            <div class="info-sub">Current address: <strong>{currentEmail}</strong></div>
          </div>
        </div>

        <!-- Steps -->
        <div class="steps">
          <div class="step">
            <div class="step-num">01.</div>
            <div class="step-content">
              <div class="step-title">Click the button below</div>
              <div class="step-desc">Opens a secure form where you can type in your new email address.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">02.</div>
            <div class="step-content">
              <div class="step-title">Enter and confirm your new email</div>
              <div class="step-desc">You'll type your new address twice to make sure there are no typos.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">03.</div>
            <div class="step-content">
              <div class="step-title">Verify the new address</div>
              <div class="step-desc">A confirmation email will be sent to your new address. Click the link inside to finalize the change.</div>
            </div>
          </div>
          <div class="step">
            <div class="step-num">04.</div>
            <div class="step-content">
              <div class="step-title">You're all set</div>
              <div class="step-desc">Your account will use the new email for all future sign-ins and notifications.</div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="cta-wrap">
          <a href="{changeEmailLink}" class="cta-btn">Change my email</a>

          <div class="link-fallback">
            <p>Or paste this link into your browser:</p>
            <span class="link-fallback-url">{changeEmailLink}</span>
          </div>
        </div>

        <!-- Expiry badge -->
        <div class="expiry-row">
          <div class="expiry-badge">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="#fff" stroke-width="1"/>
              <line x1="6" y1="3" x2="6" y2="6.5" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
              <line x1="6" y1="6.5" x2="8.2" y2="8" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
            </svg>
            <span>Link expires in <strong>1 hour</strong> · Single use only</span>
          </div>
        </div>

        <!-- Notice -->
        <div class="notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
              <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#fff"/>
            </svg>
            <div class="notice-title">Didn't request this?</div>
          </div>
          <p class="notice-text">
            If you didn't initiate an email change, your account may be at risk.
            Do not click the link above and <a href="#">contact our support team</a> immediately.
            Your current email address will not change unless you complete the steps above.
          </p>
        </div>

      </div><!-- /.card-inner -->

      <!-- Footer -->
      <div class="footer">
        <div class="footer-grid">
          <div class="footer-links">
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <a href="#">docs</a>
            <a href="#">unsubscribe</a>
          </div>
          <div class="footer-copy">
            © 2025 SQLCore, Inc.<br>All rights reserved.
          </div>
        </div>
        <div class="footer-bottom">
          <div class="footer-addr">
            SQLCore, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
            This email was sent to {currentEmail} because an email change was requested on this account.
          </div>
        </div>
      </div>

    </div><!-- /.card -->

  </div><!-- /.wrapper -->
</body>
</html>`;

export const changeSuccessfully = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Account Updated — SQLCore</title>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: #0a0a0a;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #f0f0f0;
      padding: 48px 16px;
      -webkit-font-smoothing: antialiased;
    }

    .wrapper {
      max-width: 600px;
      margin: 0 auto;
    }

    /* ── Header / Logo ── */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 40px;
    }

    .logo-mark { width: 44px; height: 44px; flex-shrink: 0; }
    .logo-mark svg { width: 100%; height: 100%; }

    .logo-text {
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: #ffffff;
    }

    /* ── Card ── */
    .card {
      background: #111111;
      border: 1px solid #222222;
      border-radius: 2px;
      overflow: hidden;
      position: relative;
    }

    .card::before {
      content: '';
      display: block;
      height: 2px;
      background: linear-gradient(90deg, #ffffff 0%, #555555 60%, transparent 100%);
    }

    .card-bg-pattern {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none;
    }

    .card-inner {
      position: relative;
      padding: 56px 56px 52px;
    }

    /* ── Tag ── */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #777;
      margin-bottom: 32px;
    }

    .tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #fff;
    }

    /* ── Greeting ── */
    .greeting {
      font-size: 13px;
      color: #777;
      margin-bottom: 12px;
    }

    /* ── Headline ── */
    .headline {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.15;
      color: #ffffff;
      margin-bottom: 24px;
    }

    .headline em {
      font-style: normal;
      color: #555;
      font-weight: 400;
    }

    /* ── Body text ── */
    .body-text {
      font-size: 15px;
      line-height: 1.75;
      color: #888;
      max-width: 440px;
      margin-bottom: 40px;
    }

    .body-text strong { color: #bbb; font-weight: 500; }

    /* ── Divider ── */
    .divider {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 36px;
    }

    .divider-line { flex: 1; height: 1px; background: #1e1e1e; }

    .divider-label {
      font-size: 9px;
      letter-spacing: 0.2em;
      color: #555;
      text-transform: uppercase;
    }

    /* ── Success block ── */
    .success-block {
      background: #000;
      border: 1px solid #1e1e1e;
      border-radius: 2px;
      padding: 40px 32px;
      margin-bottom: 44px;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 18px;
    }

    .success-block::before, .success-block::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
    }
    .success-block::before { top: -1px; left: -1px; border-top: 2px solid #fff; border-left: 2px solid #fff; }
    .success-block::after  { bottom: -1px; right: -1px; border-bottom: 2px solid #fff; border-right: 2px solid #fff; }

    .success-icon-wrap {
      width: 64px;
      height: 64px;
      border: 1px solid #2a2a2a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .success-title {
      font-size: 17px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.03em;
    }

    .success-time {
      font-size: 12px;
      color: #555;
      letter-spacing: 0.02em;
    }

    .success-time strong { color: #777; font-weight: 500; }

    /* ── CTA ── */
    .cta-wrap { margin-bottom: 44px; }

    .cta-btn {
      display: inline-block;
      background: #ffffff;
      color: #000000;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: -0.01em;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 6px;
    }

    .cta-btn::after { content: ' →'; font-size: 15px; }

    /* ── Notice ── */
    .notice {
      background: #0f0f0f;
      border: 1px solid #1c1c1c;
      border-left: 2px solid #2a2a2a;
      padding: 18px 20px;
      border-radius: 2px;
      margin-bottom: 44px;
    }

    .notice-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .notice-icon { width: 14px; height: 14px; opacity: 0.4; flex-shrink: 0; }

    .notice-title {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #555;
    }

    .notice-text {
      font-size: 13px;
      line-height: 1.65;
      color: #666;
    }

    .notice-text a { color: #777; text-decoration: underline; text-underline-offset: 2px; }

    /* ── Footer ── */
    .footer {
      padding: 32px 56px 40px;
      border-top: 1px solid #1a1a1a;
    }

    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .footer-links { display: flex; gap: 20px; }

    .footer-links a {
      font-size: 11px;
      color: #2e2e2e;
      text-decoration: none;
    }

    .footer-copy {
      font-size: 11px;
      color: #2a2a2a;
      text-align: right;
    }

    .footer-bottom {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #161616;
    }

    .footer-addr {
      font-size: 11px;
      color: #252525;
      line-height: 1.7;
    }

    /* Responsive */
    @media (max-width: 540px) {
      .card-inner { padding: 36px 24px 32px; }
      .footer { padding: 24px 24px 32px; }
      .headline { font-size: 26px; }
      .footer-grid { flex-direction: column; }
      .footer-copy { text-align: left; }
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Logo Header -->
    <div class="header">
      <div class="logo-mark">
        <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="42" height="42" rx="1" stroke="#333" stroke-width="1"/>
          <ellipse cx="22" cy="14" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <line x1="12" y1="14" x2="12" y2="26" stroke="#fff" stroke-width="1.5"/>
          <line x1="32" y1="14" x2="32" y2="26" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="26" rx="10" ry="4" stroke="#fff" stroke-width="1.5"/>
          <ellipse cx="22" cy="19" rx="10" ry="4" stroke="#555" stroke-width="1" stroke-dasharray="2 3"/>
          <path d="M4 4 L4 8" stroke="#666" stroke-width="1"/>
          <path d="M4 4 L8 4" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L40 36" stroke="#666" stroke-width="1"/>
          <path d="M40 40 L36 40" stroke="#666" stroke-width="1"/>
        </svg>
      </div>
      <div class="logo-text">SQLCore</div>
    </div>

    <!-- ============================================================
         VARIANT A — PASSWORD CHANGED
         Use this when the user successfully changes their password.
         To switch to email variant, see VARIANT B below.
    ============================================================= -->
    <div class="card">
      <div class="card-bg-pattern"></div>
      <div class="card-inner">

        <div class="tag">
          <span class="tag-dot"></span>
          Security Notification
        </div>

        <p class="greeting">Hello, {userName}</p>
        <h1 class="headline">Your password<br><em>was changed.</em></h1>

        <p class="body-text">
          The password for your <strong>SQLCore</strong> account has been successfully updated.
          If this was you, no further action is needed.
        </p>

        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-label">Confirmation</div>
          <div class="divider-line"></div>
        </div>

        <div class="success-block">
          <div class="success-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="#fff" stroke-width="1.5"/>
              <path d="M9 14.5L12.5 18L19 11" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="success-title">Password updated successfully</div>
          <div class="success-time">on <strong>{changeDate}</strong> at <strong>{changeTime}</strong></div>
        </div>

        <div class="cta-wrap">
          <a href="{dashboardLink}" class="cta-btn">Go to my account</a>
        </div>

        <div class="notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
              <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#fff"/>
            </svg>
            <div class="notice-title">Wasn't you?</div>
          </div>
          <p class="notice-text">
            If you didn't make this change, your account may be compromised.
            <a href="{resetLink}">Reset your password immediately</a> and
            <a href="{supportLink}">contact our support team</a> right away.
          </p>
        </div>

      </div>

      <div class="footer">
        <div class="footer-grid">
          <div class="footer-links">
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <a href="#">docs</a>
            <a href="#">unsubscribe</a>
          </div>
          <div class="footer-copy">© 2025 SQLCore, Inc.<br>All rights reserved.</div>
        </div>
        <div class="footer-bottom">
          <div class="footer-addr">
            SQLCore, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
            This email was sent to {userEmail} to confirm a password change on your account.
          </div>
        </div>
      </div>
    </div>
    <!-- ============================================================
         END VARIANT A
    ============================================================= -->


    <!-- ============================================================
         VARIANT B — EMAIL CHANGED
         Use this when the user successfully changes their email.
         To use: remove the card block above (VARIANT A) and
         uncomment everything between the dashes below.
    ============================================================= -->
    <!--
    <div class="card">
      <div class="card-bg-pattern"></div>
      <div class="card-inner">

        <div class="tag">
          <span class="tag-dot"></span>
          Account Notification
        </div>

        <p class="greeting">Hello, {userName}</p>
        <h1 class="headline">Your email<br><em>was changed.</em></h1>

        <p class="body-text">
          The email address on your <strong>SQLCore</strong> account has been
          successfully updated. Use your new address to sign in from now on.
        </p>

        <div class="divider">
          <div class="divider-line"></div>
          <div class="divider-label">Confirmation</div>
          <div class="divider-line"></div>
        </div>

        <div class="success-block">
          <div class="success-icon-wrap">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="#fff" stroke-width="1.5"/>
              <path d="M9 14.5L12.5 18L19 11" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="success-title">Email updated successfully</div>
          <div class="success-time">on <strong>{changeDate}</strong> at <strong>{changeTime}</strong></div>
        </div>

        <div class="cta-wrap">
          <a href="{dashboardLink}" class="cta-btn">Go to my account</a>
        </div>

        <div class="notice">
          <div class="notice-header">
            <svg class="notice-icon" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L1.5 3.5V7C1.5 10.08 4 12.95 7 13.5C10 12.95 12.5 10.08 12.5 7V3.5L7 1Z" stroke="#fff" stroke-width="1"/>
              <line x1="7" y1="5" x2="7" y2="8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
              <circle cx="7" cy="10" r="0.6" fill="#fff"/>
            </svg>
            <div class="notice-title">Wasn't you?</div>
          </div>
          <p class="notice-text">
            If you didn't make this change, your account may be compromised.
            <a href="{resetLink}">Secure your account immediately</a> and
            <a href="{supportLink}">contact our support team</a> right away.
          </p>
        </div>

      </div>

      <div class="footer">
        <div class="footer-grid">
          <div class="footer-links">
            <a href="#">privacy</a>
            <a href="#">terms</a>
            <a href="#">docs</a>
            <a href="#">unsubscribe</a>
          </div>
          <div class="footer-copy">© 2025 SQLCore, Inc.<br>All rights reserved.</div>
        </div>
        <div class="footer-bottom">
          <div class="footer-addr">
            SQLCore, Inc. · 742 Database Drive, Suite 0x1F · San Francisco, CA 94105<br>
            This email was sent to {oldEmail} to confirm an email address change on your account.
          </div>
        </div>
      </div>
    </div>
    -->
    <!-- ============================================================
         END VARIANT B
    ============================================================= -->

  </div>
</body>
</html>`;
