# Consent-gated listening metrics

Listening metrics reuse the existing optional GA4 consent. Before consent, no
listening events or listening analytics storage are created; time played before
consent is not backfilled. Withdrawing consent stops measurement and removes the
listening session record. Comments, names and reaction content are never included
in these analytics events.

## Events

- `ogs_listen_landing`: one measured visit to the listening page.
- `ogs_listen_start`: at least one track actually advanced for one second.
- `ogs_listen_30s`, `ogs_listen_120s`: at least one individual track reached the
  actual playback-time milestone in that visit.
- `ogs_play_start`, `ogs_track_30s`, `ogs_track_120s`: corresponding track-level
  counts; do not interpret their totals as people.
- `ogs_feedback_open`: reaction form opened, once per track/visit.
- `ogs_feedback_sent`: existing reaction API confirmed success, once per
  track/visit. Does not include failed requests or honeypot submissions.
- `ogs_feedback_visit`: at least one successful reaction in the measured visit.
- `ogs_autoplay_blocked`, `ogs_play_error`: diagnostic events, not play starts.

A measured visit is the same tab/campaign, until 30 minutes of inactivity. This
is neither a unique person nor exactly a GA4 standard session. Reloads in the
same tab are deduplicated when session storage is available. New tabs or blocked
storage can lead to duplication. Campaign changes begin a new measured visit.

Playback is counted using media advancement bounded by elapsed wall time.
Pauses, buffering, seeking, muted/zero-volume playback, audio unlock samples and
video export are excluded. Sampling gaps over ten seconds are conservatively
discarded. The milestones are cumulative playback of one track, not page dwell
time and not a sum of many different tracks. OS mute, output routing and actual
human attention cannot be established by these events.

## Attribution and reporting

Capture approved UTM labels before the player rewrites the address. Only known
source labels (`x_ads`, `reddit_ads`), constrained campaign labels and approved
creative labels are forwarded. The initial GA4 page location is reconstructed
without unrelated query fields. Custom dimensions are event-scoped:

| Dimension | Parameter |
|---|---|
| OGS source | `ogs_source` |
| OGS campaign | `ogs_campaign` |
| OGS creative | `ogs_content` |
| OGS track | `track_id` |
| OGS playback mode | `start_mode` |

Compare matching campaign/time periods. Cost divided by `ogs_listen_30s` is a
proxy cost per measured 30-second visit, not the cost of all listeners: consent
and blocking introduce missing data. A zero denominator is not a numeric cost.
Exclude `ogs_qa_*` campaigns from advertising results. Realtime receipt must be
verified independently of the JavaScript event queue. New reporting dimensions
may not be immediately available in historical reports. Do not retroactively
infer listening outcomes for uninstrumented campaigns.

## Verification

```sh
node --test tests/listen-metrics.test.cjs tests/reaction-metrics.test.cjs
node --check src/js/listen-metrics.js
node --check src/js/consent.js
node --check src/js/reaction.js
git diff --check
```

The tests mock media, analytics, storage, DOM and reaction requests; they never
submit a real reaction. Before release, also check the real player at desktop
and 375px widths, optional consent/withdrawal, manual play, track changes and
the unaffected site pages. After release, use a separate QA campaign to verify
landing, playback and milestones in the existing GA4 Realtime report.
