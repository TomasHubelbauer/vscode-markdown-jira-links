'use strict';
import { ExtensionContext, languages, DocumentLinkProvider, TextDocument, CancellationToken, DocumentLink, Range, Uri, workspace } from 'vscode';

export function activate(context: ExtensionContext) {
    const jiraTicketLinkProvider = new JiraTicketLinkProvider();
    context.subscriptions.push(languages.registerDocumentLinkProvider("markdown", jiraTicketLinkProvider));
}

class JiraTicketLinkProvider implements DocumentLinkProvider {
    provideDocumentLinks(document: TextDocument, token: CancellationToken) {
        const { codesToUrls } = workspace.getConfiguration('markDownJiraLinks');
        const text = document.getText();
        const links: DocumentLink[] = [];
        for (const { code, url } of codesToUrls) {
            const regex = new RegExp(code + '-\\d+', 'g');
            let match: RegExpExecArray | null;
            while ((match = regex.exec(text)) !== null) {
                const range = new Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length));
                let target = Uri.parse(url + match[0]);
                links.push(new DocumentLink(range, target));
            }
        }

        return links;
    }
}
