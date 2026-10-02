import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getClientIp, isLocalRequest, createRateLimiter } from '../src/lib/request-security.js';

const req = (headers) => ({ headers: new Headers(headers) });

test('client IP prefers cf-connecting-ip, then the rightmost X-Forwarded-For hop', () => {
    assert.equal(getClientIp(req({ 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' })), '9.9.9.9');
    // Leftmost entry is attacker-controlled; the proxy appends the real address on the right
    assert.equal(getClientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' })), '203.0.113.7');
    assert.equal(getClientIp(req({})), 'local');
});

test('local request detection', () => {
    assert.equal(isLocalRequest(req({ host: 'localhost:3000', 'x-forwarded-host': 'localhost:3000', 'x-forwarded-for': '::1' })), true);
    assert.equal(isLocalRequest(req({ host: '127.0.0.1:3000' })), true);
    // Through a tunnel: public Host or tunnel headers
    assert.equal(isLocalRequest(req({ host: 'abc.trycloudflare.com', 'cf-connecting-ip': '1.2.3.4' })), false);
    assert.equal(isLocalRequest(req({ host: 'localhost:3000', 'cf-ray': 'x' })), false);
    assert.equal(isLocalRequest(req({ host: 'localhost:3000', 'x-forwarded-for': '192.168.1.20' })), false);
    assert.equal(isLocalRequest(req({ host: 'localhost:3000', 'x-forwarded-host': 'abc.ngrok-free.app' })), false);
});

test('rate limiter counts failures per key and resets', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    for (let i = 0; i < 3; i++) {
        assert.equal(limiter.isLimited('a'), false);
        limiter.hit('a');
    }
    assert.equal(limiter.isLimited('a'), true);
    assert.equal(limiter.isLimited('b'), false);
    limiter.reset('a');
    assert.equal(limiter.isLimited('a'), false);
});

test('rate limiter memory stays bounded under key spraying', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, maxKeys: 100 });
    for (let i = 0; i < 1000; i++) limiter.hit(`ip-${i}`);
    // Oldest keys were evicted; the newest is still tracked
    assert.equal(limiter.isLimited('ip-999'), false);
    limiter.hit('ip-999');
    limiter.hit('ip-999');
    assert.equal(limiter.isLimited('ip-999'), true);
});

test('consume() checks and counts atomically (no parallel burst past the limit)', async () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 5 });
    // 30 "parallel" requests: each consume happens before any await in a route handler
    const results = await Promise.all(Array.from({ length: 30 }, async () => limiter.consume('ip')));
    assert.equal(results.filter(Boolean).length, 5);
    limiter.reset('ip');
    assert.equal(limiter.consume('ip'), true, 'reset (successful login) frees the slot again');
});
