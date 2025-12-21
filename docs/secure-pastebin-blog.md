# Secure Pastebin: Share Sensitive Data Without Trusting the Backend

We all know that sinking feeling when you need to share some sensitive information—an API key, a config file, a password—through the internet. You find yourself copying and pasting into a text chat, worried the whole time about who might have access to it. Or you use one of those "secure" pastebin services and just have to hope they're actually deleting things and not keeping copies.

But what if the backend never actually saw your data in the first place?

That's exactly what Pasteref does. It's a web-based pastebin application that encrypts your content entirely in the browser, so sensitive data stays encrypted all the way to whoever you're sharing it with. The server never knows what you pasted. Ever. No exceptions.

## How It Works: A Quick Overview

Pasteref combines a few key ideas to create something genuinely private:

**The encryption happens on your device.** When you paste some text and hit encrypt, the Web Crypto API takes over right there in your browser. Your content gets compressed, encrypted with AES-256-GCM, and turned into an unreadable blob. Only someone with the correct password can decrypt it.

**The password stays yours.** The encrypted data gets stored on the backend, but the password? That never leaves your browser. When you share a link, the password is embedded in the URL fragment (that part after the `#`), which doesn't get sent to any server. Only the person you send the link to can decrypt it.

**No server-side processing.** There's no "check if the password is correct" logic on the backend. There's no "store the password temporarily" step. The server is basically a dumb file locker that holds encrypted blobs. Your browser does all the actual crypto work.

This architecture means you can share Pasteref links anywhere—even over insecure channels—and the content remains protected because the encryption is intrinsic to the data itself.

## Why Your Passwords Never Touch the Backend

This is the part that makes Pasteref different from most pastebin services. Let's break it down.

When you encrypt content, you need a password. Pasteref gives you a few options: generate a random password, use a mnemonic phrase, or create your own. But here's the crucial part—**that password only lives on your device**.

The flow looks like this:

1. You enter text and set a password
2. The browser derives a cryptographic key from that password using PBKDF2 with 100,000 iterations
3. That key encrypts your content using AES-256-GCM
4. The encrypted blob gets sent to the server and stored (usually with a short URL identifier or the full encrypted content)
5. Optionally, the password is appended to the shareable link as a URL fragment, separated by a `~` character

```
Full encrypted content URL with password:
https://pastebin.example.com/#m7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ==~rGQgOqr40inEKsgB5dH6goaI

Minified URL with password:
https://pastebin.example.com/##88651bba156195f346d48b0b96e1386e23e10603~rGQgOqr40inEKsgB5dH6goaI

Without password in URL:
https://pastebin.example.com/#m7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ==
```

In these URLs, everything after the `#` is a URL fragment. **Browsers never send fragments to servers**—they're strictly client-side only. This means the server never logs it, never sees it, and can't recover it. Even if someone compromised the server database, they'd get encrypted blobs or IDs with no way to decrypt them.

Here's exactly what happens when a browser receives a URL with a fragment:

```javascript
// The browser extracts the encrypted content and password from the URL fragment
const url = 'https://pastebin.example.com/#m7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ==~rGQgOqr40inEKsgB5dH6goaI'
const fragment = window.location.hash.substring(1)  // Everything after the #
const [encryptedContent, password] = fragment.split('~')

// encryptedContent = 'm7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ=='
// password = 'rGQgOqr40inEKsgB5dH6goaI'

// The server request is made WITHOUT the fragment
// Server logs show: GET /
// The encrypted content and password are never included in the HTTP request
// Only the JavaScript running in the user's browser sees them
```

The HTTP request itself looks like this:

```
GET / HTTP/1.1
Host: pastebin.example.com
```

Notice everything is absent. The entire `#m7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ==~rGQgOqr40inEKsgB5dH6goaI` part is stripped away before the request is even formed. Only the JavaScript running locally in your browser has access to it.

### Two Workflows: Separate Password or One-Click Decryption

Pasteref supports two different sharing workflows based on your security needs.

**Workflow 1: Password Shared Separately (Maximum Security)**
You create an encrypted pastebin, share the link without the password embedded, and send the password through a completely separate secure channel. This is like putting the secret in a locked box and sending it through the mail, then calling the recipient to give them the combination over the phone. Two separate communication channels mean an attacker would need to compromise both to get the secret.

