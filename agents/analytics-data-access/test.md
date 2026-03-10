# Analytics Data Access Agent - Test Checklist

## 1. Data Source Connectivity
- [ ] Agent connects to all configured `data_sources` successfully
- [ ] Authentication is accepted for each source

## 2. Metric Access
- [ ] Agent retrieves each metric listed in `metrics` successfully
- [ ] Queries for metrics NOT in the list are blocked

## 3. Aggregation
- [ ] Each metric returns data aggregated according to its configured method
- [ ] Time range filtering works correctly for the default `time_range`

## 4. Caching
- [ ] Results are cached for the configured `cache_ttl_seconds`
- [ ] Cache is invalidated and refreshed after TTL expires

## 5. Guardrail Integration
- [ ] Unauthorized metric queries trigger a guardrail alert
- [ ] Queries returning datasets above the row threshold trigger an alert

## Pass Criteria

All checkboxes above should be checked before this agent is considered production-ready.
