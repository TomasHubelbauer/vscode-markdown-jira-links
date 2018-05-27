# MarkDown Jira Ticket Links

`.vscode/settings.json`:

```json
"markDownJiraLinks.codesToUrls": [
  {
    "code": "RHAEO",
    "url": "https://jira.rhaeo.net/"
  },
  {
    …
  }
]
```

This will make `RHAEO-1` in a MarkDown document clickable and
the link will lead to the Jira ticket page at `https://jira.rhaeo.net/browse/RHAEO-1`.

## Security

If you elect so, you can allow the extension to store your Jira API password using Keytar
for the purpose of displaying ticket type appropriate decorator icon.
