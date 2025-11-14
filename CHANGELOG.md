# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-11-14

### Added
- Dynamic CORS allowlist-based origin validation
- Environment variable `ALLOWED_ORIGINS` for configurable CORS origins
- Support for multiple allowed origins (comma-separated)
- Semgrep security workflow with Cloudflare-specific rules
- KV backup functionality for domain persistence
- Rate limiting and security validation
- Performance optimization with caching and request deduplication

### Changed
- Standardized all environment variables to use `CLOUDFLARE_` prefix
- Updated `CF_ACCOUNT_ID` → `CLOUDFLARE_ACCOUNT_ID`
- Updated `CF_API_TOKEN` → `CLOUDFLARE_API_TOKEN`
- Updated `CF_DNS_LIST_ID` → `CLOUDFLARE_DNS_LIST_ID`
- Updated `CF_HTTP_LIST_ID` → `CLOUDFLARE_HTTP_LIST_ID`
- CORS implementation now validates origins against allowlist
- Added `Vary: Origin` header for proper cache behavior
- Added `Access-Control-Allow-Credentials` for trusted origins

### Security
- Fixed critical CORS vulnerability that echoed any origin without validation
- Implemented allowlist-based CORS validation following security best practices
- Only trusted origins receive credential support
- Fallback to wildcard for backward compatibility when no allowlist configured
- Input validation and sanitization
- Security event logging
- Rate limiting per IP and endpoint
- Suspicious pattern detection

## [1.0.0] - 2024-12-20

### Added
- Initial Cloudflare Worker for domain management
- TypeScript implementation with strict typing
- Support for DNS and HTTP allowed domain lists
- Multi-list targeting (dns, http, both)
- Environment variable validation
- Comprehensive error handling
- Cloudflare coding standards compliance

### Features
- Domain validation with security checks
- Dual KV namespace backup system
- Performance monitoring and caching
- HTML interface for domain management
- RESTful API endpoints
- Automated sync status tracking

### Security
- API token protection via Cloudflare secrets
- Input sanitization against XSS and injection
- User agent blocking for suspicious clients
- Request size limits and validation
- Comprehensive security logging