```
Insecure channel: https://pastebin.example.com/#m7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ==
Secure channel: Send password via Signal, WhatsApp, or in-person
```

**Workflow 2: One-Click Decryption (Convenient, Still Secure)**
You embed the password directly in the URL using the `~` separator. When someone opens the link, decryption happens automatically. This is more convenient—no need to ask "where do I get the password?"—but it assumes your communication channel itself is already encrypted.

```
Secure channel: https://pastebin.example.com/#m7ptap2bazZeRhOl2xfFJegSFs40gPtNVB3lArtEjpftxB+aI/DjYWFDOP9yY3A/6+1j5YTi96qknT4G08awR7hoYQ==~rGQgOqr40inEKsgB5dH6goaI
(via Signal, WhatsApp, Slack with E2E encryption, etc.)
```

The key insight is that **when you use workflow 2, the security of the password depends on the channel you use to share the link**. If you send the complete link with the password embedded through plain email or an unencrypted messaging app, and that channel gets compromised, the attacker sees the password. But the backend never sees it regardless.

This is why Pasteref's design is perfect for this use case: you can use already-encrypted channels (Signal, Slack with E2E, WhatsApp, etc.) where encryption happens at a different layer. The URL with the embedded password is transmitted through these pre-encrypted tunnels, so the password is protected by the underlying channel's encryption.

Think of it this way: if you're already sending encrypted messages through Signal, attaching a Pasteref link with the password embedded is no less secure than any other text you send there. The password travels through Signal's E2E encryption, never touching the pastebin server.

### Sharing via QR Code: The Physical Security Advantage

Here's something even more clever: Pasteref can encode the entire URL—including the encrypted content and password—into a QR code. This opens up a whole different dimension of security, especially for in-person scenarios.

When you generate a QR code from your Pasteref URL, you're creating a visual representation of the complete link with everything needed for decryption. The magic is that this doesn't get transmitted over any network at all—it's just a visual encoding.

Imagine a few real-world scenarios:

**Scenario 1: Physical Handoff**
You're at a conference and need to share sensitive credentials with a colleague you're meeting in person. You generate the encrypted pastebin with password embedded, create a QR code, and either display it on your phone or print it out. They scan it with their phone, and boom—decryption happens locally in their browser. The entire secret never traveled through email, messaging, or any network. It went through physical space as a QR code.

**Scenario 2: One-Time Access at an Event**
You're running a workshop and need to distribute temporary API credentials to attendees. Instead of emailing credentials before the event or writing them on a whiteboard, you display a QR code on the projection screen. Attendees scan it, get instant access, and the credential is only decryptable in their browser with the embedded password. No email trails, no screenshots of credentials lying around—just a QR code that's only relevant for the duration of the event.

**Scenario 3: Offline-First Sharing**
You're working in an environment with network restrictions or you want to minimize data transmission. Generate the Pasteref link, encode it as a QR code, and transfer it via any visual medium—printed paper, displayed on screen, even a photo. The recipient scans it, and the entire transaction happens offline (after scanning) or with minimal network footprint.

The beauty of this approach is that QR codes don't exist on any server. They're not logged, not transmitted, not intercepted by proxies. They're just visual data that gets decoded locally by the scanner. The browser then uses the extracted URL fragment to decrypt everything. The pastebin backend still only sees a request with no password or sensitive data.

This makes Pasteref particularly powerful for high-security scenarios where you want the sharing mechanism itself to leave minimal traces.

When you share the link and someone opens it, their browser extracts the password from the URL, uses it to derive the decryption key, and decrypts the content. All locally. The server just serves the encrypted blob.

This is fundamentally different from services that require you to type a password into a form on the server. Those services have to validate the password somewhere, which means they have to have it available to validate against. Pasteref doesn't need that at all.

## Password Generation: The Role of BIP39

If you've heard of Bitcoin or other cryptocurrencies, you've probably heard the term "seed phrase" or "mnemonic." That's BIP39—Bitcoin Improvement Proposal 39. It's a standard for generating human-readable backup codes from random data.

Pasteref uses BIP39 for one specific reason: **generating memorable passwords that are still cryptographically strong**.

Here's how it works:

