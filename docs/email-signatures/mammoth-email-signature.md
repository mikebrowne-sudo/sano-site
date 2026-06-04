MAMMOTH EMAIL SIGNATURE — Mike Browne
=====================================

WHAT'S IN THIS FOLDER
---------------------
- signature.html               The signature markup (two linked images).
- mammoth-signature-top.png    Banner image (logo, ribbon, details, badges). 904 x 292.
- mammoth-signature-cta.png    Take Back bar image. 904 x 57.
- mammoth-signature-full.png   The whole signature as one image (904 x 349) —
                               use this only if you want a single, one-link version.

WHY TWO IMAGES
--------------
A single flat image can only carry ONE link. To get your two separate links
(website + Take Back Programme) the signature is built as two stacked images:
  - Top banner  -> https://mammoth.co.nz
  - Take Back bar -> https://www.mammoth.co.nz/pages/recycle
This keeps the exact look and works reliably in Outlook (desktop), where
gradients/rounded corners in live HTML don't render.

SETUP (one-time)
----------------
1. Upload BOTH PNGs (top + cta) to your website / image host.
   Example: https://www.mammoth.co.nz/brand/
2. Open signature.html in a text editor and replace the two instances of
   "BASE_URL" with that folder URL (no trailing slash), e.g.:
       BASE_URL/mammoth-signature-top.png
   becomes
       https://www.mammoth.co.nz/brand/mammoth-signature-top.png
3. Save.

INSTALL IN OUTLOOK (desktop)
----------------------------
Easiest method:
  a. Open the edited signature.html in a web browser.
  b. Select all (Ctrl+A) and copy (Ctrl+C).
  c. Outlook > File > Options > Mail > Signatures > New.
  d. Paste (Ctrl+V) into the edit box. Save.
Alternative: place the .htm file (and a matching _files folder if your tool
makes one) into:
  %USERPROFILE%\AppData\Roaming\Microsoft\Signatures

NOTES
-----
- The only outbound links are mammoth.co.nz and mammoth.co.nz/pages/recycle.
  Nothing references or links back to wherever the images are hosted.
- Images are 904px wide (matches the Sano banner). They scale down on
  narrow screens via max-width:100%.
- Need crisper / retina (2x) images, a narrower width, or any text change?
  Ask and I'll regenerate.
