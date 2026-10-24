# SoundBridge judging demo

Live app: https://soundbridge-sasehacks.vercel.app

Repository: https://github.com/Jaxonize/soundbridge-sasehacks

Submission status: **not submitted to Devpost**. The team controls the final submission.

The editable six-slide deck is `presentation/SoundBridge-judging.pptx`. It includes speaker notes and a phone screenshot. Download it before judging so the slides are available locally.

For a browser slideshow that works offline, open `presentation/index.html`. Keep the adjacent `slides` directory. Arrow keys advance the slides, and the full-screen button enlarges the presentation.

## Before the judges arrive

Be at **Gallogly Hall, Room 127, by 5:15 PM**. Open the app on your phone and laptop, use the same Wi-Fi if available, and use headphones for the volunteer. Charge both devices and check browser camera/microphone access. Chrome or Edge is the best choice for voice typing. Keep the guided demo available as a fallback.

## A three-minute presentation

**0:00–0:25 — The need.**

“A kettle whistles. A name is called at a café. An announcement changes a train platform. SoundBridge lets a Deaf or hard-of-hearing person ask a volunteer what that sound means, and read the answer. The person asking chooses what to share and leads the conversation.”

**0:25–1:30 — Show the product.**

On the phone, choose **I need a hand** and start a request. On the laptop, choose **I can help**. Enable devices, join, and let the two roles match. Alternatively, make a private invitation and scan its QR code from the other device.

Show a familiar sound in a controlled demo. The volunteer sends: “That’s your kettle whistling. It’s on the counter to your right.” Point out the large latest-description panel. Send a **Where is it coming from?** quick reply. Send **Attention** from the volunteer and dismiss the persistent visual cue on the phone. Toggle text focus. If speech recognition works in the chosen browser, dictate a draft and review it before sending.

**1:30–2:15 — Explain the implementation.**

“This is a real WebRTC connection. Supabase Edge Functions authenticate guest sessions and check who belongs to a room. Postgres transactions prevent double matching. Text and signaling use authenticated polling. When either person ends the call, a room lock coordinates cleanup so a racing message can’t leave text behind. React and TypeScript provide the phone interface, and Vercel gives us a shareable HTTPS deployment.”

**2:15–3:00 — Community impact and next steps.**

“We’d begin with an opt-in campus pilot, co-designed with Deaf and hard-of-hearing students. Student volunteers could offer short shifts, coordinated by a campus accessibility partner. The app would stay free for the person asking for help. The next work is volunteer screening, moderation, managed TURN for restrictive networks, and physical-device testing.”

Do not present the pilot or sponsorship idea as an existing partnership. Do not claim market traction, professional interpreting, emergency reliability, automatic sound recognition, or tested physical-device coverage.

## One-laptop fallback

Click **Feel the connection**. The demo is explicitly scripted and uses illustrated scenes. Show the kettle description, try the station and doorbell scenarios, trigger an attention cue, and send a quick reply. Explain that the real matching, messaging, and WebRTC implementation are separate from the practice volunteer.

## Likely questions

**Why involve people?** A person can answer follow-up questions about where a sound comes from and what happened around it. SoundBridge explores that interaction for short everyday requests.

**Who pays?** The initial hypothesis is institutional or community sponsorship while access remains free. No customer or willingness-to-pay research has been completed.

**What if nobody is online?** The queue shows an honest waiting state. The requester can invite a person they trust. No fake volunteer count or guaranteed response time is displayed.

**What is original?** The prototype combines volunteer matching, environmental audio, text-first descriptions, and persistent visual attention in a phone interface. Do not claim that no similar service exists. The concept needs user research and a fuller competitive review.

**What are the limits?** Volunteers aren’t verified, reports aren’t staffed, speech recognition depends on the browser, and some networks need a TURN relay for video. This is everyday assistance, not an emergency or professional interpretation service.

## Evidence already checked

- Production build succeeds with TypeScript checking.
- Live backend integration tests cover validation, access control, matching, message delivery, signaling, invitations, report-and-leave, and cleanup.
- Two production browser tabs connected and exchanged a real description and quick reply.
- Two generated camera streams traveled through the real WebRTC path in the local media lab.
- Ending a call moved both browser participants to a summary.

Physical camera/microphone and speech-recognition coverage should be checked on the devices you will carry to judging. The browser automation environment did not provide a reliable hardware permission flow.