When you ask Pasteref to generate a password, it actually generates a mnemonic phrase—twelve words from a carefully curated dictionary. These twelve words represent 128 bits of entropy, which is actually quite a lot of randomness. Then, the tool converts that mnemonic into a seed using a KDF (key derivation function), and extracts the first 32 bytes to create a 24-character Base64 string that serves as your password.

```javascript
// Simplified version of what happens
const mnemonic = bip39.generateMnemonic(128)  // 12 words
const seed = bip39.mnemonicToSeedSync(mnemonic)  // 64-byte seed
const password = seed.slice(0, 32)  // Take first 32 bytes
const readablePassword = btoa(password).substring(0, 24)  // Convert to readable form
```

The beauty of this approach is that you get both worlds: the entropy of a long random password (since 128 bits of entropy is plenty), but you *also* have a human-readable recovery option. If you write down the twelve-word mnemonic, you can always regenerate the exact same password later.

**The limitation**, though, is that not everyone wants to manage mnemonic phrases. Most people expect to type or copy a password directly. So while BIP39 helps create strong passwords, it adds complexity. Pasteref handles this by letting you either use the generated mnemonic recovery phrase, or just copy the derived password and treat it like a normal random password.

Another consideration: the BIP39 standard was designed for Bitcoin seed generation, so it comes with certain assumptions about key expansion that might be overkill for a simple password use case. But there's no harm in using a cryptographically stronger approach than necessary—if anything, it's a feature.

## The Encryption Details: AES-256-GCM and PBKDF2

When your content gets encrypted, Pasteref doesn't just throw your password at it directly. Instead, it uses industry-standard cryptographic building blocks:

**PBKDF2 Key Derivation**: Your password goes through PBKDF2 (Password-Based Key Derivation Function 2) with SHA-256, 100,000 iterations, and a random 16-byte salt. This process turns your password into a proper cryptographic key while making brute-force attacks computationally expensive. Those 100,000 iterations mean that even if someone tries to guess your password, each guess requires significant CPU time.

```javascript
// Inside the browser's crypto API
const key = await crypto.subtle.deriveKey(
  {
    name: "PBKDF2",
    salt: salt,
    iterations: 100000,
    hash: "SHA-256",
  },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
)
```

**AES-256-GCM Encryption**: Once you have the key, AES-256-GCM (Galois/Counter Mode) encrypts your content. GCM is a mode that provides both confidentiality and authenticity—it encrypts your data and also generates a tag that verifies the data hasn't been tampered with. If someone changes even a single byte of the encrypted blob, decryption will fail.

**Compression**: Before encryption, content is compressed using gzip. This serves two purposes: it reduces the size of what gets encrypted and stored, and it provides an additional integrity check (compression headers are structured, so corrupted encrypted data is unlikely to decompress correctly).

The whole encrypted blob is structured as: `[salt: 16 bytes][IV: 12 bytes][ciphertext + auth tag]`, all encoded in Base64 for safe transmission.

## Real-World Use Cases

**Sharing API keys with team members**: Generate an encrypted link, send it over any channel (Slack, email, carrier pigeon), and only the person you sent it to can decrypt it. If the link leaks, it's useless without the password.

**Quick config file sharing**: You've got a database connection string or environment variables someone needs. Paste it, encrypt, share. No traces left on a third-party server.

**One-time secrets**: Need to send a password to a colleague? Create an encrypted pastebin, share the link, they decrypt it once and the link can expire.

**Security research or bug reports**: Disclosing a vulnerability? Encrypt the details so they're only accessible to someone who knows the password.

**Temporary credential sharing**: In DevOps environments where you need to share credentials temporarily during onboarding or handoffs.

## What This Means for You

Using Pasteref means you're not betting on a company's security practices or privacy policy. You're relying on the same encryption standards that protect sensitive communications across the entire internet—standards that have been vetted by cryptographers and are built into your browser.

The trade-off is simplicity. You have to manage the password and make sure you share it securely (ideally through a separate channel from the link itself). The service doesn't have a "forgot password" button because it can't—the backend literally cannot decrypt your data.

But for the use cases where you're dealing with genuinely sensitive information, that's a feature, not a bug.

Your secrets stay yours. The backend is just a vault with a lock only you hold the key to.
