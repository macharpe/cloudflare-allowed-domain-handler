# GitHub Security Features Setup

This guide explains how to enable GitHub's security features for your Cloudflare Worker project to fully utilize the Semgrep security workflow.

## 🔒 Required Security Features

### 1. Enable GitHub Advanced Security (for private repos)

For private repositories, you need GitHub Advanced Security to use:
- Code scanning
- Secret scanning
- Dependency review

**Steps:**
1. Go to your repository settings
2. Navigate to **Settings > Security & analysis**
3. Enable the following features:

### 2. Code Scanning Setup

**Option A: GitHub's Built-in CodeQL**
1. In **Settings > Security & analysis**
2. Click **Set up** next to "Code scanning"
3. Choose **Default setup** for automatic scanning
4. Select languages: JavaScript/TypeScript

**Option B: Custom Workflow (Already configured)**
- Our Semgrep workflow provides comprehensive security scanning
- SARIF reports will be uploaded automatically once code scanning is enabled

### 3. Secret Scanning

1. In **Settings > Security & analysis**
2. Enable **Secret scanning**
3. Enable **Push protection** to prevent secrets from being committed

### 4. Dependency Scanning

1. In **Settings > Security & analysis**
2. Enable **Dependency graph**
3. Enable **Dependabot alerts**
4. Enable **Dependabot security updates**

## 🔧 Manual Setup Steps

### Enable Code Scanning via Repository Settings

1. **Navigate to repository settings:**
   ```
   https://github.com/macharpe/cloudflare-allowed-domain-handler/settings/security_analysis
   ```

2. **Enable the following features:**
   - ✅ Dependency graph
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Secret scanning
   - ✅ Push protection
   - ✅ Code scanning (Default setup)

3. **For Code scanning:**
   - Choose "Default setup"
   - Languages: JavaScript/TypeScript
   - Query suite: Default

### Alternative: GitHub CLI Commands

Once you have the appropriate permissions:

```bash
# Enable secret scanning
gh api repos/macharpe/cloudflare-allowed-domain-handler \
  --method PATCH \
  --field security_and_analysis='{"secret_scanning":{"status":"enabled"}}'

# Enable code scanning default setup
gh api repos/macharpe/cloudflare-allowed-domain-handler/code-scanning/default-setup \
  --method PATCH \
  --field state=configured
```

## 🚦 Verification

After enabling these features, verify they're working:

### Check Security Features Status
```bash
gh api repos/macharpe/cloudflare-allowed-domain-handler | jq '.security_and_analysis'
```

### Trigger Semgrep Workflow
```bash
gh workflow run semgrep.yml
```

### Monitor Security Alerts
- Go to **Security** tab in your repository
- Check for any detected vulnerabilities
- Review Semgrep scan results

## 📊 What You'll Get

Once enabled, you'll have:

1. **Automated Security Scanning**
   - Weekly Semgrep scans
   - PR-based security validation
   - SARIF report integration

2. **Secret Detection**
   - Automatic scanning for API keys, tokens
   - Push protection to prevent secret commits
   - Historical secret detection

3. **Dependency Monitoring**
   - Vulnerability alerts for dependencies
   - Automatic security updates
   - Dependency graph visualization

4. **Code Quality Insights**
   - Security hotspots identification
   - Code quality metrics
   - Integration with GitHub Security tab

## 🔍 Troubleshooting

### Common Issues

**"Code scanning is not enabled"**
- Enable Advanced Security features in repository settings
- Ensure you have admin permissions on the repository

**SARIF upload failures**
- Check that code scanning is properly enabled
- Verify workflow permissions include `security-events: write`

**Workflow permission issues**
- Ensure repository has proper security permissions
- Check organization security policies

### Getting Help

- GitHub Security Documentation: https://docs.github.com/en/code-security
- Semgrep Documentation: https://semgrep.dev/docs/
- Repository Security Settings: Settings > Security & analysis

## 📈 Security Workflow Integration

Our Semgrep workflow will automatically:
- ✅ Scan TypeScript/JavaScript code
- ✅ Check for Cloudflare Worker security issues
- ✅ Generate SARIF reports for GitHub
- ✅ Comment on PRs with security findings
- ✅ Upload results to Security tab (when enabled)
- ✅ Run weekly automated scans

The workflow is designed to work with or without GitHub's built-in code scanning, but enabling it provides the best experience.