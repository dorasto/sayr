---
title: Security
description: Protect your Sayr account with two-factor authentication, passkeys, and active session management
sidebar:
   order: 4
---

Sayr's security settings let you add multiple layers of protection to your account. Navigate to **Settings > Security** to manage them.

## Two-Factor Authentication (2FA)

Two-factor authentication requires a second verification step beyond your password when you sign in. This protects your account even if your password is compromised.

:::note[Password Required]
2FA requires that your account has a password. If you signed up exclusively via GitHub or Doras OAuth and have never set a password, the 2FA toggle is disabled until you add one. Use **Settings > Connections** to request a password reset email.
:::

### Enabling 2FA

1. Go to **Settings > Security**
2. Toggle the **Two-Factor Authentication** switch to on
3. Enter your current password to confirm the change
4. Scan the QR code with an authenticator app (Google Authenticator, Authy, 1Password, etc.)
5. Enter the 6-digit code from your app to verify the setup
6. Save your **backup codes** — you'll need them if you lose access to your authenticator

2FA is now active. Every sign-in will require your password plus a code from your authenticator app.

### Signing In with 2FA

After entering your password at login, you'll be prompted for a 6-digit code. Open your authenticator app and enter the current code shown for Sayr.

### Backup Codes

When you enable 2FA, Sayr generates a set of one-time backup codes. Each code can only be used once. Store them somewhere safe — a password manager is ideal.

**If you lose your authenticator app**, use a backup code instead of the 6-digit TOTP code to regain access to your account.

#### Generating New Backup Codes

If you've used all your backup codes or want to rotate them:

1. Go to **Settings > Security**
2. Under Two-Factor Authentication, click **Generate New**
3. Save the new codes — your old codes are immediately invalidated

#### Viewing Existing Backup Codes

If 2FA is enabled, you can view your remaining unused backup codes from the same security panel.

### Disabling 2FA

1. Go to **Settings > Security**
2. Toggle the **Two-Factor Authentication** switch to off
3. Enter your password to confirm

2FA is now disabled. Sign-ins will only require your password.

## Passkeys

Passkeys are a modern alternative to passwords. They use device-based authentication (Face ID, Touch ID, Windows Hello, a hardware security key) so you never have to type a password.

### Adding a Passkey

1. Go to **Settings > Security**
2. Under **Passkeys**, click **Add passkey**
3. Give it a name (e.g., "MacBook Touch ID", "YubiKey")
4. Complete the browser prompt to register the passkey

Once added, you can sign in by selecting the passkey option on the login page and completing the device authentication.

### Managing Passkeys

All registered passkeys are listed in the Passkeys section. Each shows its name and registration date.

To remove a passkey, click the **delete** icon next to it. Removing a passkey immediately prevents it from being used to sign in.

:::caution
Make sure you have at least one other sign-in method (password or another passkey) before removing your last passkey.
:::

## Active Sessions

The **Active Sessions** section lists every device or browser currently signed in to your account. Each session shows:

- Device type
- Operating system
- IP address
- Expiry date

### Revoking a Session

To sign out a specific device (for example, a computer you no longer use), click the **trash** icon next to that session. The session is terminated immediately — anyone using that device will be signed out the next time they make a request.

Your current session is marked as **(Current)** and cannot be revoked from this panel. To sign out your current device, use the sign-out option in the user menu.
