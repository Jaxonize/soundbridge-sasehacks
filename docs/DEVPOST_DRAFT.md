# Devpost submission draft — not submitted

## Project name

SoundBridge

## Tagline

A little sound. A lot of connection.

## Inspiration

Everyday sounds carry context: a doorbell, a name called across a room, or a station announcement. We wanted to explore a simple Good Samaritan idea: a Deaf or hard-of-hearing person could connect with a volunteer who listens and describes what they hear in clear text. The person asking for help stays in control of the conversation.

## What it does

SoundBridge is a phone-first web app with two roles. A person can request sound help, or volunteer their ears for a few minutes. The app matches opposite roles for a video call with text descriptions. A requester can also create a private invitation and QR code for someone they trust.

Volunteers can type or dictate an editable draft with browser speech recognition. The call interface emphasizes the latest description, offers quick replies and a text focus mode, and provides a persistent visual attention cue. Users control their camera and microphone and can end the call at any time. Reports end the call. Call media is not recorded, and call text is removed when the call ends.

A clearly labeled, scripted practice mode makes the product easy to demonstrate on one laptop without a volunteer or device permissions.

## How we built it

We built the interface with React, TypeScript, and Vite and deployed it to Vercel. WebRTC carries video and audio. Supabase hosts Postgres and an Edge Function that authenticates short-lived guest sessions using unpredictable capabilities stored as hashes.

The backend checks participant membership for every room action. Browser clients cannot directly read the underlying tables. Postgres transactions coordinate random matching and one-use invitations. Appending events and ending calls lock the same room to prevent a racing message from surviving cleanup. Text, call controls, and WebRTC signaling travel through authenticated HTTP polling.

## Challenges

We needed to handle simultaneous matches, delayed browser permissions, the order of WebRTC offers and ICE candidates, and the privacy implications of temporary call text. We also needed a usable phone layout where the latest description and message composer remain central.

## Accomplishments

The deployed app connects two real browser participants and delivers their messages. Generated camera streams passed through the actual WebRTC connection in the local device lab. Automated integration tests exercised matching, room access restrictions, signaling, one-use invitations, reporting, and call cleanup. The app has no invented volunteer count or response-time promise.

## What we learned

Accessibility is more than adding captions. It also means giving people control over disclosure, keeping important information visible, making attention cues persistent, and letting text work when media or speech recognition fails. This prototype needs direct co-design and testing with Deaf and hard-of-hearing participants before a pilot.

## What’s next

We would co-design an opt-in campus pilot with Deaf and hard-of-hearing students and a campus accessibility partner. Before a public pilot, we would add volunteer verification, staffed moderation, stronger abuse controls, scheduled data cleanup, and a managed TURN relay for restrictive networks. Institutional sponsorship is a funding hypothesis, not validated demand or an existing partnership.

## Built with

React, TypeScript, Vite, WebRTC, Web Speech API, Supabase, Postgres, Vercel, CSS, Lucide, QRCode.

## Links

- Repository: https://github.com/Jaxonize/soundbridge-sasehacks
- Live app: https://soundbridge-sasehacks.vercel.app

## Team review before submission

Add the actual team members and any required attribution or AI-assistance disclosure. Check the event’s rules on dependencies, generated code, and required fields. Review the copy against the final build and record a demo if Devpost requires one. The app and source repository are not a Devpost submission. Do not press the final submission button until the team approves.
