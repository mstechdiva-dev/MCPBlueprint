# Event-Driven Agent - Test Checklist

## 1. Event Listening
- [ ] Agent successfully connects to the configured `event_source`
- [ ] Agent receives events from the stream in real time

## 2. Filtering
- [ ] Events outside `event_filters` are ignored and not processed
- [ ] Events matching filters are captured and passed to trigger logic

## 3. Trigger Conditions
- [ ] Each condition fires correctly when its criteria are met
- [ ] Conditions that are NOT met don't fire actions

## 4. Actions
- [ ] Each configured action executes correctly when triggered
- [ ] Webhook actions deliver payloads to the correct endpoint
- [ ] Internal actions invoke the correct handler

## 5. Rate Limiting
- [ ] Processing rate stays within `max_events_per_minute` under normal load
- [ ] Exceeding the rate limit triggers a guardrail alert

## 6. Cascading Check
- [ ] Actions triggered by this agent don't create new events that re-trigger it
- [ ] If cascading is detected, guardrail alert fires

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
