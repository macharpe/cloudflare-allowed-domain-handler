export function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="mobile-web-app-capable" content="yes">
    <meta http-equiv="Permissions-Policy" content="interest-cohort=()">
    <title>Domain Allowlist Manager</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #0051C3;
            --primary-hover: #0040A0;
            --success: #10B981;
            --error: #EF4444;
            --warning: #F59E0B;
            --text-primary: #111827;
            --text-secondary: #6B7280;
            --bg-primary: #FFFFFF;
            --bg-secondary: #F9FAFB;
            --border: #E5E7EB;
            --shadow: rgba(0, 0, 0, 0.1);
            --radius: 8px;
            --max-width: 600px;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --primary: #60A5FA;
                --primary-hover: #3B82F6;
                --success: #34D399;
                --error: #F87171;
                --warning: #FBBF24;
                --text-primary: #F9FAFB;
                --text-secondary: #D1D5DB;
                --bg-primary: #111827;
                --bg-secondary: #1F2937;
                --border: #374151;
                --shadow: rgba(0, 0, 0, 0.3);
            }
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            min-height: 100vh;
            min-height: -webkit-fill-available;
            display: flex;
            flex-direction: column;
            font-size: 16px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .container {
            width: 100%;
            max-width: var(--max-width);
            margin: 0 auto;
            padding: 20px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        header {
            text-align: center;
            margin-bottom: 32px;
            padding-top: env(safe-area-inset-top, 20px);
        }

        h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text-primary);
            letter-spacing: -0.5px;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 15px;
            font-weight: 400;
        }

        .form-card {
            background: var(--bg-primary);
            border-radius: var(--radius);
            padding: 24px;
            box-shadow: 0 1px 3px var(--shadow);
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-primary);
            letter-spacing: -0.2px;
        }

        input[type="text"],
        textarea,
        select {
            width: 100%;
            padding: 12px 16px;
            font-size: 16px;
            border: 1.5px solid var(--border);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
            transition: all 0.2s ease;
            -webkit-appearance: none;
            appearance: none;
        }

        input[type="text"]:focus,
        textarea:focus,
        select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(0, 81, 195, 0.1);
        }

        @media (prefers-color-scheme: dark) {
            input[type="text"]:focus,
            textarea:focus,
            select:focus {
                box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
            }
        }

        select {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 12px center;
            background-repeat: no-repeat;
            background-size: 16px;
            padding-right: 40px;
        }

        @media (prefers-color-scheme: dark) {
            select {
                background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d1d5db' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
            }
        }

        textarea {
            resize: vertical;
            min-height: 80px;
            font-family: inherit;
            line-height: 1.5;
        }

        .input-hint {
            font-size: 13px;
            color: var(--text-secondary);
            margin-top: 6px;
            line-height: 1.4;
        }

        .button {
            width: 100%;
            padding: 14px 20px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            background: var(--primary);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            letter-spacing: -0.2px;
            -webkit-tap-highlight-color: transparent;
        }

        .button:hover:not(:disabled) {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 81, 195, 0.2);
        }

        .button:active:not(:disabled) {
            transform: translateY(0);
        }

        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .alert {
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: none;
            animation: slideIn 0.3s ease;
            font-size: 14px;
            line-height: 1.5;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .alert.success {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .alert.error {
            background: rgba(239, 68, 68, 0.1);
            color: var(--error);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .alert.warning {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning);
            border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .loading {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 0.6s linear infinite;
            margin-left: 8px;
            vertical-align: middle;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .recent-domains {
            background: var(--bg-primary);
            border-radius: var(--radius);
            padding: 24px;
            box-shadow: 0 1px 3px var(--shadow);
        }

        .recent-domains h2 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--text-primary);
        }

        .domain-list {
            list-style: none;
        }

        .domain-item {
            padding: 12px 0;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
        }

        .domain-item:last-child {
            border-bottom: none;
        }

        .domain-name {
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .domain-desc {
            color: var(--text-secondary);
            font-size: 13px;
            line-height: 1.4;
        }

        @media (max-width: 640px) {
            .container {
                padding: 16px;
            }

            .form-card,
            .recent-domains {
                padding: 20px;
            }

            h1 {
                font-size: 24px;
            }
        }

        @supports (padding: max(0px)) {
            .container {
                padding-left: max(20px, env(safe-area-inset-left));
                padding-right: max(20px, env(safe-area-inset-right));
                padding-bottom: max(20px, env(safe-area-inset-bottom));
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Domain Allowlist Manager</h1>
            <p class="subtitle">Add domains to your Cloudflare Zero Trust allowlist</p>
        </header>

        <div id="alert" class="alert"></div>

        <div class="form-card">
            <form id="domainForm">
                <div class="form-group">
                    <label for="domain">Domain</label>
                    <input
                        type="text"
                        id="domain"
                        name="domain"
                        placeholder="example.com"
                        required
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                    >
                    <p class="input-hint">Enter a valid domain name without protocol (http/https)</p>
                </div>

                <div class="form-group">
                    <label for="description">Description</label>
                    <textarea
                        id="description"
                        name="description"
                        placeholder="Brief description of why this domain should be allowed"
                        required
                    ></textarea>
                    <p class="input-hint">Provide context for this domain (e.g., "Company website", "API endpoint")</p>
                </div>

                <div class="form-group">
                    <label for="targetList">Add to List(s)</label>
                    <select
                        id="targetList"
                        name="targetList"
                        required
                    >
                        <option value="dns">DNS Allowed Domains only</option>
                        <option value="http">HTTP Allowed Domains only</option>
                        <option value="both" selected>Both DNS and HTTP Allowed Domains</option>
                    </select>
                    <p class="input-hint">Choose which Zero Trust list(s) to add this domain to</p>
                </div>

                <button type="submit" class="button" id="submitBtn">
                    Add Domain
                </button>
            </form>
        </div>

        <div class="recent-domains" id="recentDomains" style="display: none;">
            <h2>Recently Added</h2>
            <ul class="domain-list" id="domainList"></ul>
        </div>
    </div>

    <script>
        const form = document.getElementById('domainForm');
        const alert = document.getElementById('alert');
        const submitBtn = document.getElementById('submitBtn');
        const recentDomainsSection = document.getElementById('recentDomains');
        const domainList = document.getElementById('domainList');

        const recentDomains = JSON.parse(localStorage.getItem('recentDomains') || '[]');

        function showAlert(message, type = 'success') {
            alert.textContent = message;
            alert.className = \`alert \${type}\`;
            alert.style.display = 'block';

            if (type === 'success') {
                setTimeout(() => {
                    alert.style.display = 'none';
                }, 5000);
            }
        }

        function updateRecentDomains(domain, description) {
            const newEntry = {
                domain,
                description,
                timestamp: new Date().toISOString()
            };

            recentDomains.unshift(newEntry);
            if (recentDomains.length > 5) {
                recentDomains.pop();
            }

            localStorage.setItem('recentDomains', JSON.stringify(recentDomains));
            displayRecentDomains();
        }

        function displayRecentDomains() {
            if (recentDomains.length === 0) {
                recentDomainsSection.style.display = 'none';
                return;
            }

            recentDomainsSection.style.display = 'block';
            domainList.innerHTML = recentDomains.map(item => \`
                <li class="domain-item">
                    <div class="domain-name">\${item.domain}</div>
                    <div class="domain-desc">\${item.description}</div>
                </li>
            \`).join('');
        }

        function validateDomain(domain) {
            const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
            return domainRegex.test(domain);
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const domain = document.getElementById('domain').value.trim();
            const description = document.getElementById('description').value.trim();
            const targetList = document.getElementById('targetList').value;

            if (!validateDomain(domain)) {
                showAlert('Please enter a valid domain name', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Adding Domain<span class="loading"></span>';

            try {
                const response = await fetch('/api/add-domain', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ domain, description, targetList })
                });

                const result = await response.json();

                if (result.success) {
                    showAlert(\`Successfully added \${domain} to the allowlist\`, 'success');
                    updateRecentDomains(domain, description);
                    form.reset();
                } else {
                    showAlert(result.message || 'Failed to add domain', 'error');
                }
            } catch (error) {
                showAlert('Network error. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Add Domain';
            }
        });

        displayRecentDomains();
    </script>
</body>
</html>`;
}