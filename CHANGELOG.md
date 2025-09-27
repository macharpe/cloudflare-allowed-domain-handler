# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Semgrep security workflow with Cloudflare-specific rules
- KV backup functionality for domain persistence
- Rate limiting and security validation
- Performance optimization with caching and request deduplication
- CORS handling for cross-origin requests

### Security
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