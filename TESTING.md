# ClickUp MCP OAuth2 Testing Guide

## Overview

This MCP server includes comprehensive automated tests for OAuth2 authentication and API functionality. Tests are designed to run without user interaction and verify all critical paths.

## Test Structure

```
tests/
├── oauth2-flow.test.ts       # OAuth2 flow unit tests
├── e2e/
│   └── full-oauth-flow.test.ts  # End-to-end integration tests
├── claude-simulator.test.ts  # Simulates Claude Code client behavior
├── performance.test.ts       # Performance and stress tests
└── mocks/
    └── clickup-oauth-mock.ts # Mock ClickUp OAuth2 server
```

## Running Tests

### Prerequisites

1. Server must be running on port 3005:
```bash
npm start
```

2. Install test dependencies:
```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit    # OAuth2 flow unit tests
npm run test:e2e     # End-to-end integration tests
npm run test:claude  # Claude Code simulator tests
npm run test:perf    # Performance tests

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:ci
```

## Test Suites

### 1. OAuth2 Flow Tests (`test:unit`)

Tests core OAuth2 functionality:
- OAuth2 metadata endpoint validation
- Dynamic client registration
- Authorization flow with PKCE
- Token endpoint security
- Session management

**Status:** ✅ All 11 tests passing

### 2. End-to-End Integration Tests (`test:e2e`)

Complete OAuth2 flow with mock ClickUp server:
- Full authentication flow
- Token refresh
- MCP protocol integration
- Error handling

**Requirements:** Mock ClickUp server on port 4001

### 3. Claude Code Simulator (`test:claude`)

Simulates Claude Code client behavior:
- OAuth2 discovery
- Dynamic client registration
- Authorization flow
- MCP connection initialization
- Tool invocation

**Purpose:** Test without requiring actual Claude Code connection

### 4. Performance Tests (`test:perf`)

Stress testing and performance validation:
- Response time (<100ms for simple endpoints)
- Concurrent request handling (50+ simultaneous)
- Memory leak detection
- Throughput (>100 req/sec)
- Sustained load testing

## Test Configuration

Tests use different ports to avoid conflicts:
- Production server: 3005
- E2E test server: 3006
- Performance test server: 3008
- Mock ClickUp servers: 4001, 4002

## Mock ClickUp Server

The mock server (`tests/mocks/clickup-oauth-mock.ts`) simulates:
- OAuth2 authorization endpoint
- Token exchange endpoint
- User API endpoint
- Workspace API endpoint

## Test Coverage

Current coverage areas:
- ✅ OAuth2 metadata discovery
- ✅ Dynamic client registration
- ✅ Authorization flow with PKCE
- ✅ Token exchange and refresh
- ✅ Session management
- ✅ MCP endpoint security
- ✅ Error handling
- ✅ Performance benchmarks

## CI/CD Integration

Tests can run in headless mode for CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Start server
  run: npm start &

- name: Wait for server
  run: sleep 5

- name: Run tests
  run: npm run test:all
```

## Debugging Tests

Enable debug logging:
```bash
LOG_LEVEL=debug npm test
```

View server logs during tests:
```bash
# Terminal 1
npm start

# Terminal 2
npm test
```

## Common Issues

### Port Already in Use
- Check if server is already running
- Kill existing processes: `npx kill-port 3005`

### Tests Timeout
- Ensure server is started before running tests
- Check network connectivity
- Increase timeout in test files if needed

### OAuth2 Redirect Errors
- Verify CLIENT_ID and CLIENT_SECRET in .env
- Check redirect URIs match configuration

## Performance Benchmarks

Target metrics:
- Health check: <100ms
- OAuth2 metadata: <50ms
- Client registration: <100ms
- Concurrent requests: 50+
- Throughput: >100 req/sec
- Memory stability: No leaks over 100+ requests

## Security Testing

Tests verify:
- Unauthorized access rejection
- Invalid token handling
- Client ID validation
- PKCE challenge verification
- Session isolation

## Future Improvements

- [ ] Add integration with real ClickUp API
- [ ] Implement WebSocket/SSE tests for streaming
- [ ] Add rate limiting tests
- [ ] Create load testing scenarios
- [ ] Add security vulnerability scanning